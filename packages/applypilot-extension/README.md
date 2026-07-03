# Arsenal ApplyPilot

**Arsenal ApplyPilot** is a self-contained, privacy-first Chrome Manifest V3 extension designed to scan job boards, map application inputs to a local profile vault, prompt for unknown questions via a **Self-Learning Answer Memory**, and programmatically attach local resumes and cover letters.

## Features

1. **Profile Vault:** Secure local storage (`chrome.storage.local`) holding personal contacts, credentials, salary ranges, and professional preferences. Support JSON export/import.
2. **Self-Learning Answer Memory:** Fuzzy-matches custom questions using Levenshtein distance. When a user corrects or answers low-confidence fields, it memorizes and offers those suggestions in subsequent forms.
3. **Assisted Document Attachment:** Parses and highlights file upload dropzones, converting base64 cache files into programmatic files ready for DOM assignment.
4. **Safety Rules:** Blocks AutoSubmit, skips demographic scanning/guessing, filters out sensitive credentials (passwords, SSNs, credit cards), and remains 100% offline.

---

## Installation & Setup

### 1. Build Extension
From the `Arsenal` repository root:

```bash
pnpm install
pnpm --filter @oblivion-labs-dev/arsenal-applypilot-extension build
```

The compiled bundles and assets will be output to:
`packages/applypilot-extension/dist`

### 2. Load Unpacked in Chrome
1. Open Google Chrome.
2. Navigate to `chrome://extensions/`.
3. Toggle **Developer mode** in the top right.
4. Click **Load unpacked** in the top left.
5. Select the `dist` folder:  
   `Arsenal/packages/applypilot-extension/dist`

---

## Permissions Breakdown

- **`activeTab`:** Allows ApplyPilot to scan page input tags only when explicitly triggered by the user clicking the action button.
- **`scripting`:** Used to run the classifier script within the active tab document context.
- **`storage`:** Grants access to `chrome.storage.local` to store profiles, document binaries, and learned question memories.

---

## Example Profile JSON Template

Exported from the Profile Vault tab:

```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "phone": "+1 (555) 123-4567",
  "location": "San Francisco, CA",
  "linkedin": "https://linkedin.com/in/janedoe",
  "github": "https://github.com/janedoe",
  "portfolio": "https://janedoe.dev",
  "workAuthorization": "Yes",
  "sponsorship": "No",
  "yearsExperience": "5",
  "currentTitle": "Staff Software Artisan",
  "targetRole": "Senior Engineer",
  "salaryExpectations": "$150,000"
}
```

---

## Example Cover Letter Template

Interpolated locally by the compilation tab:

```text
Dear {{company}} Team,

I am writing to express my strong interest in the {{role}} role. With my background in software engineering, especially focusing on {{topSkills}}, I am confident that I can make a meaningful impact.

{{experienceSummary}}

Thank you for your consideration,
{{candidateName}}
```

---

## Verification & Manual Testing
Use the mock HTML form provided in the package to verify classification accuracy:
- Open `packages/applypilot-extension/fixtures/test-application.html` in Chrome.
- Open the ApplyPilot popup, fill a profile, and click **Scan Job Page**.
- Correct low-confidence or custom questions and check "Learn this answer".
- Click **Autofill Form** and inspect the filled data.
