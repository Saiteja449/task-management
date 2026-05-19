import nodemailer from "nodemailer";

const sendEmployeeEmail = async (email, password, name, adminName = "Admin", businessName = "the") => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const initials = adminName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const frontendUrl = process.env.FRONTEND_URL || "https://task-management-infasta.netlify.app";

    const mailOptions = {
      from: `"Task-Management-Infasta Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Join the ${businessName} team on Task-Management-Infasta`,
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
              margin-bottom: 40px;
              width: 100%;
            }
            .logo-text {
              font-size: 24px;
              font-weight: 800;
              color: #1a1c21;
              text-align: center;
              width: 100%;
            }
            .logo-icon {
              background: linear-gradient(135deg, #7c3aed, #4f46e5);
              width: 24px;
              height: 24px;
              border-radius: 6px;
              display: inline-block;
              vertical-align: middle;
              margin-right: 8px;
            }
            .title {
              text-align: center;
              font-size: 24px;
              font-weight: 600;
              color: #1a1c21;
              margin-bottom: 40px;
              line-height: 1.3;
            }
            .card {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 12px;
              padding: 40px;
              text-align: center;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            }
            .avatar-container {
              text-align: center;
              width: 100%;
              margin-top: -72px;
              margin-bottom: 24px;
            }
            .avatar {
              background-color: #ff3b6b;
              color: white;
              width: 64px;
              height: 64px;
              border-radius: 32px;
              display: inline-block;
              line-height: 64px;
              font-size: 24px;
              font-weight: 700;
              border: 4px solid #ffffff;
              text-align: center;
            }
            .invite-text {
              font-size: 20px;
              color: #1a1c21;
              margin-bottom: 24px;
              font-weight: 500;
              text-align: center;
            }
            .description {
              font-size: 16px;
              color: #4b5563;
              line-height: 1.6;
              margin-bottom: 32px;
              text-align: center;
            }
            .button-container {
              text-align: center;
              width: 100%;
            }
            .button {
              display: inline-block;
              background-color: #7c3aed;
              color: #ffffff !important;
              padding: 16px 32px;
              border-radius: 8px;
              font-size: 18px;
              font-weight: 600;
              text-decoration: none;
            }
            .credentials-box {
              background-color: #f3f4f6;
              padding: 16px;
              border-radius: 8px;
              margin: 24px 0;
              text-align: left;
              font-size: 14px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 12px;
              color: #9ca3af;
              border-top: 1px solid #e5e7eb;
              padding-top: 24px;
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="logo-header">
              <div class="logo-text">
                <span class="logo-icon"></span>
                Task-Management-Infasta
              </div>
            </div>
            
            <h1 class="title">Join the ${businessName} Task-Management-Infasta team?</h1>
            
            <div class="card">
              <div class="avatar-container">
                <div class="avatar">${initials}</div>
              </div>
              <div class="invite-text">${adminName} invited you</div>
              <p class="description">
                Task-Management-Infasta is one app to replace them all - tasks, docs, and team collaboration. 
                A new way to work with your team more efficiently.
              </p>
              
              <div class="credentials-box">
                <p style="margin: 0 0 8px 0;"><strong>Welcome, ${name}!</strong></p>
                <p style="margin: 0 0 4px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
              </div>

              <div class="button-container">
                <a href="${frontendUrl}/login" class="button">Accept Invite</a>
              </div>
            </div>
            
            <div class="footer">
              Questions? 24/7 Support: (888) 123-4567 | <a href="mailto:support@task-management-infasta.com" style="color: #9ca3af;">help@task-management-infasta.com</a> | <a href="${frontendUrl}" style="color: #9ca3af;">Get a demo</a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent: %s", info.messageId);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

export const sendNotificationEmail = async (email, subject, title, message, attachments = []) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const attachmentsHtml = attachments && attachments.length > 0 
      ? `
        <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 14px; font-weight: 600; color: #1a1c21; margin-bottom: 12px;">📎 Attachments:</p>
          ${attachments.map(file => `
            <div style="margin-bottom: 8px;">
              <a href="${file.url}" style="font-size: 14px; color: #7c3aed; text-decoration: none;">
                📄 ${file.name || "Download Attachment"}
              </a>
            </div>
          `).join('')}
        </div>
      ` : '';

    const mailOptions = {
      from: `"Task-Management-Infasta" <${process.env.SMTP_USER}>`,
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
                Task-Management-Infasta
              </div>
            </div>
            
            <div class="card">
              <h1 class="title">${title}</h1>
              <div class="content">
                ${message}
              </div>
              ${attachmentsHtml}
            </div>
            
            <div class="footer">
              This is an automated message from Task-Management-Infasta. Please do not reply.<br>
              <a href="${frontendUrl}" style="color: #9ca3af; text-decoration: underline;">Visit Workspace</a>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
};

export default sendEmployeeEmail;
