import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const OUTPUT_PATH = path.join(__dirname, '..', '..', '..', 'Forge', 'apps', 'dashboard', 'src', 'data', 'past_conversations.json');

const client = new ImapFlow({
  host: 'imap.gmail.com',
  port: 993,
  secure: true,
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  logger: false,
});

async function run() {
  console.log(`Connecting to Gmail IMAP for ${process.env.GMAIL_USER}...`);
  await client.connect();

  let mailbox;
  try {
    mailbox = await client.mailboxOpen('[Gmail]/All Mail');
  } catch (err) {
    mailbox = await client.mailboxOpen('INBOX');
  }

  console.log(`Searching mailbox: ${mailbox.name}...`);

  const searchResults = await client.search({
    or: [
      { subject: 'recruiter' },
      { subject: 'hiring' },
      { subject: 'interview' },
      { subject: 'application' }
    ]
  });

  console.log(`Found ${searchResults.length} matching messages. Syncing the latest 150...`);

  // Sync up to 150 messages
  const targetIds = searchResults.slice(-150).reverse();
  const conversations = [];

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  for (const uid of targetIds) {
    try {
      // Add a polite 150ms delay between fetches to respect Gmail rate limits
      await sleep(150);

      // Fetch envelope (headers) and body structure or snippet
      const message = await client.fetchOne(uid, { 
        envelope: true,
        source: false // We don't fetch full raw source to keep it fast
      });
      
      const from = message.envelope.from ? message.envelope.from[0] : null;
      const fromName = from ? from.name || '' : '';
      const fromAddress = from ? from.address || '' : '';
      const subject = message.envelope.subject || 'No Subject';
      const date = message.envelope.date ? new Date(message.envelope.date).toISOString() : new Date().toISOString();

      conversations.push({
        uid,
        subject,
        fromName,
        fromAddress,
        date
      });
    } catch (fetchErr) {
      console.warn(`Failed to fetch message UID ${uid}:`, fetchErr.message);
    }
  }

  // Write to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(conversations, null, 2), 'utf8');
  console.log(`Successfully saved ${conversations.length} conversations to ${OUTPUT_PATH}`);

  await client.logout();
  console.log('Logged out.');
}

run().catch((err) => {
  console.error('Sync Error:', err);
  client.logout();
});
