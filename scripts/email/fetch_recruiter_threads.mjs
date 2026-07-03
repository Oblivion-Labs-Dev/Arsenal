import { ImapFlow } from 'imapflow';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

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

  // Search query
  const searchResults = await client.search({
    or: [
      { subject: 'recruiter' },
      { subject: 'hiring' },
      { subject: 'interview' },
      { subject: 'application' }
    ]
  });

  console.log(`Found ${searchResults.length} matching messages.`);

  // Get the latest 10
  const latestIds = searchResults.slice(-10).reverse();
  
  if (latestIds.length === 0) {
    console.log("No matching messages found.");
  } else {
    console.log("\n--- LATEST 10 RECRUITER / OUTREACH CONVERSATIONS ---");
    for (const uid of latestIds) {
      const message = await client.fetchOne(uid, { envelope: true });
      const from = message.envelope.from ? message.envelope.from[0] : null;
      const fromString = from ? `${from.name || ''} <${from.address}>` : 'Unknown';
      console.log(`\n• Subject: ${message.envelope.subject}`);
      console.log(`  From:    ${fromString}`);
      console.log(`  Date:    ${new Date(message.envelope.date).toLocaleString()}`);
    }
  }

  await client.logout();
  console.log('\nLogged out successfully.');
}

run().catch((err) => {
  console.error('IMAP Error:', err);
  client.logout();
});
