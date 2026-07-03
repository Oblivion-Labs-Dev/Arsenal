# Gmail Sending Integration

This directory contains CLI scripts and utilities to send emails through your Gmail account.

## Prerequisites

Gmail requires an **App Password** to send emails via SMTP securely. Normal passwords or standard 2FA will not work with SMTP clients directly.

### How to Get a Gmail App Password

1. Go to your [Google Account Console](https://myaccount.google.com/).
2. In the left navigation panel, click **Security**.
3. Under *How you sign in to Google*, make sure **2-Step Verification** is turned **ON** (this is required to generate App Passwords).
4. Click on **2-Step Verification**, scroll to the bottom of the page, and select **App passwords**.
5. Enter a name for the app (e.g., `Forge Arsenal Mailer`) and click **Create**.
6. Google will display a **16-character code** (e.g., `xxxx xxxx xxxx xxxx`). **Copy this code** (without spaces) — this is your `GMAIL_APP_PASSWORD`.

---

## Configuration

Create a `.env` file at the root of the `Arsenal` repository (or workspace root) and add the following:

```env
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-character-app-password
```

---

## Usage

You can run the script to send a basic email:

```bash
node scripts/email/send-email.mjs <recipient-email> "[subject]" "[body]"
```

### Examples

```bash
node scripts/email/send-email.mjs friend@example.com "Hello from Arsenal!" "This is a test email sent from the command-line."
```
