import { UserProfile } from '../shared/types';
import { APPLICATION_FIELD_DEFAULTS } from '../shared/applicationDefaults';

const SERVER_DB_URL = 'http://localhost:8085/api/db';

const PROFILE_STRING_KEYS: (keyof UserProfile)[] = [
  'firstName',
  'lastName',
  'fullName',
  'email',
  'phone',
  'location',
  'linkedin',
  'github',
  'portfolio',
  'workAuthorization',
  'sponsorship',
  'yearsExperience',
  'currentTitle',
  'currentCompany',
  'targetRole',
  'salaryExpectations',
  'pronouns',
  'gender',
  'raceEthnicity',
  'hispanic',
  'veteran',
  'disability',
  'smsConsent'
];

export function isExtensionContext(): boolean {
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

export function mergeProfiles(
  primary: UserProfile | null | undefined,
  secondary: UserProfile | null | undefined
): UserProfile {
  const merged = createEmptyProfile();

  for (const key of PROFILE_STRING_KEYS) {
    const a = primary?.[key]?.trim() || '';
    const b = secondary?.[key]?.trim() || '';
    if (a || b) merged[key] = a || b;
  }

  if (primary?.customFields || secondary?.customFields) {
    merged.customFields = {
      ...(secondary?.customFields || {}),
      ...(primary?.customFields || {})
    };
  }

  return enrichProfile(merged);
}

async function readChromeProfile(): Promise<UserProfile | null> {
  if (!isExtensionContext() || !chrome.storage?.local) return null;
  return new Promise((resolve) => {
    chrome.storage.local.get(['applypilot_profile'], (result) => {
      resolve(result.applypilot_profile || null);
    });
  });
}

async function writeChromeProfile(profile: UserProfile): Promise<void> {
  if (!isExtensionContext() || !chrome.storage?.local) return;
  return new Promise((resolve) => {
    chrome.storage.local.set({ applypilot_profile: profile }, () => resolve());
  });
}

export async function fetchServerDb(): Promise<{
  profile?: UserProfile;
  documents?: { defaultResume?: UserProfile['resume']; defaultCoverLetter?: UserProfile['coverLetter'] };
} | null> {
  try {
    const res = await fetch(SERVER_DB_URL);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function pushProfileToServer(profile: UserProfile): Promise<boolean> {
  try {
    const db = await fetchServerDb();
    if (!db) return false;
    db.profile = profile;
    const res = await fetch(SERVER_DB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db)
    });
    return res.ok;
  } catch {
    return false;
  }
}

const EEO_CUSTOM_FIELD_LABEL_RE =
  /gender|sex\b|race|ethnicity|hispanic|latino|veteran|disability/i;

/** Drop legacy customFields copies now stored as first-class profile keys. */
function stripLegacyEeoCustomFields(profile: UserProfile): void {
  if (!profile.customFields) return;
  for (const key of Object.keys(profile.customFields)) {
    if (EEO_CUSTOM_FIELD_LABEL_RE.test(key)) {
      delete profile.customFields[key];
    }
  }
  if (Object.keys(profile.customFields).length === 0) {
    delete profile.customFields;
  }
}

export function enrichProfile(profile: UserProfile): UserProfile {
  const enriched: UserProfile = {
    ...profile,
    customFields: profile.customFields ? { ...profile.customFields } : undefined
  };

  stripLegacyEeoCustomFields(enriched);

  if (!enriched.firstName?.trim() && enriched.fullName?.trim()) {
    const parts = enriched.fullName.trim().split(/\s+/);
    enriched.firstName = parts[0] || '';
    enriched.lastName = parts.slice(1).join(' ') || enriched.lastName || '';
  }

  if (!enriched.fullName?.trim() && enriched.firstName?.trim()) {
    enriched.fullName = `${enriched.firstName} ${enriched.lastName || ''}`.trim();
  }

  if (!enriched.veteran?.trim()) enriched.veteran = APPLICATION_FIELD_DEFAULTS.veteran;
  if (!enriched.disability?.trim()) enriched.disability = APPLICATION_FIELD_DEFAULTS.disability;
  if (!enriched.smsConsent?.trim()) enriched.smsConsent = APPLICATION_FIELD_DEFAULTS.smsConsent;
  if (!enriched.gender?.trim()) enriched.gender = APPLICATION_FIELD_DEFAULTS.gender;
  if (!enriched.raceEthnicity?.trim()) enriched.raceEthnicity = APPLICATION_FIELD_DEFAULTS.raceEthnicity;
  if (!enriched.hispanic?.trim()) enriched.hispanic = APPLICATION_FIELD_DEFAULTS.hispanic;
  if (!enriched.currentCompany?.trim() && enriched.currentTitle?.trim()) {
    enriched.currentCompany = enriched.currentTitle;
  }

  return enriched;
}

export function createEmptyProfile(): UserProfile {
  return {
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
    location: '',
    linkedin: '',
    github: '',
    portfolio: '',
    workAuthorization: 'Yes',
    sponsorship: 'No',
    yearsExperience: '',
    currentTitle: '',
    targetRole: '',
    salaryExpectations: '',
    veteran: APPLICATION_FIELD_DEFAULTS.veteran,
    disability: APPLICATION_FIELD_DEFAULTS.disability,
    smsConsent: APPLICATION_FIELD_DEFAULTS.smsConsent,
    pronouns: '',
    gender: '',
    raceEthnicity: '',
    hispanic: ''
  };
}

export function hasContactProfileData(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(profile.firstName?.trim() && profile.lastName?.trim() && profile.email?.trim());
}

export function hasProfileData(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false;
  return Boolean(
    profile.email?.trim() ||
    profile.firstName?.trim() ||
    profile.fullName?.trim() ||
    (profile.customFields && Object.values(profile.customFields).some((v) => v.trim() !== ''))
  );
}

export async function getProfile(): Promise<UserProfile | null> {
  const fromChrome = await readChromeProfile();
  const fromServer = (await fetchServerDb())?.profile ?? null;

  if (fromChrome && fromServer) return mergeProfiles(fromChrome, fromServer);
  if (fromChrome) return fromChrome;
  if (fromServer) return fromServer;

  if (!isExtensionContext()) return null;

  const data = localStorage.getItem('applypilot_profile');
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await writeChromeProfile(profile);
  await pushProfileToServer(profile);

  if (!isExtensionContext()) {
    localStorage.setItem('applypilot_profile', JSON.stringify(profile));
  }
}

export async function resolveProfileForAutofill(): Promise<UserProfile> {
  const { getDocuments, saveDocuments } = await import('../documents/documentStore');
  const { syncFromServer } = await import('../db/sync');

  await syncFromServer();

  const fromChrome = await readChromeProfile();
  const serverDb = await fetchServerDb();
  const profile = mergeProfiles(fromChrome, serverDb?.profile);
  await writeChromeProfile(profile);

  const docs = await getDocuments();
  if (serverDb?.documents?.defaultResume && !docs.defaultResume) {
    await saveDocuments({
      ...docs,
      defaultResume: serverDb.documents.defaultResume,
      defaultCoverLetter: serverDb.documents.defaultCoverLetter ?? docs.defaultCoverLetter
    });
  }

  const finalDocs = await getDocuments();
  profile.resume = finalDocs.defaultResume ?? serverDb?.documents?.defaultResume;
  profile.coverLetter = finalDocs.defaultCoverLetter ?? serverDb?.documents?.defaultCoverLetter;

  return enrichProfile(profile);
}

export async function clearProfile(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['applypilot_profile'], () => {
        resolve();
      });
    });
  }
  localStorage.removeItem('applypilot_profile');
}
