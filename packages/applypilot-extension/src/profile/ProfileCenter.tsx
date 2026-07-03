import React, { useState, useEffect } from 'react';
import { getProfile, saveProfile } from './profileStore';
import { getDocuments, saveDocuments } from '../documents/documentStore';
import { UserProfile, FileAttachment } from '../shared/types';
import { syncFromServer, syncToServer } from '../db/sync';

export function ProfileCenter() {
  const [profile, setProfile] = useState<UserProfile>({
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
    pronouns: '',
    gender: '',
    raceEthnicity: '',
    hispanic: ''
  });

  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error' | ''>('');
  const [resumeName, setResumeName] = useState('No file selected');
  const [coverLetterName, setCoverLetterName] = useState('No file selected');
  const [serverOnline, setServerOnline] = useState(true);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    const synced = await syncFromServer();
    setServerOnline(synced);

    const data = await getProfile();
    if (data) {
      // Smart one-time cleanup of garbage custom fields
      const BLACKLISTED_KEYWORDS = [
        'search', 'textbox', 'select...', 'select', 'input', 'text', 'textarea',
        'dropdown', 'upload', 'drop or select', 'drag', 'pdf', 'docx', 'doc',
        'resume', 'cover letter', 'cv', 'file', 'attach', 'browse', 'choose file',
        'yes -', 'no -', 'i consent', 'i agree'
      ];
      if (data.customFields) {
        let cleaned = false;
        const cleanFields = { ...data.customFields };
        for (const key of Object.keys(cleanFields)) {
          const keyLower = key.toLowerCase();
          const isBlacklisted = BLACKLISTED_KEYWORDS.some((kw) => keyLower.includes(kw)) || key.trim().length < 3;
          if (isBlacklisted) {
            delete cleanFields[key];
            cleaned = true;
          }
        }
        if (cleaned) {
          data.customFields = cleanFields;
          await saveProfile(data);
          await syncToServer();
        }
      }

      setProfile(data);
    }
    const docs = await getDocuments();
    if (docs.defaultResume) {
      setResumeName(docs.defaultResume.name);
    }
    if (docs.defaultCoverLetter) {
      setCoverLetterName(docs.defaultCoverLetter.name);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleFileUpload = async (
    file: File,
    type: 'resume' | 'coverLetter',
    setName: (name: string) => void
  ) => {
    const base64 = await readFileAsDataUrl(file);
    const attachment: FileAttachment = { name: file.name, type: file.type, base64 };
    const docs = await getDocuments();

    if (type === 'resume') {
      docs.defaultResume = attachment;
    } else {
      docs.defaultCoverLetter = attachment;
    }

    await saveDocuments(docs);
    await syncToServer();
    setName(file.name);
  };

  const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('Saving to server...');
    setStatusType('');
    
    try {
      await saveProfile(profile);
      const synced = await syncToServer();
      setServerOnline(synced);

      setStatusType(synced ? 'success' : 'error');
      setStatus(
        synced
          ? 'Profile updated and synchronized successfully!'
          : 'Profile saved locally, but server sync failed. Start server with: node server.js'
      );
      setTimeout(() => setStatus(''), 4000);
    } catch (err) {
      setStatusType('error');
      setStatus('Failed to save profile changes.');
    }
  };

  return (
    <div className="profile-page">
      <div className="dash-page-header">
        <h1>User Profile</h1>
        <p>Configure your master details to automatically map and populate application forms.</p>
        {!serverOnline && (
          <div className="alert-banner">
            Local server offline — you can still edit and save here. Run <code>node server.js</code> in the extension folder to sync to db.json.
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="form-grid" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="review-card profile-section">
          <h3 className="profile-section-title"><span>👤</span> Personal details</h3>
          
          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" value={profile.firstName} onChange={handleInputChange} placeholder="Jane" />
            </div>
            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" value={profile.lastName} onChange={handleInputChange} placeholder="Doe" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Full Name</label>
            <input type="text" id="fullName" value={profile.fullName} onChange={handleInputChange} placeholder="Jane Doe" />
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input type="email" id="email" value={profile.email} onChange={handleInputChange} placeholder="jane.doe@example.com" />
            </div>
            <div className="form-group">
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" value={profile.phone} onChange={handleInputChange} placeholder="+1 (555) 123-4567" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location (City, State / Country)</label>
            <input type="text" id="location" value={profile.location} onChange={handleInputChange} placeholder="San Francisco, CA" />
          </div>
        </div>

        <div className="review-card profile-section">
          <h3 className="profile-section-title"><span>🔗</span> Professional links</h3>
          
          <div className="form-group">
            <label htmlFor="linkedin">LinkedIn URL</label>
            <input type="url" id="linkedin" value={profile.linkedin} onChange={handleInputChange} placeholder="https://linkedin.com/in/username" />
          </div>

          <div className="form-group">
            <label htmlFor="github">GitHub URL</label>
            <input type="url" id="github" value={profile.github} onChange={handleInputChange} placeholder="https://github.com/username" />
          </div>

          <div className="form-group">
            <label htmlFor="portfolio">Portfolio URL</label>
            <input type="url" id="portfolio" value={profile.portfolio} onChange={handleInputChange} placeholder="https://janedoe.dev" />
          </div>
        </div>

        <div className="review-card profile-section">
          <h3 className="profile-section-title"><span>💼</span> Work status & targets</h3>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="workAuthorization">Legally Authorized to Work?</label>
              <select id="workAuthorization" value={profile.workAuthorization} onChange={handleInputChange}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="sponsorship">Will Require Visa Sponsorship?</label>
              <select id="sponsorship" value={profile.sponsorship} onChange={handleInputChange}>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="yearsExperience">Years of experience</label>
              <input type="number" id="yearsExperience" min="0" value={profile.yearsExperience} onChange={handleInputChange} placeholder="5" />
            </div>
            <div className="form-group">
              <label htmlFor="salaryExpectations">Target Salary Expectation</label>
              <input type="text" id="salaryExpectations" value={profile.salaryExpectations} onChange={handleInputChange} placeholder="$140,000 - $160,000" />
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="currentTitle">Current job title</label>
              <input type="text" id="currentTitle" value={profile.currentTitle} onChange={handleInputChange} placeholder="Software Engineer" />
            </div>
            <div className="form-group">
              <label htmlFor="targetRole">Target Job Title</label>
              <input type="text" id="targetRole" value={profile.targetRole} onChange={handleInputChange} placeholder="Senior Software Engineer" />
            </div>
          </div>
        </div>

        <div className="review-card profile-section">
          <h3 className="profile-section-title"><span>🪪</span> Voluntary self-identification</h3>
          <p className="profile-file-hint">
            Saved answers used to autofill pronouns and EEO questions on job applications.
          </p>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="pronouns">Pronouns</label>
              <input
                type="text"
                id="pronouns"
                value={profile.pronouns || ''}
                onChange={handleInputChange}
                placeholder="He/him/his"
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <input
                type="text"
                id="gender"
                value={profile.gender || ''}
                onChange={handleInputChange}
                placeholder="Male"
              />
            </div>
          </div>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="raceEthnicity">Race / ethnicity</label>
              <input
                type="text"
                id="raceEthnicity"
                value={profile.raceEthnicity || ''}
                onChange={handleInputChange}
                placeholder="Asian"
              />
            </div>
            <div className="form-group">
              <label htmlFor="hispanic">Hispanic / Latino</label>
              <select id="hispanic" value={profile.hispanic || ''} onChange={handleInputChange}>
                <option value="">Prefer not to answer</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>

        <div className="review-card profile-section">
          <h3 className="profile-section-title"><span>📄</span> Application documents</h3>
          <p className="profile-file-hint">
            Upload your default resume and cover letter for Greenhouse file inputs.
          </p>

          <div className="profile-grid-2">
            <div className="form-group">
              <label htmlFor="profile-resume">Default resume</label>
              <input
                type="file"
                id="profile-resume"
                className="profile-file-input"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'resume', setResumeName);
                }}
              />
              <span className="profile-file-hint">{resumeName}</span>
            </div>
            <div className="form-group">
              <label htmlFor="profile-cover-letter">Default cover letter</label>
              <input
                type="file"
                id="profile-cover-letter"
                className="profile-file-input"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, 'coverLetter', setCoverLetterName);
                }}
              />
              <span className="profile-file-hint">{coverLetterName}</span>
            </div>
          </div>
        </div>

        {profile.customFields && Object.keys(profile.customFields).length > 0 && (
          <div className="review-card profile-section">
            <h3 className="profile-section-title"><span>🧩</span> Custom & Discovered Fields</h3>
            <p className="profile-file-hint">
              These fields were automatically discovered from your job application scans. Provide answers here to automatically fill them in next time.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {Object.keys(profile.customFields).map((label) => (
                <div className="form-group" key={label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label htmlFor={`custom-${label}`} style={{ margin: 0, fontWeight: 500 }}>{label}</label>
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', height: 'auto', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      onClick={() => {
                        const updatedFields = { ...profile.customFields };
                        delete updatedFields[label];
                        setProfile(prev => ({
                          ...prev,
                          customFields: updatedFields
                        }));
                      }}
                    >
                      Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    id={`custom-${label}`}
                    value={profile.customFields![label]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setProfile(prev => ({
                        ...prev,
                        customFields: {
                          ...prev.customFields,
                          [label]: val
                        }
                      }));
                    }}
                    placeholder="Enter answer..."
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="profile-actions">
          <button type="submit" className="btn btn-success btn-lg" style={{ width: 'fit-content' }}>
            Save profile settings
          </button>
          
          {status && (
            <span className={`profile-status ${statusType}`}>
              {status}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
