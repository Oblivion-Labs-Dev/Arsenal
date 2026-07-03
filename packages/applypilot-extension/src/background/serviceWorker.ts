import '../shared/process-shim';
import { syncFromServer } from '../db/sync';
import { scanAllFrames, autofillAllFrames, autofillCompleteAllFrames } from './tabMessaging';

chrome.runtime.onInstalled.addListener(() => {
  console.log('Arsenal ApplyPilot service worker successfully registered.');
  syncFromServer();
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'scan-all-frames') {
    scanAllFrames(message.tabId, message.profile).then(sendResponse);
    return true;
  }

  if (message.action === 'autofill-all-frames') {
    autofillAllFrames(message.tabId, message.fields, message.profile).then(sendResponse);
    return true;
  }

  if (message.action === 'autofill-complete-all-frames') {
    autofillCompleteAllFrames(message.tabId, message.profile, message.overrides).then(sendResponse);
    return true;
  }

  if (message.action === 'get-profile-for-autofill') {
    (async () => {
      try {
        const { resolveProfileForAutofill } = await import('../profile/profileStore');
        const profile = await resolveProfileForAutofill();
        sendResponse({ success: true, profile });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'learn-submitted-answer') {
    (async () => {
      try {
        const { learnAnswer } = await import('../learning/learningEngine');
        await learnAnswer({
          questionText: message.questionText,
          fieldType: message.fieldType,
          answer: message.answer,
          options: message.options,
          scope: 'global'
        });
        sendResponse({ success: true });
      } catch (err: any) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  return false;
});
