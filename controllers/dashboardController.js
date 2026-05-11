import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

export const getAdminStats = async (req, res) => {
  try {
    const adminId = req.userId;

    // 1. Stats
    const totalEmployees = await User.countDocuments({ adminId, role: "Employee" });
    const activeTasks = await Task.countDocuments({ adminId, status: { $ne: "Completed" } });
    const completedTasks = await Task.countDocuments({ adminId, status: "Completed" });
    const reviewTasks = await Task.countDocuments({ adminId, status: "Review" });

    // 2. Weekly Productivity
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const completedCount = await Task.countDocuments({
        adminId,
        status: "Completed",
        updatedAt: { $gte: date, $lt: nextDate },
      });

      const newCount = await Task.countDocuments({
        adminId,
        createdAt: { $gte: date, $lt: nextDate },
      });

      last7Days.push({
        name: date.toLocaleDateString("en-US", { weekday: "short" }),
        completed: completedCount,
        new: newCount,
      });
    }

    // 3. Recent Activity (Notifications for the admin's workspace)
    const recentActivity = await Notification.find({ adminId })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("userId", "name avatar");


    res.status(200).json({
      status: true,
      message: "Admin dashboard stats fetched",
      data: {
        stats: [
          { label: "Total Employees", value: totalEmployees, trend: "+0%" },
          { label: "Active Tasks", value: activeTasks, trend: "+0%" },
          { label: "Completed", value: completedTasks, trend: "+0%" },
          { label: "Pending Review", value: reviewTasks, trend: "+0%" },
        ],
        chartData: last7Days,
        recentActivity: recentActivity.map((n) => ({
          id: n._id,
          user: n.userId ? n.userId.name : "System",

          avatar: n.userId?.avatar,
          title: n.title,
          message: n.message,
          time: n.createdAt,
          type: n.type,
        })),
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getEmployeeStats = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId);
    const adminId = user.adminId;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Stats
    const totalMyTasks = await Task.countDocuments({ assignees: userId });
    const pending = await Task.countDocuments({
      assignees: userId,
      status: { $ne: "Completed" },
      dueDate: { $gte: today },
    });
    const completed = await Task.countDocuments({
      assignees: userId,
      status: "Completed",
    });
    const expired = await Task.countDocuments({
      assignees: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: today },
    });

    const completionRate = totalMyTasks > 0 ? Math.round((completed / totalMyTasks) * 100) : 0;

    // 2. Upcoming Deadlines
    const upcomingTasks = await Task.find({
      assignees: userId,
      status: { $ne: "Completed" },
      dueDate: { $gte: today },
    })
      .sort({ dueDate: 1 })
      .limit(5);

    // 3. Recent Notifications
    const recentNotifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      status: true,
      message: "Employee dashboard stats fetched",
      data: {
        stats: [
          { label: "My Pending Tasks", value: pending },
          { label: "Completed Tasks", value: completed },
          { label: "Expired Tasks", value: expired },
          { label: "Completion Rate", value: `${completionRate}%` },
        ],
        upcomingTasks,
        recentNotifications,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
