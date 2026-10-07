import { emailQueue } from "./emailQueue.js";
import {
  generateEmployeeInviteEmailTemplate,
  generateGeneralEmailTemplate,
} from "./emailTemplates.js";

const sendEmployeeEmail = async (
  email,
  password,
  name,
  adminName = "Administrator",
  businessName = "Your Organization",
  designation = "Employee",
) => {
  try {
    const html = generateEmployeeInviteEmailTemplate({
      name,
      adminName,
      businessName,
      designation,
      email,
      password,
    });

    const mailOptions = {
      from: `"DoNow Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `Join the ${businessName} team on DoNow`,
      html,
    };

    emailQueue.enqueue(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending employee invitation email:", error);
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
    const trimmed = (message || "").trim();
    const isFullHtml =
      trimmed.startsWith("<!DOCTYPE html>") || trimmed.startsWith("<html");

    const html = isFullHtml
      ? message
      : generateGeneralEmailTemplate({
          headline: title,
          message: message || title,
        });

    const mailOptions = {
      from: `"DoNow" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject || title,
      html,
    };

    emailQueue.enqueue(mailOptions);
    return true;
  } catch (error) {
    console.error("Error sending notification email:", error);
    return false;
  }
};

export default sendEmployeeEmail;
