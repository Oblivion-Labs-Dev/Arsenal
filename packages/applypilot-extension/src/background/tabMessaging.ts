import { JobDetails, UserProfile } from '../shared/types';

export interface ScannedFieldMessage {
  id: string;
  frameId: number;
  type: string;
  labelText: string;
  placeholder?: string;
  name?: string;
  options?: string[];
  canonicalKey?: string;
  proposedValue?: string;
  confidence: string;
  reason?: string;
}

interface FrameScanResult {
  frameId: number;
  jobDetails: JobDetails;
  fields: Omit<ScannedFieldMessage, 'frameId'>[];
}

async function getFrameIds(tabId: number): Promise<number[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    if (frames?.length) {
      return frames.map((f) => f.frameId);
    }
  } catch {
    // Fall back to main frame when webNavigation is unavailable.
  }
  return [0];
}

function sendToFrame<T>(tabId: number, frameId: number, message: Record<string, unknown>): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, message, { frameId }, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }
      resolve(response as T);
    });
  });
}

function mergeJobDetails(frameResults: FrameScanResult[]): JobDetails {
  const primary =
    frameResults.reduce((best, current) =>
      current.fields.length > best.fields.length ? current : best
    ) ?? frameResults[0];

  const merged: JobDetails = { ...primary.jobDetails };

  for (const frame of frameResults) {
    const details = frame.jobDetails;
    if (details.company && details.company !== 'Unknown Company') {
      merged.company = details.company;
    }
    if (details.role && details.role !== 'Unknown Role') {
      merged.role = details.role;
    }
    if (details.location && !['Unspecified Location', 'Remote / Unspecified'].includes(details.location)) {
      merged.location = details.location;
    }
    if (details.platform && details.platform !== 'Generic') {
      merged.platform = details.platform;
    }
  }

  return merged;
}

export async function scanAllFrames(
  tabId: number,
  profile: UserProfile
): Promise<{ success: boolean; jobDetails?: JobDetails; fields?: ScannedFieldMessage[]; error?: string }> {
  const frameIds = await getFrameIds(tabId);
  const frameResults: FrameScanResult[] = [];

  for (const frameId of frameIds) {
    const response = await sendToFrame<{
      success: boolean;
      jobDetails: JobDetails;
      fields: Omit<ScannedFieldMessage, 'frameId'>[];
    }>(tabId, frameId, { action: 'scan', profile });

    if (response?.success && response.fields?.length) {
      frameResults.push({
        frameId,
        jobDetails: response.jobDetails,
        fields: response.fields
      });
    }
  }

  if (frameResults.length === 0) {
    return { success: false, error: 'No form fields detected in any frame.' };
  }

  const fields = frameResults.flatMap((result) =>
    result.fields.map((field) => ({ ...field, frameId: result.frameId }))
  );

  return {
    success: true,
    jobDetails: mergeJobDetails(frameResults),
    fields
  };
}

export async function autofillCompleteAllFrames(
  tabId: number,
  profile: UserProfile,
  overrides?: Record<string, string>
): Promise<{ success: boolean; filledCount: number; errors: { label: string; error: string }[] }> {
  const frameIds = await getFrameIds(tabId);
  let filledCount = 0;
  const errors: { label: string; error: string }[] = [];

  for (const frameId of frameIds) {
    const response = await sendToFrame<{
      success: boolean;
      filledCount?: number;
      errors?: { label: string; error: string }[];
    }>(tabId, frameId, {
      action: 'autofill-complete',
      profile,
      overrides: overrides || {}
    });

    if (response?.success) {
      filledCount += response.filledCount ?? 0;
      if (response.errors?.length) {
        errors.push(...response.errors);
      }
    }
  }

  return { success: true, filledCount, errors };
}

export async function autofillAllFrames(
  tabId: number,
  fields: { id: string; proposedValue: string; frameId?: number }[],
  profile: UserProfile
): Promise<{ success: boolean; filledCount: number; errors: { label: string; error: string }[] }> {
  const byFrame = new Map<number, { id: string; proposedValue: string }[]>();

  for (const field of fields) {
    const frameId = field.frameId ?? 0;
    if (!byFrame.has(frameId)) {
      byFrame.set(frameId, []);
    }
    byFrame.get(frameId)!.push({ id: field.id, proposedValue: field.proposedValue });
  }

  let filledCount = 0;
  const errors: { label: string; error: string }[] = [];

  for (const [frameId, frameFields] of byFrame) {
    const response = await sendToFrame<{
      success: boolean;
      filledCount?: number;
      errors?: { label: string; error: string }[];
    }>(tabId, frameId, {
      action: 'autofill',
      fields: frameFields,
      profile
    });

    if (response?.success) {
      filledCount += response.filledCount ?? 0;
      if (response.errors?.length) {
        errors.push(...response.errors);
      }
    }
  }

  return { success: true, filledCount, errors };
}
