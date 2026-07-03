import '../shared/process-shim';
import { detectAdapter } from '../adapters';
import { scanPage, ScannedField } from './domScanner';
import { classifyFields } from './fieldClassifier';
import { runFullPageAutofill } from './autofillRunner';
import { clearHighlights, highlightField } from './autofillEngine';
import { UserProfile } from '../shared/types';
import { enrichProfile, hasProfileData, hasContactProfileData } from '../profile/profileStore';
import { formatAutofillGapMessage } from './autofillRunner';
import { mountFloatingWidget } from './floatingWidget';
import { AUTOFILL_MESSAGES, cycleMessages } from '../shared/loadingMessages';

let activeScannedFields: ScannedField[] = [];

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'scan') {
    (async () => {
      try {
        const adapter = detectAdapter(document);
        const jobDetails = adapter.extractJobDetails(document);

        const fields = scanPage(document);
        activeScannedFields = fields;

        const profile = enrichProfile(message.profile as UserProfile);
        const classified = await classifyFields(
          fields,
          profile,
          jobDetails.company,
          document.location.hostname
        );

        const responseFields = classified.map((c) => ({
          id: c.id,
          type: c.scannedField.type,
          labelText: c.scannedField.labelText,
          placeholder: c.scannedField.placeholder,
          htmlId: c.scannedField.htmlId,
          options: c.scannedField.options,
          canonicalKey: c.canonicalKey,
          proposedValue: c.proposedValue,
          confidence: c.confidence,
          reason: c.reason
        }));

        clearHighlights(document);
        classified.forEach((c) => {
          if (c.proposedValue) {
            highlightField(c.scannedField.element, c.confidence);
          }
        });

        sendResponse({
          success: true,
          jobDetails,
          fields: responseFields
        });
      } catch (err: any) {
        console.error('Scan error:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'autofill' || message.action === 'autofill-complete') {
    (async () => {
      const profile = enrichProfile(message.profile as UserProfile);
      const overrides = (message.overrides || {}) as Record<string, string>;

      if (message.action === 'autofill') {
        const approvedFields = message.fields as { id: string; proposedValue: string }[];
        if (!approvedFields?.length) {
          sendResponse({ success: false, error: 'Missing approved fields.' });
          return;
        }
        for (const approved of approvedFields) {
          if (approved.proposedValue?.trim()) {
            overrides[approved.id] = approved.proposedValue.trim();
          }
        }
      }

      let company = '';
      try {
        company = detectAdapter(document).extractJobDetails(document).company || '';
      } catch {}

      activeScannedFields = scanPage(document);
      const { filledCount, errors } = await runFullPageAutofill(
        profile,
        overrides,
        company,
        document.location.hostname
      );

      clearHighlights(document);
      sendResponse({ success: true, filledCount, errors });
    })();
    return true;
  }

  if (message.action === 'highlight') {
    const enabled = message.enabled as boolean;
    if (enabled) {
      const fields = scanPage(document);
      fields.forEach((f) => {
        highlightField(f.element, 'medium');
      });
    } else {
      clearHighlights(document);
    }
    sendResponse({ success: true });
    return;
  }
});

function injectFloatingCopilotButton() {
  if (document.getElementById('applypilot-floating-wrapper')) return;

  const inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
  if (inputs.length < 3) return;

  const widget = mountFloatingWidget();

  widget.onClick(async () => {
    widget.setDisabled(true);
    widget.setState('loading', 'Reading form…');

    const stopMessages = cycleMessages(AUTOFILL_MESSAGES, (message) => {
      widget.setState('loading', message);
    });

    chrome.runtime.sendMessage({ action: 'get-profile-for-autofill' }, async (response) => {
      if (chrome.runtime.lastError) {
        stopMessages();
        widget.setState('warning', 'Try again');
        setTimeout(() => {
          widget.setState('idle', 'Fill application');
          widget.setDisabled(false);
        }, 2800);
        return;
      }

      if (!response?.success || !response.profile) {
        stopMessages();
        widget.setState('warning', 'Open dashboard');
        setTimeout(() => {
          widget.setState('idle', 'Fill application');
          widget.setDisabled(false);
        }, 3200);
        return;
      }

      const profile = enrichProfile(response.profile as UserProfile);
      if (!hasContactProfileData(profile)) {
        stopMessages();
        widget.setState('warning', 'Set up profile');
        setTimeout(() => {
          widget.setState('idle', 'Fill application');
          widget.setDisabled(false);
        }, 3200);
        return;
      }

      let company = '';
      try {
        company = detectAdapter(document).extractJobDetails(document).company || '';
      } catch {}

      const { filledCount, gaps } = await runFullPageAutofill(
        profile,
        undefined,
        company,
        document.location.hostname
      );

      stopMessages();
      const gapMessage = formatAutofillGapMessage(gaps);
      if (gapMessage) {
        widget.setState('warning', gapMessage.slice(0, 28));
      } else if (filledCount === 0 && !hasProfileData(profile)) {
        widget.setState('warning', 'Profile needed');
      } else {
        widget.setState('success', `Filled ${filledCount} fields`);
      }

      setTimeout(() => {
        widget.setState('idle', 'Fill application');
        widget.setDisabled(false);
      }, 2800);
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(injectFloatingCopilotButton, 1000);
  });
} else {
  setTimeout(injectFloatingCopilotButton, 1000);
}

window.addEventListener(
  'submit',
  (event) => {
    try {
      const form = event.target as HTMLFormElement;
      if (!form) return;

      const fields = scanPage(document);
      fields.forEach((field) => {
        if (field.type === 'file') return;

        let value = '';
        if (field.element instanceof HTMLInputElement) {
          if (field.element.type === 'checkbox') {
            value = field.element.checked ? 'Yes' : 'No';
          } else if (field.element.type === 'radio') {
            if (field.element.checked) {
              value = field.labelText || field.element.value;
            } else {
              return;
            }
          } else {
            value = field.element.value;
          }
        } else if (field.element instanceof HTMLTextAreaElement) {
          value = field.element.value;
        } else if (field.element instanceof HTMLSelectElement) {
          value = field.element.options[field.element.selectedIndex]?.text || '';
        } else {
          value = field.element.textContent || '';
        }

        value = value.trim();
        const questionText = field.labelText || field.name || field.placeholder || '';

        if (questionText && questionText.length > 2 && value && value.length < 500) {
          chrome.runtime.sendMessage({
            action: 'learn-submitted-answer',
            questionText,
            fieldType: field.type,
            answer: value,
            options: field.options
          });
        }
      });
    } catch (err) {
      console.error('[ApplyPilot Auto-learning] Error on form submission scan:', err);
    }
  },
  true
);

console.log('Arsenal ApplyPilot content script initialized.');
