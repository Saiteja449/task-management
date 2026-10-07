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
 * @param {string} params.emailMessage - HTML Email Message (optional, defaults to message)
 * @param {string} params.type - Notification Type (task, group, system)
 * @param {boolean} params.sendEmail - Whether to send an email notification
 */
export const createNotification = async ({
  userId,
  adminId,
  title,
  message,
  emailMessage,
  type = "task",
  sendEmail = true,
  attachments = [],
}) => {
  try {
    // 1. Create in-app notification
    const notification = await Notification.create({
      userId,
      adminId,
      title,
      message,
      type,
    });

    // 2. Send email notification asynchronously in the background via queue
    if (sendEmail) {
      User.findById(userId)
        .select("email")
        .then((user) => {
          if (user && user.email) {
            sendNotificationEmail(user.email, title, title, emailMessage || message, attachments);
          }
        })
        .catch((error) => {
          console.error("Error finding user for email notification:", error);
        });
    }

    return notification;
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
  emailMessage,
  type = "task",
  sendEmail = true,
  attachments = [],
}) => {
  try {
    if (!userIds || userIds.length === 0) return;

    // 1. Batch create in-app notifications
    const notifications = userIds.map((userId) => ({
      userId,
      adminId,
      title,
      message,
      type,
    }));
    await Notification.insertMany(notifications, { ordered: false });

    // 2. Send email notifications asynchronously in the background via queue
    if (sendEmail) {
      User.find({ _id: { $in: userIds } })
        .select("email")
        .then((users) => {
          users.forEach((user) => {
            if (user && user.email) {
              sendNotificationEmail(user.email, title, title, emailMessage || message, attachments);
            }
          });
        })
        .catch((error) => {
          console.error("Error finding users for bulk email notification:", error);
        });
    }
  } catch (error) {
    console.error("Error in notifyMultipleUsers helper:", error);
  }
};
