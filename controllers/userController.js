import User from "../models/userModel.js";
import generateToken from "../helpers/generateToken.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";

export const signupUser = async (req, res) => {
  try {
    const requiredFields = [
      "firstName",
      "lastName",
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

    const {
      firstName,
      lastName,
      email,
      password,
      businessName,
      companyDetails,
      companySize,
    } = req.body;

    const role = "Admin";

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res
        .status(400)
        .json({ status: false, message: "User already exists" });
    }

    const user = await User.create({
      firstName,
      lastName,
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
        "Welcome to TaskFlow!",
        `Welcome to TaskFlow, ${user.firstName}!`,
        `<p>We're excited to have you on board. Your account for <strong>${user.businessName}</strong> has been successfully created.</p>
         <p>You can now start managing your tasks and employees.</p>`,
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
    const user = await User.findById(req.userId).select("-password");

    if (user) {
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
        "Your Password Has Been Reset - TaskFlow",
        "Password Reset Successful",
        `
        <p>Hello ${user.firstName},</p>
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
