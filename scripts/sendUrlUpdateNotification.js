import 'dotenv/config';
import mongoose from 'mongoose';
import nodemailer from 'nodemailer';
import User from '../models/userModel.js';

// Configuration
const OLD_URL = 'https://xhtmlreviews.in/DoNow/employee';
const NEW_URL = 'https://holyminicow.com/DoNow/login';

// Excluded email addresses (case-insensitive)
const EXCLUDED_EMAILS = [
  'hr.infastasolutions@gmail.com',
  'acc.infasta@gmail.com'
].map(email => email.trim().toLowerCase());

// Helper sleep function to avoid SMTP rate-limiting
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Generate HTML email template
 */
function generateEmailHtml(userName = 'Member') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Important Notice: DoNow Platform URL Update</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #334155;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f6fb;
      padding: 40px 15px;
      box-sizing: border-box;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #ffffff;
      padding: 36px 30px;
      text-align: center;
    }
    .logo-badge {
      display: inline-flex;
      align-items: center;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 14px;
    }
    .header h1 {
      margin: 0 0 8px 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 0;
      font-size: 15px;
      color: #e0e7ff;
      font-weight: 400;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.65;
    }
    .greeting {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 16px;
    }
    .message-text {
      font-size: 15px;
      color: #475569;
      margin-bottom: 24px;
    }
    .url-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .url-item {
      padding: 10px 0;
    }
    .url-item:first-child {
      border-bottom: 1px dashed #cbd5e1;
      padding-bottom: 14px;
      margin-bottom: 14px;
    }
    .url-label {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: inline-block;
      margin-bottom: 6px;
    }
    .url-label.old {
      color: #dc2626;
    }
    .url-label.new {
      color: #16a34a;
    }
    .url-value-old {
      font-size: 14px;
      color: #94a3b8;
      text-decoration: line-through;
      word-break: break-all;
      font-family: monospace;
    }
    .url-value-new {
      font-size: 15px;
      font-weight: 700;
      color: #4f46e5;
      word-break: break-all;
      font-family: monospace;
    }
    .cta-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      color: #ffffff !important;
      text-decoration: none;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 34px;
      border-radius: 10px;
      box-shadow: 0 4px 14px 0 rgba(124, 58, 237, 0.35);
      letter-spacing: 0.2px;
    }
    .info-callout {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 14px;
      color: #1e40af;
      margin-top: 24px;
    }
    .info-callout strong {
      color: #1e3a8a;
    }
    .footer {
      background-color: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 24px 30px;
      text-align: center;
      font-size: 13px;
      color: #94a3b8;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <div class="logo-badge">⚡ DoNow Platform Notice</div>
        <h1>Portal URL Has Changed</h1>
        <p>Please update your bookmarks to the new address</p>
      </div>

      <div class="content">
        <div class="greeting">Hi ${userName},</div>
        <p class="message-text">
          We would like to notify you that the login URL for the <strong>DoNow Task Management Portal</strong> has been updated with immediate effect.
        </p>

        <div class="url-card">
          <div class="url-item">
            <span class="url-label old">❌ Old URL (No longer active)</span>
            <div class="url-value-old">${OLD_URL}</div>
          </div>
          <div class="url-item">
            <span class="url-label new">✅ New URL (Active)</span>
            <div class="url-value-new">${NEW_URL}</div>
          </div>
        </div>

        <div class="cta-container">
          <a href="${NEW_URL}" class="cta-button" target="_blank" rel="noopener noreferrer">
            Login to DoNow &rarr;
          </a>
        </div>

        <div class="info-callout">
          <strong>📌 Note:</strong> Your existing username, email, and password remain the same. Simply visit the new URL and sign in to continue managing your tasks.
        </div>
      </div>

      <div class="footer">
        <p><strong>DoNow Task Management System</strong></p>
        <p>If you encounter any issues logging in, please reach out to your administrator.</p>
        <p style="font-size: 11px; color: #cbd5e1; margin-top: 10px;">This is an automated system notification.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate plain text email version
 */
function generateEmailText(userName = 'Member') {
  return `Hi ${userName},

Important Update: The DoNow Task Management Portal URL has changed.

Old URL (Deprecated):
${OLD_URL}

New URL (Active):
${NEW_URL}

Please update your browser bookmarks. Your existing login credentials remain unchanged.

Login now: ${NEW_URL}

Best regards,
DoNow Team`;
}

/**
 * Create Nodemailer Transporter
 */
function createTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  let user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  // Clean up any known trailing typo in user email if present
  if (user && user.endsWith('.coma')) {
    user = user.replace(/\.coma$/, '.com');
  }

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS must be defined in backend/.env');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

/**
 * Main execution function
 */
async function run() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const testEmailIndex = args.indexOf('--test');
  const testEmail = testEmailIndex !== -1 ? args[testEmailIndex + 1] : null;
  const useBeta = args.includes('--beta');

  console.log('====================================================');
  console.log('       DoNow URL Update Email Notification Tool     ');
  console.log('====================================================\n');
  console.log(`[Config] Old URL: ${OLD_URL}`);
  console.log(`[Config] New URL: ${NEW_URL}`);
  console.log(`[Config] Excluded Emails: ${EXCLUDED_EMAILS.join(', ')}`);
  if (isDryRun) {
    console.log('[Mode] 🔍 DRY-RUN MODE (No actual emails will be dispatched)\n');
  } else if (testEmail) {
    console.log(`[Mode] 🧪 TEST MODE (Sending single test email to: ${testEmail})\n`);
  } else {
    console.log('[Mode] 🚀 LIVE SENDING MODE\n');
  }

  // 1. Setup SMTP Transporter
  let transporter;
  if (!isDryRun) {
    console.log('Connecting to SMTP server...');
    transporter = createTransporter();
    try {
      await transporter.verify();
      console.log('✅ SMTP connection authenticated successfully.\n');
    } catch (smtpErr) {
      console.error('❌ SMTP Connection failed:', smtpErr.message);
      process.exit(1);
    }
  }

  // 2. Handle Single Test Email Mode
  if (testEmail) {
    console.log(`Sending test email to ${testEmail}...`);
    try {
      const info = await transporter.sendMail({
        from: `"DoNow Team" <${transporter.options.auth.user}>`,
        to: testEmail,
        subject: 'Important: DoNow Platform URL Has Changed',
        text: generateEmailText('Test User'),
        html: generateEmailHtml('Test User'),
      });
      console.log(`✅ Test email successfully sent! Message ID: ${info.messageId}`);
    } catch (err) {
      console.error(`❌ Failed to send test email:`, err.message);
    }
    return;
  }

  // 3. Connect to Database & Retrieve Members
  const dbUri = useBeta ? process.env.MONGO_URI_BETA : (process.env.MONGO_URI || process.env.MONGO_URI_BETA);
  if (!dbUri) {
    console.error('❌ MONGO_URI is missing in environment variables.');
    process.exit(1);
  }

  console.log(`Connecting to MongoDB database...`);
  await mongoose.connect(dbUri);
  console.log(`✅ Connected to database: ${mongoose.connection.name}\n`);

  try {
    // Query all users
    const allUsers = await User.find({}).lean();
    console.log(`Total users found in database: ${allUsers.length}`);

    // Separate target users and excluded users
    const targetUsers = [];
    const excludedUsers = [];

    for (const user of allUsers) {
      const email = (user.email || '').trim().toLowerCase();
      if (!email) continue;

      if (EXCLUDED_EMAILS.includes(email)) {
        excludedUsers.push(user);
      } else {
        targetUsers.push(user);
      }
    }

    console.log(`\n----------------------------------------------------`);
    console.log(`🚫 EXCLUDED MEMBERS (${excludedUsers.length}):`);
    excludedUsers.forEach((u) => {
      console.log(`   - ${u.name} <${u.email}> (${u.role || 'Member'})`);
    });

    console.log(`\n🎯 TARGET RECIPIENTS (${targetUsers.length}):`);
    targetUsers.forEach((u, i) => {
      console.log(`   ${i + 1}. ${u.name} <${u.email}> (${u.role || 'Member'})`);
    });
    console.log(`----------------------------------------------------\n`);

    if (targetUsers.length === 0) {
      console.log('No eligible recipients found to send emails to.');
      return;
    }

    if (isDryRun) {
      console.log('✅ Dry run complete. To send live emails, run:');
      console.log('   node scripts/sendUrlUpdateNotification.js');
      return;
    }

    // 4. Send Emails
    console.log(`Beginning email dispatch to ${targetUsers.length} recipients...\n`);
    let successCount = 0;
    let failCount = 0;
    const failures = [];

    for (let i = 0; i < targetUsers.length; i++) {
      const user = targetUsers[i];
      const recipientEmail = user.email.trim();
      const recipientName = user.name || 'Member';

      process.stdout.write(`[${i + 1}/${targetUsers.length}] Sending to ${recipientName} (${recipientEmail})... `);

      try {
        const mailOptions = {
          from: `"DoNow Team" <${transporter.options.auth.user}>`,
          to: recipientEmail,
          subject: 'Important: DoNow Platform URL Has Changed',
          text: generateEmailText(recipientName),
          html: generateEmailHtml(recipientName),
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ SENT (ID: ${info.messageId})`);
        successCount++;
      } catch (sendErr) {
        console.log(`❌ FAILED: ${sendErr.message}`);
        failCount++;
        failures.push({ email: recipientEmail, error: sendErr.message });
      }

      // Small delay between sends to respect SMTP rate limits
      if (i < targetUsers.length - 1) {
        await sleep(600);
      }
    }

    // 5. Summary Report
    console.log('\n====================================================');
    console.log('                 DISPATCH SUMMARY                   ');
    console.log('====================================================');
    console.log(`Total Target Recipients: ${targetUsers.length}`);
    console.log(`Successfully Sent:       ${successCount} ✅`);
    console.log(`Failed:                  ${failCount} ${failCount > 0 ? '❌' : ''}`);
    console.log(`Excluded:                ${excludedUsers.length} 🚫`);

    if (failures.length > 0) {
      console.log('\nFailed Emails:');
      failures.forEach((f) => console.log(`  - ${f.email}: ${f.error}`));
    }
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Error during script execution:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Database disconnected.');
  }
}

run();
