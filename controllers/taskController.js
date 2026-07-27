import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import Group from "../models/groupModel.js";
import { createNotification } from "../helpers/notificationHelper.js";
import { uploadMultipleToCloudinary } from "../helpers/uploadHelper.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";

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
      adminId: taskAdminId,
      createdBy: req.userId,
      attachments: attachmentUrls,
      reminders: reminders === "true" || reminders === true,
      recurring: recurring || "None",
    });

    if (task) {
      // Notify the creator that the task was successfully created
      await createNotification({
        userId: req.userId,
        adminId: taskAdminId,
        title: "✅ Task Created Successfully",
        message: `Task "${title}" was successfully created. Priority: ${priority || "Medium"}.`,
        emailMessage: `
    <p>Hello,</p>

    <p>Your task has been created successfully in <strong>DoNow</strong>.</p>

    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:25px 0;">
      <h3 style="margin-top:0;">📋 Task Details</h3>

      <table style="width:100%;">
        <tr>
          <td><strong>Task</strong></td>
          <td>${title}</td>
        </tr>

        <tr>
          <td><strong>Priority</strong></td>
          <td>${priority || "Medium"}</td>
        </tr>

        <tr>
          <td><strong>Status</strong></td>
          <td>${status || "Pending"}</td>
        </tr>

        <tr>
          <td><strong>Due Date</strong></td>
          <td>${new Date(dueDate).toLocaleDateString()}</td>
        </tr>
      </table>
    </div>

    <p>You can now monitor progress and collaborate with your team.</p>

    <div style="text-align:center;margin-top:30px;">
      <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login"
      style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">
      View Task
      </a>
    </div>

    <br>

    <p>Thank you,<br><strong>DoNow Team</strong></p>
  `,
        type: "task",
      });

      // Notify assignees
      if (resolvedAssignees && resolvedAssignees.length > 0) {
        for (const assigneeId of resolvedAssignees) {
          if (assigneeId.toString() !== req.userId.toString()) {
            await createNotification({
              userId: assigneeId,
              adminId: taskAdminId,
              title: "New Task Assigned",
              message: `You have been assigned a new task: "${title}". Priority: ${priority || "Medium"}.`,
              emailMessage: `
<p>Hello,</p>

<p>You have been assigned a new task in <strong>DoNow</strong>.</p>

<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:25px 0;">

<h3 style="margin-top:0;">📝 Task Information</h3>

<table style="width:100%;">

<tr>
<td><strong>Task</strong></td>
<td>${title}</td>
</tr>

<tr>
<td><strong>Description</strong></td>
<td>${description || "No description provided."}</td>
</tr>

<tr>
<td><strong>Priority</strong></td>
<td>${priority || "Medium"}</td>
</tr>

<tr>
<td><strong>Status</strong></td>
<td>${status || "Pending"}</td>
</tr>

<tr>
<td><strong>Due Date</strong></td>
<td>${new Date(dueDate).toLocaleDateString()}</td>
</tr>

<tr>
<td><strong>Task Type</strong></td>
<td>${normalizedTaskType}</td>
</tr>

${
  section
    ? `
<tr>
<td><strong>Section</strong></td>
<td>${section}</td>
</tr>
`
    : ""
}

</table>

</div>

<div style="background:#eef2ff;border-left:4px solid #7c3aed;padding:16px;border-radius:6px;">

<strong>Action Required</strong>

<ul style="margin-top:10px;line-height:1.8;">
<li>Review the task details.</li>
<li>Begin work as soon as possible.</li>
<li>Update the task status regularly.</li>
<li>Complete it before the due date.</li>
</ul>

</div>

<div style="text-align:center;margin-top:30px;">

<a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login"
style="
background:#7c3aed;
color:#fff;
padding:14px 28px;
border-radius:8px;
text-decoration:none;
font-weight:bold;">
Open Task
</a>

</div>

<br>

<p>Best Regards,<br>
<strong>DoNow Team</strong></p>
`,
              type: "task",
              attachments: task.attachments,
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

      const isPersonalTask =
        task.taskType === "personal" ||
        (!task.taskType && task.groupId === "personal");

      // Notify if status changed
      if (req.body.status && req.body.status !== oldStatus) {
        if (isPersonalTask) {
          await createNotification({
            userId: req.userId,
            adminId,
            title: "Personal Task Updated",
            message: `Your personal task "${task.title}" status has been updated to "${req.body.status}".`,
            emailMessage: `
<p>Hello,</p>
<p>Your personal task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>New Status:</strong> ${req.body.status}</p>
<p>You can view the details in the DoNow System.</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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
              emailMessage: `
<p>Hello,</p>
<p>The status of the task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>New Status:</strong> ${req.body.status}</p>
<p><strong>Updated By:</strong> ${user.name}</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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
                message: `Your task "${task.title}" status has been updated to "${req.body.status}".`,
                emailMessage: `
<p>Hello,</p>
<p>The status of the task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>New Status:</strong> ${req.body.status}</p>
<p><strong>Updated By:</strong> ${user.name}</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
                type: "task",
              });
            }
          }
        }
      } else {
        // Notify general update
        if (isPersonalTask) {
          await createNotification({
            userId: req.userId,
            adminId,
            title: "Personal Task Updated",
            message: `Your personal task "${task.title}" has been updated.`,
            emailMessage: `
<p>Hello,</p>
<p>Your personal task <strong>"${task.title}"</strong> has been updated.</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
            type: "task",
          });
        } else {
          for (const assigneeId of task.assignees) {
            if (assigneeId.toString() !== req.userId.toString()) {
              await createNotification({
                userId: assigneeId,
                adminId,
                title: "Task Updated",
                message: `The task "${task.title}" has been updated. Please check for details.`,
                emailMessage: `
<p>Hello,</p>
<p>The task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>Updated By:</strong> ${user.name}</p>
<p>Please log in to view the changes.</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
                type: "task",
              });
            }
          }
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
          emailMessage: `
<p>Hello,</p>
<p>The task <strong>"${title}"</strong> has been deleted.</p>
<p><strong>Deleted By:</strong> ${user.name}</p>
<p>If you have any questions, please contact the administrator.</p>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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

      // Notify about comment
      // If employee commented, notify Admin
      if (user.role === "Employee") {
        await createNotification({
          userId: adminId,
          adminId,
          title: "New Comment on Task",
          message: `${user.name} commented on "${task.title}": "${text.substring(0, 50)}..."`,
          emailMessage: `
<p>Hello,</p>
<p>A new comment was added to the task <strong>"${task.title}"</strong>.</p>
<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px;margin:25px 0;">
  <p style="margin:0;"><strong>${user.name}</strong> wrote:</p>
  <blockquote style="margin:10px 0 0;padding-left:15px;border-left:4px solid #7c3aed;color:#4b5563;">
    ${text}
  </blockquote>
</div>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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
      .populate("comments.userId", "name avatar")
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
      .populate("comments.userId", "name avatar")
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

    const isPersonalTask =
      task.taskType === "personal" ||
      (!task.taskType && task.groupId === "personal");

    // Notify if status changed
    if (status !== oldStatus) {
      if (isPersonalTask) {
        await createNotification({
          userId: req.userId,
          adminId: task.adminId,
          title: "Personal Task Status Updated",
          message: `Your personal task "${task.title}" status has been updated to "${status}".`,
          emailMessage: `
<p>Hello,</p>
<p>Your personal task <strong>"${task.title}"</strong> status has been updated.</p>
<p><strong>New Status:</strong> ${status}</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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
            emailMessage: `
<p>Hello,</p>
<p>The status of the task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>New Status:</strong> ${status}</p>
<p><strong>Updated By:</strong> ${user.name}</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
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
              emailMessage: `
<p>Hello,</p>
<p>The status of the task <strong>"${task.title}"</strong> has been updated.</p>
<p><strong>New Status:</strong> ${status}</p>
<p><strong>Updated By:</strong> ${user.name}</p>
<div style="text-align:center;margin-top:30px;">
  <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">View Task</a>
</div>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
              type: "task",
            });
          }
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

      const employeeMessage = `
<p>Hello,</p>

<p>This is a friendly reminder that your assigned task <strong>"${title}"</strong> is scheduled to be completed by <strong>${formattedDate}</strong>.</p>

<p>Please make sure the task is completed before the deadline to avoid any delays.</p>

<p>If you have already completed the task, kindly update its status in the DoNow System.</p>

<p>Thank you for your attention and timely action.</p>

<p><strong>Task Details:</strong></p>
<ul>
  <li><strong>Task:</strong> ${title}</li>
  <li><strong>Due Date:</strong> ${formattedDate}</li>
</ul>

<p>Best Regards,<br>
DoNow System</p>
`;

      const adminMessage = `
<p>Hello ${adminId?.name || "Admin"},</p>

<p>This is an automated reminder that the following task assigned to your team is due tomorrow.</p>

<p><strong>Task Details:</strong></p>
<ul>
  <li><strong>Task:</strong> ${title}</li>
  <li><strong>Due Date:</strong> ${formattedDate}</li>
  <li><strong>Assigned To:</strong> ${assignees.map((a) => a.name).join(", ")}</li>
</ul>

<p>Please follow up with the assigned team member(s) if necessary to ensure the task is completed on time.</p>

<p>Thank you.</p>

<p>Best Regards,<br>
DoNow System</p>
`;

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
