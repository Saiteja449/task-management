import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import ExcelJS from "exceljs";

export const getAdminStats = async (req, res) => {
  try {
    const adminId = req.userId;

    // 1. Stats
    const totalEmployees = await User.countDocuments({
      adminId,
      role: "Employee",
    });
    const activeTasks = await Task.countDocuments({
      adminId,
      status: { $ne: "Completed" },
    });
    const completedTasks = await Task.countDocuments({
      adminId,
      status: "Completed",
    });
    const reviewTasks = await Task.countDocuments({
      adminId,
      status: "Review",
    });

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

    const completionRate =
      totalMyTasks > 0 ? Math.round((completed / totalMyTasks) * 100) : 0;

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

export const generateReport = async (req, res) => {
  try {
    const adminId = req.userId;
    const employees = await User.find({ adminId, role: "Employee" }).lean();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TaskFlow";
    workbook.lastModifiedBy = "TaskFlow";
    workbook.created = new Date();

    // 1. Summary Sheet
    const summarySheet = workbook.addWorksheet("Performance Summary");
    summarySheet.columns = [
      { header: "Employee Name", key: "name", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Total Tasks", key: "total", width: 12 },
      { header: "Completed", key: "completed", width: 12 },
      { header: "On-Time", key: "onTime", width: 12 },
      { header: "Late", key: "late", width: 12 },
      { header: "Avg Performance %", key: "performance", width: 20 },
    ];

    // Styling header
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }, // Indigo
    };
    summarySheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

    const today = new Date();

    for (const emp of employees) {
      const tasks = await Task.find({ assignees: emp._id }).lean();
      
      const total = tasks.length;
      const completedTasks = tasks.filter(t => t.status === "Completed");
      const completedCount = completedTasks.length;
      
      let onTime = 0;
      let late = 0;

      completedTasks.forEach(t => {
        if (t.dueDate && t.updatedAt) {
          if (new Date(t.updatedAt) <= new Date(t.dueDate)) {
            onTime++;
          } else {
            late++;
          }
        } else {
          onTime++; // Fallback if no dates
        }
      });

      // Performance Score: (OnTime * 100 + Late * 70) / Total
      let performance = 0;
      if (total > 0) {
        performance = Math.round(((onTime * 100) + (late * 70)) / total);
      }

      // Add to summary
      summarySheet.addRow({
        name: emp.name,
        email: emp.email,
        total,
        completed: completedCount,
        onTime,
        late,
        performance: `${performance}%`,
      });

      // 2. Individual Employee Sheet
      const empSheet = workbook.addWorksheet(emp.name.substring(0, 30)); // Max 31 chars
      empSheet.columns = [
        { header: "Task Title", key: "title", width: 30 },
        { header: "Status", key: "status", width: 15 },
        { header: "Priority", key: "priority", width: 12 },
        { header: "Due Date", key: "dueDate", width: 20 },
        { header: "Completed At", key: "completedAt", width: 20 },
        { header: "Timeliness", key: "timeliness", width: 15 },
      ];

      empSheet.getRow(1).font = { bold: true };

      tasks.forEach(t => {
        let timeliness = "N/A";
        if (t.status === "Completed") {
          if (t.dueDate && t.updatedAt) {
            timeliness = new Date(t.updatedAt) <= new Date(t.dueDate) ? "On-Time" : "Late";
          } else {
            timeliness = "On-Time";
          }
        } else if (t.dueDate && new Date(t.dueDate) < today) {
          timeliness = "Overdue";
        }

        empSheet.addRow({
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "N/A",
          completedAt: t.status === "Completed" ? new Date(t.updatedAt).toLocaleDateString() : "N/A",
          timeliness,
        });
      });
    }

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=" + `Employee_Performance_Report_${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.status(200).end();
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
