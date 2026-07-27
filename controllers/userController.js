import User from "../models/userModel.js";
import generateToken from "../helpers/generateToken.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";

export const signupUser = async (req, res) => {
  try {
    const requiredFields = [
      "name",
      "email",
      "password",
      "businessName",
      "companyDetails",
      "companySize",
    ];

    const missingFields = [];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Missing fields",
        errors: missingFields,
      });
    }

    const { name, email, password, businessName, companyDetails, companySize } =
      req.body;

    const role = "Admin";

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists" });
    }

    const user = await User.create({
      name,

      email,
      password,
      role,
      businessName,
      companyDetails,
      companySize,
      permissions: {
        tasks: true,
        manageGroups: true,
      },
    });

    if (user) {
      const token = generateToken(user._id);

      // Send Welcome Email
      await sendNotificationEmail(
        user.email,
        `🎉 Welcome to DoNow!`,
        `Welcome, ${user.name}! 👋`,
        `
    <p>Hi <strong>${user.name}</strong>,</p>

    <p>We're thrilled to welcome you to <strong>DoNow</strong>!</p>

    <p>Your workspace for <strong>${user.businessName}</strong> has been successfully created and is ready to use.</p>

    <div style="background:#f8fafc;border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin:24px 0;">
      <h3 style="margin:0 0 12px;color:#111827;">🚀 What's Next?</h3>
      <ul style="padding-left:20px;margin:0;line-height:1.8;">
        <li>Create and organize your tasks.</li>
        <li>Invite employees and assign work.</li>
        <li>Track task progress in real time.</li>
        <li>Receive deadline reminders and notifications.</li>
        <li>Boost your team's productivity with centralized DoNow.</li>
      </ul>
    </div>

    <p>Click the button below to log in and start managing your team.</p>

    <div style="text-align:center;margin:32px 0;">
      <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login"
         style="background:#7c3aed;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:8px;font-size:16px;font-weight:600;display:inline-block;">
         Login to Your Workspace
      </a>
    </div>

    <p>If you have any questions or need assistance, our support team is always here to help.</p>

    <p>Thank you for choosing <strong>DoNow</strong>. We look forward to helping you and your team stay organized and productive.</p>

    <br>

    <p>Best Regards,<br>
    <strong>DoNow Team</strong></p>
  `,
      );

      res.status(201).json({
        status: true,
        message: "User registered successfully",
        token,
        role: user.role,
      });
    } else {
      res.status(400).json({ status: false, message: "Invalid user data" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const loginUser = async (req, res) => {
  try {
    const requiredFields = ["email", "password"];
    const missingFields = [];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        missingFields.push(field);
      }
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Missing fields",
        errors: missingFields,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      const token = generateToken(user._id);

      res.status(200).json({
        status: true,
        message: "Login successful",
        token,
        role: user.role,
      });
    } else {
      res
        .status(401)
        .json({ status: false, message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password").lean();

    if (user) {
      if (!user.name && (user.firstName || user.lastName)) {
        user.name = `${user.firstName || ""} ${user.lastName || ""}`.trim();
      }

      res.status(200).json({
        status: true,
        message: "User profile fetched successfully",
        data: user,
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const user = await User.findById(req.userId);

    if (user) {
      const newPassword = Math.random().toString(36).slice(-10);

      user.password = newPassword;
      await user.save();
      await sendNotificationEmail(
        user.email,
        "Your Password Has Been Reset - DoNow",
        "Password Reset Successful",
        `
        <p>Hello ${user.name},</p>

        <p>Your password has been reset as per your request. You can now log in using the following credentials:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 0;"><strong>New Password:</strong> ${newPassword}</p>
        </div>
        <p>For security reasons, we recommend that you change this password once you log in.</p>
        `,
      );

      res.status(200).json({
        status: true,
        message:
          "Password reset successfully. Please check your email for the new password.",
      });
    } else {
      res.status(404).json({ status: false, message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res
        .status(400)
        .json({ status: false, message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (user) {
      const newPassword = Math.random().toString(36).slice(-10);
      user.password = newPassword;
      await user.save();

      await sendNotificationEmail(
        user.email,
        "Password Recovery - DoNow",
        "New Password Generated",
        `
        <p>Hello ${user.name},</p>
        <p>You requested a password reset. A new password has been generated for your account:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Email:</strong> ${user.email}</p>
            <p style="margin: 0;"><strong>New Password:</strong> ${newPassword}</p>
        </div>
        <p>Please log in using these credentials and change your password immediately for security.</p>
        `,
      );

      res.status(200).json({
        status: true,
        message: "A new password has been sent to your email address.",
      });
    } else {
      res
        .status(404)
        .json({
          status: false,
          message: "No account found with this email address.",
        });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
