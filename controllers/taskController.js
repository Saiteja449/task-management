import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import { createNotification } from "../helpers/notificationHelper.js";

export const createTask = async (req, res) => {
  try {
    const requiredFields = [
      "title",
      "groupId",
      "description",
      "status",
      "priority",
      "dueDate",
      "assignees",
      "attachments",
      "reminders",
      "recurring",
    ];
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      assignees,
      groupId,
      attachments,
      reminders,
      recurring,
    } = req.body;
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Missing fields",
        errors: missingFields,
      });
    }

    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;

    const task = await Task.create({
      title,
      description,
      status: status || "Pending",
      priority: priority || "Medium",
      dueDate,
      assignees: assignees || [],
      groupId: groupId || "personal",
      adminId,
      attachments: attachments || [],
      reminders: reminders || false,
      recurring: recurring || "None",
    });

    if (task) {
      // Notify assignees
      if (assignees && assignees.length > 0) {
        for (const assigneeId of assignees) {
          await createNotification({
            userId: assigneeId,
            adminId,
            title: "New Task Assigned",
            message: `You have been assigned a new task: "${title}". Priority: ${priority || "Medium"}.`,
            type: "task",
          });
        }
      }

      res.status(201).json({
        status: true,
        message: "Task created successfully",
        data: task,
      });
    } else {
      res.status(400).json({ status: false, message: "Invalid task data" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getTasks = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;

    const tasks = await Task.find({ adminId })
      .populate("assignees", "firstName lastName email role avatar")
      .populate("comments.userId", "firstName lastName avatar");

    res.status(200).json({
      status: true,
      message: "Tasks fetched successfully",
      data: tasks,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (task) {
      const user = await User.findById(req.userId);
      const adminId = user.role === "Admin" ? user._id : user.adminId;

      if (task.adminId.toString() !== adminId.toString()) {
        return res
          .status(403)
          .json({ status: false, message: "Not authorized" });
      }

      const oldStatus = task.status;
      Object.assign(task, req.body);
      const updatedTask = await task.save();

      // Notify if status changed
      if (req.body.status && req.body.status !== oldStatus) {
        // Notify admin
        await createNotification({
          userId: adminId,
          adminId,
          title: "Task Status Updated",
          message: `The task "${task.title}" status has been updated to "${req.body.status}" by ${user.firstName}.`,
          type: "task",
        });

        // Notify assignees
        for (const assigneeId of task.assignees) {
          await createNotification({
            userId: assigneeId,
            adminId,
            title: "Task Status Updated",
            message: `Your task "${task.title}" status has been updated to "${req.body.status}".`,
            type: "task",
          });
        }
      } else {
        // Notify general update
        for (const assigneeId of task.assignees) {
          await createNotification({
            userId: assigneeId,
            adminId,
            title: "Task Updated",
            message: `The task "${task.title}" has been updated. Please check for details.`,
            type: "task",
          });
        }
      }

      res.status(200).json({
        status: true,
        message: "Task updated successfully",
        data: updatedTask,
      });
    } else {
      res.status(404).json({ status: false, message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id);

    if (task) {
      const user = await User.findById(req.userId);
      const adminId = user.role === "Admin" ? user._id : user.adminId;

      if (task.adminId.toString() !== adminId.toString()) {
        return res
          .status(403)
          .json({ status: false, message: "Not authorized" });
      }

      const title = task.title;
      const assignees = task.assignees;
      const adminIdValue = task.adminId;

      await Task.findByIdAndDelete(id);

      // Notify assignees about deletion
      for (const assigneeId of assignees) {
        await createNotification({
          userId: assigneeId,
          adminId: adminIdValue,
          title: "Task Deleted",
          message: `The task "${title}" has been deleted.`,
          type: "task",
        });
      }

      res.status(200).json({
        status: true,
        message: "Task deleted successfully",
      });
    } else {
      res.status(404).json({ status: false, message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ status: false, message: "Comment text is required" });
    }

    const task = await Task.findById(id);

    if (task) {
      task.comments.push({
        userId: req.userId,
        text,
      });

      await task.save();

      // Notify about comment
      const user = await User.findById(req.userId);
      const adminId = user.role === "Admin" ? user._id : user.adminId;

      // If employee commented, notify Admin
      if (user.role === "Employee") {
        await createNotification({
          userId: adminId,
          adminId,
          title: "New Comment on Task",
          message: `${user.firstName} commented on "${task.title}": "${text.substring(0, 50)}..."`,
          type: "task",
        });
      }

      const updatedTask = await Task.findById(id).populate(
        "comments.userId",
        "firstName lastName avatar",
      );

      res.status(201).json({
        status: true,
        message: "Comment added successfully",
        data: updatedTask.comments[updatedTask.comments.length - 1],
      });
    } else {
      res.status(404).json({ status: false, message: "Task not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
