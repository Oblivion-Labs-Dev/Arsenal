/** Default answers used when profile values are not set for common ATS fields. */
export const APPLICATION_FIELD_DEFAULTS = {
  gender: 'Prefer not to answer',
  raceEthnicity: 'Prefer not to answer',
  hispanic: 'Prefer not to answer',
  veteran: 'I am not a protected veteran',
  disability: "No, I don't have a disability",
  smsConsent: 'No - I do not consent to receiving text messages',
  pronouns: 'Prefer not to say'
} as const;

export type ApplicationDefaultKey = keyof typeof APPLICATION_FIELD_DEFAULTS;
