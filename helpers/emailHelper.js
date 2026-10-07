import { emailQueue } from "./emailQueue.js";

const sendEmployeeEmail = async (
  email,
  password,
  name,
  adminName = "Administrator",
  businessName = "Your Organization",
  designation = "Employee",
) => {
  try {

    const initials = adminName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
    const frontendUrl =
      process.env.FRONTEND_URL || "https://DoNow.netlify.app";

    const mailOptions = {
      from: `"DoNow Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Join the ${businessName} team on DoNow`,
      html: `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Welcome to ${businessName}</title>

<style>
body{
    margin:0;
    padding:0;
    background:#f4f6fb;
    font-family:Arial,Helvetica,sans-serif;
}

.container{
    max-width:620px;
    margin:30px auto;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
    border:1px solid #e5e7eb;
}

.header{
    background:linear-gradient(135deg,#7c3aed,#4f46e5);
    color:#fff;
    text-align:center;
    padding:45px 30px;
}

.header h1{
    margin:0;
    font-size:30px;
}

.header p{
    margin-top:10px;
    opacity:.95;
    font-size:16px;
}

.content{
    padding:40px;
    color:#374151;
    line-height:1.7;
}

.content h2{
    margin-top:0;
    color:#111827;
}

.info-box{
    background:#f9fafb;
    border:1px solid #e5e7eb;
    border-radius:10px;
    padding:20px;
    margin:30px 0;
}

.info-box table{
    width:100%;
}

.info-box td{
    padding:8px 0;
    font-size:15px;
}

.login-box{
    background:#eef2ff;
    border:1px solid #c7d2fe;
    border-radius:10px;
    padding:20px;
    margin-top:25px;
}

.button{
    display:inline-block;
    margin-top:30px;
    padding:15px 34px;
    background:#7c3aed;
    color:#fff !important;
    text-decoration:none;
    border-radius:8px;
    font-weight:bold;
}

.note{
    margin-top:30px;
    background:#fff7ed;
    border-left:5px solid #f59e0b;
    padding:16px;
    border-radius:6px;
    font-size:14px;
}

.footer{
    padding:25px;
    text-align:center;
    font-size:13px;
    color:#6b7280;
    border-top:1px solid #e5e7eb;
    background:#fafafa;
}
</style>

</head>

<body>

<div class="container">

<div class="header">
<h1>🎉 Welcome to DoNow</h1>
<p>You've been invited to join <strong>${businessName}</strong></p>
</div>

<div class="content">

<h2>Hello ${name}, 👋</h2>

<p>
<strong>${adminName}</strong> has invited you to collaborate on your company's workspace in
<strong>DoNow</strong>.
</p>

<p>
You can now manage your assigned tasks, monitor progress, receive reminders, and collaborate with your team from one place.
</p>

<div class="info-box">

<table>
<tr>
<td><strong>Organization</strong></td>
<td>${businessName}</td>
</tr>

<tr>
<td><strong>Role</strong></td>
<td>${designation}</td>
</tr>

<tr>
<td><strong>Email</strong></td>
<td>${email}</td>
</tr>

<tr>
<td><strong>Password</strong></td>
<td><code>${password}</code></td>
</tr>

</table>

</div>

<div class="login-box">

<strong>Next Steps</strong>

<ul style="margin-top:12px;line-height:1.8;">
<li>Log in using your email and password.</li>
<li>Change your password after your first login.</li>
<li>Complete your profile.</li>
<li>Start managing your assigned tasks.</li>
</ul>

</div>

<div style="text-align:center">

<a
href="${frontendUrl}/login"
class="button">
Login to Your Account
</a>

</div>

<div class="note">

<strong>Security Tip</strong><br><br>

For your security, please change your password immediately after logging in for the first time. Never share your login credentials with anyone.

</div>

<p style="margin-top:35px;">
We're excited to have you on board and look forward to helping you stay organized and productive.
</p>

<p>
Regards,<br>
<strong>DoNow Team</strong>
</p>

</div>

<div class="footer">

DoNow<br><br>

This invitation was sent by <strong>${adminName}</strong> on behalf of <strong>${businessName}</strong>.

</div>

</div>

</body>
</html>
`,
    };

    emailQueue.enqueue(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendNotificationEmail = async (
  email,
  subject,
  title,
  message,
  attachments = [],
) => {
  try {

    const frontendUrl =
      process.env.FRONTEND_URL || "https://DoNow.netlify.app";

    const attachmentsHtml =
      attachments && attachments.length > 0
        ? `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; font-weight: 600; color: #1a1c21; margin-bottom: 12px;">📎 Attachments:</p>
          ${attachments
            .map(
              (file) => `
            <div style="margin-bottom: 8px;">
              <a href="${file.url}" style="font-size: 14px; color: #7c3aed; text-decoration: none;">
                📄 ${file.name || "Download Attachment"}
              </a>
            </div>
          `,
            )
            .join("")}
        </div>
      `
        : "";

    const mailOptions = {
      from: `"DoNow" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            .email-container {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              max-width: 600px;
              margin: 0 auto;
              background-color: #f9f9fb;
              padding: 40px 20px;
            }
            .logo-header {
              text-align: center;
              margin-bottom: 30px;
            }
            .logo-text {
              font-size: 20px;
              font-weight: 800;
              color: #1a1c21;
              text-align: center;
              width: 100%;
            }
            .logo-icon {
              background: linear-gradient(135deg, #7c3aed, #4f46e5);
              width: 20px;
              height: 20px;
              border-radius: 4px;
              display: inline-block;
              vertical-align: middle;
              margin-right: 6px;
            }
            .card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 32px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .title {
              font-size: 20px;
              font-weight: 600;
              color: #1a1c21;
              margin-bottom: 20px;
              text-align: center;
            }
            .content {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.6;
            }
            .footer {
              text-align: center;
              margin-top: 32px;
              font-size: 12px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="logo-header">
              <div class="logo-text">
                <span class="logo-icon"></span>
                DoNow
              </div>
            </div>
            
            <div class="card">
              <h1 class="title">${title}</h1>
              <div class="content">
                ${message}
              </div>
              ${attachmentsHtml}
            </div>
          </div>
        </body>
        </html>
      `,
    };

    emailQueue.enqueue(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
};

export default sendEmployeeEmail;
