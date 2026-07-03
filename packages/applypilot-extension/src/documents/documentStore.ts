import { FileAttachment } from '../shared/types';

export interface ResumeVariant {
  id: string;
  name: string;
  rolePattern: string; // e.g. "React", "Rust", "Backend"
  file: FileAttachment;
}

export interface DocumentCollection {
  defaultResume?: FileAttachment;
  resumeVariants: ResumeVariant[];
  defaultCoverLetter?: FileAttachment;
  coverLetterTemplates: { id: string; name: string; body: string }[];
}

const DEFAULT_TEMPLATES = [
  {
    id: 'standard',
    name: 'Standard Template',
    body: 'Dear {{company}} Team,\n\nI am writing to express my strong interest in the {{role}} role. With my background in software engineering, especially focusing on {{topSkills}}, I am confident that I can make a meaningful impact.\n\n{{experienceSummary}}\n\nThank you for your consideration,\n{{candidateName}}'
  }
];

export async function getDocuments(): Promise<DocumentCollection> {
  const defaultCollection: DocumentCollection = {
    resumeVariants: [],
    coverLetterTemplates: DEFAULT_TEMPLATES
  };

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['applypilot_documents'], (result) => {
        resolve({
          ...defaultCollection,
          ...result.applypilot_documents
        });
      });
    });
  }

  const data = localStorage.getItem('applypilot_documents');
  if (!data) return defaultCollection;
  try {
    return {
      ...defaultCollection,
      ...JSON.parse(data)
    };
  } catch {
    return defaultCollection;
  }
}

export async function saveDocuments(docs: DocumentCollection): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ applypilot_documents: docs }, () => {
        resolve();
      });
    });
  }
  localStorage.setItem('applypilot_documents', JSON.stringify(docs));
}
