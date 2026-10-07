import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
import { createNotification } from "../helpers/notificationHelper.js";
import { uploadMultipleToCloudinary } from "../helpers/uploadHelper.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";
import {
  generateTaskEmailTemplate,
  generateGeneralEmailTemplate,
  getTaskUrl,
} from "../helpers/emailTemplates.js";

export const createTask = async (req, res) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      dueDate,
      groupId,
      reminders,
      recurring,
      taskType,
      section,
      responsiblePerson,
    } = req.body;

    // Parse assignees - comes as JSON string from FormData
    let assignees = [];
    if (req.body.assignees) {
      try {
        assignees = JSON.parse(req.body.assignees);
      } catch {
        assignees = Array.isArray(req.body.assignees)
          ? req.body.assignees
          : [req.body.assignees];
      }
    }

    if (!title || !dueDate) {
      return res.status(400).json({
        status: false,
        message: "Title and due date are required",
      });
    }

    // Upload files to Cloudinary if any
    let attachmentUrls = [];
    if (req.files && req.files.length > 0) {
      attachmentUrls = await uploadMultipleToCloudinary(req.files);
    }

    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;
    const normalizedGroupId = groupId || "personal";
    const normalizedTaskType =
      taskType || (normalizedGroupId === "personal" ? "personal" : "group");

    if (normalizedTaskType !== "personal" && user.role !== "Admin") {
      if (normalizedTaskType === "group") {
        // Employee can create group task if they are part of the group
        const groupCheck = await Group.findOne({
          _id: normalizedGroupId,
          members: user._id,
        });
        if (!groupCheck) {
          return res.status(403).json({
            status: false,
            message: "You are not a member of this group",
          });
        }
      } else {
        return res.status(403).json({
          status: false,
          message: "Only admins can assign tasks to employees or groups",
        });
      }
    }

    let resolvedAssignees = assignees;

    if (normalizedTaskType === "personal") {
      resolvedAssignees = [req.userId];
    }

    if (normalizedTaskType === "employee") {
      if (!assignees.length) {
        return res.status(400).json({
          status: false,
          message: "Please select an employee for this task",
        });
      }

      const employees = await User.find({
        _id: { $in: assignees },
        adminId,
        role: "Employee",
      }).select("_id");

      if (employees.length !== assignees.length) {
        return res.status(400).json({
          status: false,
          message: "One or more selected employees are invalid",
        });
      }

      resolvedAssignees = employees.map((employee) => employee._id);
    }

    let taskAdminId = adminId;

    if (normalizedTaskType === "group") {
      const group = await Group.findById(normalizedGroupId).select(
        "members admin sections",
      );

      if (!group) {
        return res.status(404).json({
          status: false,
          message: "Group not found",
        });
      }

      taskAdminId = group.admin;

      // Assign to all group members and the admin
      resolvedAssignees = [
        ...group.members.map((id) => id.toString()),
        group.admin.toString(),
      ];
      // Ensure unique assignees
      resolvedAssignees = [...new Set(resolvedAssignees)];

      // Handle subgroup/section logic
      if (section && section.trim() !== "") {
        const sectionName = section.trim();
        // If the section is not already in the group's sections array, add it
        if (!group.sections || !group.sections.includes(sectionName)) {
          await Group.findByIdAndUpdate(normalizedGroupId, {
            $addToSet: { sections: sectionName },
          });
        }
      }
    }

    const task = await Task.create({
      title,
      description: description || "",
      status: status || "Pending",
      priority: priority || "Medium",
      dueDate,
      assignees: resolvedAssignees,
      taskType: normalizedTaskType,
      groupId: normalizedTaskType === "group" ? normalizedGroupId : "personal",
      section: section ? section.trim() : "General",
      responsiblePerson: responsiblePerson || null,
      adminId: taskAdminId,
      createdBy: req.userId,
      attachments: attachmentUrls,
      reminders: reminders === "true" || reminders === true,
      recurring: recurring || "None",
    });

    if (task) {
      // Respond immediately to the client to eliminate latency and avoid "Processing" stalls
      res.status(201).json({
        status: true,
        message: "Task created successfully",
        data: task,
      });

      // Dispatch notifications and emails in background
      setImmediate(async () => {
        try {
          // Notify the creator that the task was successfully created
          const creatorEmailHtml = generateTaskEmailTemplate({
            badge: "TASK CREATED",
            badgeType: "emerald",
            headline: "Task Created Successfully",
            subheadline: `Your task "${title}" was created in DoNow.`,
            task,
            taskId: task._id,
            actionText: "View Task in DoNow →",
            attachments: task.attachments,
          });

          await createNotification({
            userId: req.userId,
            adminId: taskAdminId,
            title: "✅ Task Created Successfully",
            message: `Task "${title}" was successfully created. Priority: ${priority || "Medium"}.`,
            emailMessage: creatorEmailHtml,
            type: "task",
          });

          // Notify assignees
          if (resolvedAssignees && resolvedAssignees.length > 0) {
            const creatorUser = await User.findById(req.userId).select("name");
            const creatorName = creatorUser ? creatorUser.name : "Team Member";

            const assigneeEmailHtml = generateTaskEmailTemplate({
              badge: "NEW TASK ASSIGNED",
              badgeType: "indigo",
              headline: "You have been assigned a new task",
              subheadline: `${creatorName} assigned a new task to you.`,
              task,
              taskId: task._id,
              creatorName,
              actionText: "Open Task in DoNow →",
              attachments: task.attachments,
            });

            for (const assigneeId of resolvedAssignees) {
              if (assigneeId.toString() !== req.userId.toString()) {
                await createNotification({
                  userId: assigneeId,
                  adminId: taskAdminId,
                  title: "New Task Assigned",
                  message: `You have been assigned a new task: "${title}". Priority: ${priority || "Medium"}.`,
                  emailMessage: assigneeEmailHtml,
                  type: "task",
                  attachments: task.attachments,
                });
              }
            }
          }
        } catch (notifErr) {
          console.error(
            "Background notification error in createTask:",
            notifErr,
          );
        }
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
    const query =
      user.role === "Admin"
        ? {
            adminId,
            $or: [
              { taskType: { $in: ["employee", "group"] } },
              { groupId: { $ne: "personal" } },
              { createdBy: req.userId },
            ],
          }
        : {
            createdBy: req.userId,
            groupId: "personal",
          };

    const tasks = await Task.find(query)
      .populate("assignees", "name email role avatar")
      .populate("responsiblePerson", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .populate("createdBy", "name email avatar")
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
      const isPrivatePersonalTask =
        task.groupId === "personal" &&
        (task.taskType === "personal" || !task.taskType) &&
        task.createdBy.toString() !== req.userId.toString();
      const isAdmin =
        user.role === "Admin" &&
        task.adminId.toString() === user._id.toString() &&
        !isPrivatePersonalTask;
      const isCreator = task.createdBy.toString() === req.userId.toString();

      if (!isAdmin && !isCreator) {
        return res.status(403).json({
          status: false,
          message: "Not authorized to update this task",
        });
      }

      // Handle files upload
      let attachmentUrls = [];
      if (req.files && req.files.length > 0) {
        attachmentUrls = await uploadMultipleToCloudinary(req.files);
      }

      // Parse assignees if sent as a string
      let parsedAssignees = req.body.assignees;
      if (parsedAssignees && typeof parsedAssignees === "string") {
        try {
          parsedAssignees = JSON.parse(parsedAssignees);
        } catch {
          parsedAssignees = [parsedAssignees];
        }
      }
      if (parsedAssignees) {
        req.body.assignees = parsedAssignees;
      }

      // Automatically handle group and section logic if provided
      if (
        req.body.taskType === "group" &&
        req.body.groupId &&
        req.body.groupId !== "personal"
      ) {
        const group = await Group.findById(req.body.groupId);
        if (group) {
          req.body.adminId = group.admin;
          // Ensure assignees are all group members + admin
          req.body.assignees = [
            ...new Set([
              ...group.members.map((id) => id.toString()),
              group.admin.toString(),
            ]),
          ];

          if (req.body.section && req.body.section.trim() !== "") {
            const sectionName = req.body.section.trim();
            if (!group.sections || !group.sections.includes(sectionName)) {
              await Group.findByIdAndUpdate(req.body.groupId, {
                $addToSet: { sections: sectionName },
              });
            }
          }
        }
      } else if (req.body.taskType === "personal") {
        req.body.assignees = [req.userId];
        req.body.groupId = "personal";
      } else if (req.body.taskType === "employee") {
        req.body.groupId = "personal";
      }

      const oldStatus = task.status;
      Object.assign(task, req.body);

      if (attachmentUrls.length > 0) {
        task.attachments = [...(task.attachments || []), ...attachmentUrls];
      }

      const updatedTask = await task.save();

      // Send response immediately to avoid UI stalls and waiting on notifications
      res.status(200).json({
        status: true,
        message: "Task updated successfully",
        data: updatedTask,
      });

      // Dispatch notifications and emails in background
      setImmediate(async () => {
        try {
          const isPersonalTask =
            task.taskType === "personal" ||
            (!task.taskType && task.groupId === "personal");

          // Notify if status changed
          if (req.body.status && req.body.status !== oldStatus) {
            const isCompleted = req.body.status === "Completed";
            const emailHtml = generateTaskEmailTemplate({
              badge: isCompleted ? "TASK COMPLETED" : "STATUS UPDATED",
              badgeType: isCompleted ? "emerald" : "sky",
              headline: `Task status updated to "${req.body.status}"`,
              subheadline: `Updated by ${user.name}`,
              task: updatedTask,
              taskId: task._id,
              actionText: "Open Task in DoNow →",
            });

            if (isPersonalTask) {
              await createNotification({
                userId: req.userId,
                adminId,
                title: "Personal Task Status Updated",
                message: `Your personal task "${task.title}" status has been updated to "${req.body.status}".`,
                emailMessage: emailHtml,
                type: "task",
              });
            } else {
              // Notify admin
              if (adminId.toString() !== req.userId.toString()) {
                await createNotification({
                  userId: adminId,
                  adminId,
                  title: "Task Status Updated",
                  message: `The task "${task.title}" status has been updated to "${req.body.status}" by ${user.name}.`,
                  emailMessage: emailHtml,
                  type: "task",
                });
              }

              // Notify assignees
              for (const assigneeId of task.assignees) {
                if (assigneeId.toString() !== req.userId.toString()) {
                  await createNotification({
                    userId: assigneeId,
                    adminId,
                    title: "Task Status Updated",
                    message: `The status of task "${task.title}" has been updated to "${req.body.status}".`,
                    emailMessage: emailHtml,
                    type: "task",
                  });
                }
              }
            }
          } else {
            // General update
            const emailHtml = generateTaskEmailTemplate({
              badge: "TASK UPDATED",
              badgeType: "sky",
              headline: `Task "${task.title}" has been updated`,
              subheadline: `Updated by ${user.name}`,
              task: updatedTask,
              taskId: task._id,
              actionText: "Open Task in DoNow →",
              attachments: updatedTask.attachments,
            });

            if (isPersonalTask) {
              await createNotification({
                userId: req.userId,
                adminId,
                title: "Personal Task Updated",
                message: `Your personal task "${task.title}" has been updated.`,
                emailMessage: emailHtml,
                type: "task",
              });
            } else {
              for (const assigneeId of task.assignees) {
                if (assigneeId.toString() !== req.userId.toString()) {
                  await createNotification({
                    userId: assigneeId,
                    adminId,
                    title: "Task Updated",
                    message: `The task "${task.title}" has been updated by ${user.name}.`,
                    emailMessage: emailHtml,
                    type: "task",
                  });
                }
              }
            }
          }
        } catch (notifErr) {
          console.error(
            "Background notification error in updateTask:",
            notifErr,
          );
        }
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

      // Only the person who created this task can delete it
      const isCreator = task.createdBy.toString() === req.userId.toString();

      if (!isCreator) {
        return res.status(403).json({
          status: false,
          message:
            "Not authorized: Only the person who created this task can delete it",
        });
      }

      const title = task.title;
      const assignees = task.assignees;
      const adminIdValue = task.adminId;

      await Task.findByIdAndDelete(id);

      res.status(200).json({
        status: true,
        message: "Task deleted successfully",
      });

      // Notify assignees about deletion in background
      setImmediate(async () => {
        try {
          for (const assigneeId of assignees) {
            await createNotification({
              userId: assigneeId,
              adminId: adminIdValue,
              title: "Task Deleted",
              message: `The task "${title}" has been deleted.`,
              emailMessage: generateGeneralEmailTemplate({
                badge: "TASK DELETED",
                badgeType: "rose",
                headline: `Task "${title}" has been deleted`,
                message: `<p style="margin: 0 0 10px 0;">The task <strong>"${title}"</strong> was deleted by <strong>${user.name}</strong>.</p><p style="margin: 0; color: #64748b;">If you have any questions, please contact your workspace administrator.</p>`,
                actionText: "Go to Dashboard →",
              }),
              type: "task",
            });
          }
        } catch (notifErr) {
          console.error(
            "Background notification error in deleteTask:",
            notifErr,
          );
        }
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
      const user = await User.findById(req.userId);
      const adminId = user.role === "Admin" ? user._id : user.adminId;
      const isPrivatePersonalTask =
        task.groupId === "personal" &&
        (task.taskType === "personal" || !task.taskType) &&
        task.createdBy.toString() !== req.userId.toString();
      const isWorkspaceAdmin =
        user.role === "Admin" &&
        task.adminId.toString() === user._id.toString() &&
        !isPrivatePersonalTask;
      const isAssignee = task.assignees.some(
        (assigneeId) => assigneeId.toString() === req.userId.toString(),
      );
      const isCreator = task.createdBy.toString() === req.userId.toString();

      let isGroupMember = false;
      if (task.groupId && task.groupId !== "personal") {
        const group = await Group.findById(task.groupId).select("members");
        if (
          group &&
          group.members &&
          group.members.some((m) => m.toString() === req.userId.toString())
        ) {
          isGroupMember = true;
        }
      }

      if (!isWorkspaceAdmin && !isAssignee && !isCreator && !isGroupMember) {
        return res
          .status(403)
          .json({ status: false, message: "Not authorized" });
      }

      task.comments.push({
        userId: req.userId,
        text,
      });

      await task.save();

      const updatedTask = await Task.findById(id).populate(
        "comments.userId",
        "name avatar",
      );

      res.status(201).json({
        status: true,
        message: "Comment added successfully",
        data: updatedTask.comments[updatedTask.comments.length - 1],
      });

      // Notify about comment in background
      if (user.role === "Employee") {
        setImmediate(async () => {
          try {
            await createNotification({
              userId: adminId,
              adminId,
              title: "New Comment on Task",
              message: `${user.name} commented on "${task.title}": "${text.substring(0, 50)}..."`,
              emailMessage: generateTaskEmailTemplate({
                badge: "NEW COMMENT",
                badgeType: "violet",
                headline: `New comment on "${task.title}"`,
                subheadline: `${user.name} commented on the task.`,
                task,
                taskId: task._id,
                customMessage: `<strong>${user.name} wrote:</strong><br/><em style="color:#475569;">"${text}"</em>`,
                actionText: "View Discussion & Reply →",
              }),
              type: "task",
            });
          } catch (notifErr) {
            console.error(
              "Background notification error in addComment:",
              notifErr,
            );
          }
        });
      }
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
      $or: [
        {
          taskType: "employee",
        },
        {
          // Legacy direct assignments created before taskType existed.
          taskType: { $exists: false },
          groupId: "personal",
          createdBy: { $ne: req.userId },
        },
      ],
    })
      .populate("assignees", "name email role avatar")
      .populate("responsiblePerson", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .populate("createdBy", "name email avatar")
      .lean();

    // Fetch group names for group tasks
    const groupIds = [
      ...new Set(
        tasks
          .filter((task) => task.groupId && task.groupId !== "personal")
          .map((task) => task.groupId),
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
      message: "Assigned tasks fetched successfully",
      data: tasksWithGroupInfo,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getGroupAssignedTasks = async (req, res) => {
  try {
    const tasks = await Task.find({
      assignees: req.userId,
      $or: [
        { taskType: "group" },
        {
          // Legacy group assignments created before taskType existed.
          taskType: { $exists: false },
          groupId: { $ne: "personal" },
        },
      ],
    })
      .populate("assignees", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .populate("createdBy", "name email avatar")
      .lean();

    const groupIds = [
      ...new Set(
        tasks
          .filter((task) => task.groupId && task.groupId !== "personal")
          .map((task) => task.groupId),
      ),
    ];
    const groups = await Group.find({ _id: { $in: groupIds } }).select("name");
    const groupMap = groups.reduce(
      (acc, group) => ({ ...acc, [group._id.toString()]: group.name }),
      {},
    );

    const tasksWithGroupInfo = tasks.map((task) => ({
      ...task,
      groupName: groupMap[task.groupId] || "Deleted Group",
    }));

    res.status(200).json({
      status: true,
      message: "Group tasks fetched successfully",
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
      .populate("responsiblePerson", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .populate("createdBy", "name avatar")
      .lean();

    if (!task) {
      return res.status(404).json({ status: false, message: "Task not found" });
    }

    let isGroupMember = false;

    if (task.groupId && task.groupId !== "personal") {
      const group = await Group.findById(task.groupId).select("name members");
      task.groupName = group ? group.name : "Deleted Group";
      if (
        group &&
        group.members &&
        group.members.some((m) => m.toString() === req.userId.toString())
      ) {
        isGroupMember = true;
      }
    } else {
      task.groupName = null;
    }

    const user = await User.findById(req.userId);
    const isPrivatePersonalTask =
      task.groupId === "personal" &&
      (task.taskType === "personal" || !task.taskType) &&
      task.createdBy.toString() !== req.userId.toString();
    const isWorkspaceAdmin =
      user.role === "Admin" &&
      task.adminId.toString() === user._id.toString() &&
      !isPrivatePersonalTask;
    const isCreator = task.createdBy.toString() === req.userId.toString();
    const isAssignee = task.assignees.some(
      (a) => a && a._id && a._id.toString() === req.userId.toString(),
    );

    if (!isWorkspaceAdmin && !isCreator && !isAssignee && !isGroupMember) {
      return res.status(403).json({ status: false, message: "Not authorized" });
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
    // Check if admin or assigned employee
    const isAssignee = task.assignees.some(
      (a) => a.toString() === req.userId.toString(),
    );
    const isPrivatePersonalTask =
      task.groupId === "personal" &&
      (task.taskType === "personal" || !task.taskType) &&
      task.createdBy.toString() !== req.userId.toString();
    const isAdmin =
      user.role === "Admin" &&
      task.adminId.toString() === user._id.toString() &&
      !isPrivatePersonalTask;

    let isGroupMember = false;
    if (task.groupId && task.groupId !== "personal") {
      const group = await Group.findById(task.groupId).select("members");
      if (
        group &&
        group.members &&
        group.members.some((m) => m.toString() === req.userId.toString())
      ) {
        isGroupMember = true;
      }
    }

    if (!isAdmin && !isAssignee && !isGroupMember) {
      return res.status(403).json({ status: false, message: "Not authorized" });
    }

    const oldStatus = task.status;
    task.status = status;
    const updatedTask = await task.save();

    // Send response immediately to avoid UI stalls and waiting on notifications
    res.status(200).json({
      status: true,
      message: "Task status updated successfully",
      data: updatedTask,
    });

    // Dispatch notifications and emails in background
    setImmediate(async () => {
      try {
        const isPersonalTask =
          task.taskType === "personal" ||
          (!task.taskType && task.groupId === "personal");

        // Notify if status changed
        if (status !== oldStatus) {
          const isCompleted = status === "Completed";
          const emailHtml = generateTaskEmailTemplate({
            badge: isCompleted ? "TASK COMPLETED" : "STATUS UPDATED",
            badgeType: isCompleted ? "emerald" : "sky",
            headline: `Task status updated to "${status}"`,
            subheadline: `Updated by ${user.name}`,
            task: updatedTask,
            taskId: task._id,
            actionText: "Open Task in DoNow →",
          });

          if (isPersonalTask) {
            await createNotification({
              userId: req.userId,
              adminId: task.adminId,
              title: "Personal Task Status Updated",
              message: `Your personal task "${task.title}" status has been updated to "${status}".`,
              emailMessage: emailHtml,
              type: "task",
            });
          } else {
            // Notify admin
            if (task.adminId.toString() !== req.userId.toString()) {
              await createNotification({
                userId: task.adminId,
                adminId: task.adminId,
                title: "Task Status Updated",
                message: `The task "${task.title}" status has been updated to "${status}" by ${user.name}.`,
                emailMessage: emailHtml,
                type: "task",
              });
            }

            // Notify other assignees
            for (const assigneeId of task.assignees) {
              if (assigneeId.toString() !== req.userId.toString()) {
                await createNotification({
                  userId: assigneeId,
                  adminId: task.adminId,
                  title: "Task Status Updated",
                  message: `The status of task "${task.title}" has been updated to "${status}".`,
                  emailMessage: emailHtml,
                  type: "task",
                });
              }
            }
          }
        }
      } catch (notifErr) {
        console.error(
          "Background notification error in updateTaskStatus:",
          notifErr,
        );
      }
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const sendDeadlineReminders = async (req, res) => {
  try {
    const today = new Date();
    const startOfTomorrow = new Date(today);
    startOfTomorrow.setDate(today.getDate() + 1);
    startOfTomorrow.setHours(0, 0, 0, 0);

    const endOfTomorrow = new Date(today);
    endOfTomorrow.setDate(today.getDate() + 1);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      status: { $ne: "Completed" },
      dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
      deadlineReminderSent: { $ne: true },
    })
      .populate("assignees", "name email")
      .populate("adminId", "name email");

    let emailsSent = 0;

    for (const task of tasks) {
      const { title, dueDate, assignees, adminId, taskType } = task;
      const formattedDate = new Date(dueDate).toLocaleDateString();

      const subject = `⏰ Reminder: "${title}" is Due Tomorrow`;

      const employeeMessage = generateTaskEmailTemplate({
        badge: "DUE TOMORROW",
        badgeType: "amber",
        headline: `Reminder: "${title}" is due tomorrow`,
        subheadline: `Scheduled completion date: ${formattedDate}. Please complete or update status before the deadline.`,
        task,
        taskId: task._id,
        actionText: "Open Task in DoNow →",
      });

      const adminMessage = generateTaskEmailTemplate({
        badge: "TEAM TASK DUE TOMORROW",
        badgeType: "amber",
        headline: `Team task "${title}" is due tomorrow`,
        subheadline: `Assigned to: ${assignees.map((a) => a.name).join(", ")}.`,
        task,
        taskId: task._id,
        actionText: "View Team Task in DoNow →",
      });

      // Send to assignees
      if (assignees && assignees.length > 0) {
        for (const assignee of assignees) {
          if (assignee.email) {
            await sendNotificationEmail(
              assignee.email,
              subject,
              "Task Deadline Reminder",
              employeeMessage,
            );
            emailsSent++;
          }
        }
      }

      // Send to admin (only for group or employee tasks, not personal tasks)
      if (adminId && adminId.email && taskType !== "personal") {
        const isAdminAssigned = assignees.some(
          (a) => a._id.toString() === adminId._id.toString(),
        );
        if (!isAdminAssigned) {
          await sendNotificationEmail(
            adminId.email,
            subject,
            "Task Deadline Reminder",
            adminMessage,
          );
          emailsSent++;
        }
      }

      // Mark as sent so it doesn't send again
      task.deadlineReminderSent = true;
      await task.save();
    }

    res.status(200).json({
      status: true,
      message: `Sent ${emailsSent} reminder emails.`,
      tasksCount: tasks.length,
    });
  } catch (error) {
    console.error("Error sending deadline reminders:", error);
    res.status(500).json({ status: false, message: error.message });
  }
};
