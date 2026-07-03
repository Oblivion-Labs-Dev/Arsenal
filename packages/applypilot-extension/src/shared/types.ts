export interface FileAttachment {
  name: string;
  type: string;
  base64: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
  workAuthorization: string; // "Yes" / "No"
  sponsorship: string; // "Yes" / "No"
  yearsExperience: string;
  currentTitle: string;
  targetRole: string;
  salaryExpectations: string;
  currentCompany?: string;
  pronouns?: string;
  gender?: string;
  raceEthnicity?: string;
  hispanic?: string;
  veteran?: string;
  disability?: string;
  smsConsent?: string;
  customFields?: Record<string, string>;
  resume?: FileAttachment;
  coverLetter?: FileAttachment;
}

export type ApplicationStatus =
  | 'viewed'
  | 'autofilled'
  | 'readyToSubmit'
  | 'submittedManually'
  | 'rejected'
  | 'interview';

export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  url: string;
  date: string;
  status: ApplicationStatus;
  resumeUsed?: string;
  coverLetterUsed?: string;
  notes?: string;
}

export interface JobDetails {
  company: string;
  role: string;
  location: string;
  description: string;
  platform: string;
}
