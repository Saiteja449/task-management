import Notification from "../models/notificationModel.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      status: true,
      message: "Notifications fetched successfully",
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: req.userId },
      { isRead: true },
      { new: true }
    );

    if (notification) {
      res.status(200).json({
        status: true,
        message: "Notification marked as read",
        data: notification,
      });
    } else {
      res.status(404).json({ status: false, message: "Notification not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.userId, isRead: false },
      { isRead: true }
    );

    res.status(200).json({
      status: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
