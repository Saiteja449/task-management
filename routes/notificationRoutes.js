import express from "express";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/get-notifications", protect, getNotifications);
router.put("/mark-read/:id", protect, markNotificationRead);
router.put("/mark-all-read", protect, markAllNotificationsRead);
router.delete("/delete-notification/:id", protect, deleteNotification);

export default router;
