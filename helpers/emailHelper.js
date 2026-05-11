import nodemailer from "nodemailer";

const sendEmployeeEmail = async (email, password, name) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"TaskFlow Admin" <${process.env.SMTP_USER}>`,
      to: email,
      subject: "Your Account Credentials - TaskFlow",
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">Welcome to TaskFlow, ${name}!</h2>
                    <p>Hello,</p>
                    <p>Your account has been created by the administrator. You can now log in using the following credentials:</p>
                    <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
                        <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
                    </div>
                    <p>Please log in and change your password as soon as possible for security reasons.</p>
                    <p style="text-align: center; margin-top: 30px;">
                        <a href="${process.env.FRONTEND_URL || "http://localhost:3000"}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Login to Your Account</a>
                    </p>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated message, please do not reply to this email.</p>
                </div>
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

export const sendNotificationEmail = async (email, subject, title, message) => {
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

    const mailOptions = {
      from: `"TaskFlow" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #4f46e5; text-align: center;">${title}</h2>
                    <div style="padding: 20px; color: #374151; line-height: 1.6;">
                        ${message}
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="font-size: 12px; color: #6b7280; text-align: center;">This is an automated message from TaskFlow. Please do not reply.</p>
                </div>
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
