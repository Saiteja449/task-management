import { sendNotificationEmail } from "./emailHelper.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";

/**
 * Create a notification and optionally send an email.
 * @param {Object} params
 * @param {string} params.userId - Recipient User ID
 * @param {string} params.adminId - Workspace Admin ID
 * @param {string} params.title - Notification Title
 * @param {string} params.message - Notification Message
 * @param {string} params.type - Notification Type (task, group, system)
 * @param {boolean} params.sendEmail - Whether to send an email notification
 */
export const createNotification = async ({
  userId,
  adminId,
  title,
  message,
  type = "task",
  sendEmail = true,
}) => {
  try {
    // 1. Create in-app notification
    await Notification.create({
      userId,
      adminId,
      title,
      message,
      type,
    });

    // 2. Send email notification if requested
    if (sendEmail) {
      const user = await User.findById(userId);
      if (user && user.email) {
        await sendNotificationEmail(user.email, title, title, message);
      }
    }
  } catch (error) {
    console.error("Error in createNotification helper:", error);
  }
};

/**
 * Notify multiple users (e.g., all members of a group)
 */
export const notifyMultipleUsers = async ({
  userIds,
  adminId,
  title,
  message,
  type = "task",
  sendEmail = true,
}) => {
  try {
    const promises = userIds.map((userId) =>
      createNotification({ userId, adminId, title, message, type, sendEmail })
    );
    await Promise.all(promises);
  } catch (error) {
    console.error("Error in notifyMultipleUsers helper:", error);
  }
};
