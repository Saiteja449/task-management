import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
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
    const missingFields = requiredFields.filter(
      (field) => req.body[field] === undefined,
    );

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
      createdBy: req.userId,
      attachments: attachments || [],
      reminders: reminders || false,
      recurring: recurring || "None",
    });

    if (task) {
      // Notify the creator that the task was successfully created
      await createNotification({
        userId: req.userId,
        adminId,
        title: "Task Created",
        message: `Task "${title}" was successfully created. Priority: ${priority || "Medium"}.`,
        type: "task",
      });

      // Notify assignees
      if (assignees && assignees.length > 0) {
        for (const assigneeId of assignees) {
          if (assigneeId.toString() !== req.userId.toString()) {
            await createNotification({
              userId: assigneeId,
              adminId,
              title: "New Task Assigned",
              message: `You have been assigned a new task: "${title}". Priority: ${priority || "Medium"}.`,
              type: "task",
            });
          }
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
      .populate("assignees", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .lean();

    // Fetch group names for group tasks
    const groupIds = [
      ...new Set(
        tasks.filter((t) => t.groupId !== "personal").map((t) => t.groupId),
      ),
    ];
    const groups = await Group.find({ _id: { $in: groupIds } }).select("name");
    const groupMap = groups.reduce(
      (acc, g) => ({ ...acc, [g._id.toString()]: g.name }),
      {},
    );

    const tasksWithGroupInfo = tasks.map((task) => ({
      ...task,
      groupName:
        task.groupId === "personal"
          ? null
          : groupMap[task.groupId] || "Deleted Group",
    }));

    res.status(200).json({
      status: true,
      message: "Tasks fetched successfully",
      data: tasksWithGroupInfo,
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

      // Allow if user is admin of the workspace OR the one who created the task
      const isAdmin = task.adminId.toString() === adminId?.toString();
      const isCreator = task.createdBy.toString() === req.userId.toString();

      if (!isAdmin && !isCreator) {
        return res
          .status(403)
          .json({
            status: false,
            message: "Not authorized to update this task",
          });
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
          message: `The task "${task.title}" status has been updated to "${req.body.status}" by ${user.name}.`,

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

      // Allow if user is admin of the workspace OR the one who created the task
      const isAdmin = task.adminId.toString() === adminId?.toString();
      const isCreator = task.createdBy.toString() === req.userId.toString();

      if (!isAdmin && !isCreator) {
        return res
          .status(403)
          .json({
            status: false,
            message: "Not authorized to delete this task",
          });
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
          message: `${user.name} commented on "${task.title}": "${text.substring(0, 50)}..."`,
          type: "task",
        });
      }

      const updatedTask = await Task.findById(id).populate(
        "comments.userId",
        "name avatar",
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

export const getAssignedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignees: req.userId,
      groupId: { $ne: "personal" },
    })
      .populate("assignees", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .lean();

    // Fetch group names for group tasks
    const groupIds = [...new Set(tasks.map((t) => t.groupId))];
    const groups = await Group.find({ _id: { $in: groupIds } }).select("name");
    const groupMap = groups.reduce(
      (acc, g) => ({ ...acc, [g._id.toString()]: g.name }),
      {},
    );

    const tasksWithGroupInfo = tasks.map((task) => ({
      ...task,
      groupName: groupMap[task.groupId] || "Deleted Group",
    }));

    res.status(200).json({
      status: true,
      message: "Assigned tasks fetched successfully",
      data: tasksWithGroupInfo,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getTaskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await Task.findById(id)
      .populate("assignees", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .lean();

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    if (task.groupId && task.groupId !== "personal") {
      const group = await Group.findById(task.groupId).select("name");
      task.groupName = group ? group.name : "Deleted Group";
    } else {
      task.groupName = null;
    }

    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;

    if (task.adminId.toString() !== adminId.toString()) {
      const isAssignee = task.assignees.some(
        (a) => a._id.toString() === req.userId.toString(),
      );
      if (!isAssignee) {
        return res
          .status(403)
          .json({ status: false, message: "Not authorized" });
      }
    }

    res.status(200).json({
      status: true,
      message: "Task details fetched successfully",
      data: task,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;

    // Check if admin or assigned employee
    const isAssignee = task.assignees.some(
      (a) => a.toString() === req.userId.toString(),
    );
    const isAdmin = task.adminId.toString() === adminId.toString();

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ status: false, message: "Not authorized" });
    }

    const oldStatus = task.status;
    task.status = status;
    const updatedTask = await task.save();

    // Notify if status changed
    if (status !== oldStatus) {
      // Notify admin
      await createNotification({
        userId: task.adminId,
        adminId: task.adminId,
        title: "Task Status Updated",
        message: `The task "${task.title}" status has been updated to "${status}" by ${user.name}.`,
        type: "task",
      });

      // Notify other assignees
      for (const assigneeId of task.assignees) {
        if (assigneeId.toString() !== req.userId.toString()) {
          await createNotification({
            userId: assigneeId,
            adminId: task.adminId,
            title: "Task Status Updated",
            message: `The status of task "${task.title}" has been updated to "${status}".`,
            type: "task",
          });
        }
      }
    }

    res.status(200).json({
      status: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};
