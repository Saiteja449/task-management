import Group from "../models/groupModel.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import {
  createNotification,
  notifyMultipleUsers,
} from "../helpers/notificationHelper.js";
import { uploadMultipleToCloudinary } from "../helpers/uploadHelper.js";
import { generateGeneralEmailTemplate } from "../helpers/emailTemplates.js";

export const createGroup = async (req, res) => {
  try {
    const { name, description, members } = req.body;

    if (!name) {
      return res.status(400).json({
        status: false,
        message: "Group name is required",
      });
    }

    const group = await Group.create({
      name,
      description,
      members: members || [],
      sections: req.body.sections || [],
      admin: req.userId,
    });

    if (group) {
      res.status(201).json({
        status: true,
        message: "Group created successfully",
        data: group,
      });

      // Dispatch notifications in background
      setImmediate(async () => {
        try {
          // Notify creator that the group was successfully created
          await createNotification({
            userId: req.userId,
            adminId: req.userId,
            title: "Group Created",
            message: `The group "${group.name}" was successfully created.`,
            emailMessage: generateGeneralEmailTemplate({
              badge: "WORKSPACE CREATED",
              badgeType: "emerald",
              headline: `Group "${group.name}" created`,
              message: `<p style="margin: 0 0 10px 0;">Your group <strong>"${group.name}"</strong> was created successfully.</p><p style="margin: 0; color: #64748b;">You can now add tasks, sections, and collaborate with your team.</p>`,
              actionText: "Open Workspace →",
            }),
            type: "group",
          });

          // Notify other members
          if (members && members.length > 0) {
            for (const memberId of members) {
              if (memberId.toString() !== req.userId.toString()) {
                await createNotification({
                  userId: memberId,
                  adminId: req.userId,
                  title: "Added to Group",
                  message: `You have been added to the new group: "${group.name}".`,
                  emailMessage: generateGeneralEmailTemplate({
                    badge: "GROUP INVITATION",
                    badgeType: "indigo",
                    headline: `Added to "${group.name}"`,
                    message: `<p style="margin: 0 0 10px 0;">You have been added to the workspace group <strong>"${group.name}"</strong> in DoNow.</p><p style="margin: 0; color: #64748b;">Log in to view group tasks and collaborate with your team.</p>`,
                    actionText: "View Group →",
                  }),
                  type: "group",
                });
              }
            }
          }
        } catch (notifErr) {
          console.error("Background notification error in createGroup:", notifErr);
        }
      });
    } else {
      res.status(400).json({ status: false, message: "Invalid group data" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({
      $or: [{ admin: req.userId }, { members: req.userId }],
    }).populate("members", "name email role avatar");

    res.status(200).json({
      status: true,
      message: "Groups fetched successfully",
      data: groups,
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, members, sections } = req.body;

    const group = await Group.findById(id);

    if (group) {
      const user = await User.findById(req.userId);
      const isGroupAdmin = group.admin.toString() === req.userId;
      const isAdminRole = user?.role === "Admin";
      const isMember = group.members.some((m) => m.toString() === req.userId);

      if (!isGroupAdmin && !isAdminRole) {
        if (!isMember) {
          return res.status(403).json({
            status: false,
            message: "Not authorized to update this group",
          });
        }

        // Employee members can only update sections
        if (name || description || members) {
          return res.status(403).json({
            status: false,
            message: "Employees can only modify group categories",
          });
        }
      }

      const oldMembers = group.members.map((m) => m.toString());
      if (name) group.name = name;
      if (description !== undefined) group.description = description;
      if (members) group.members = members;
      if (sections) group.sections = sections;

      const updatedGroup = await group.save();

      res.status(200).json({
        status: true,
        message: "Group updated successfully",
        data: updatedGroup,
      });

      // Notify new members in background
      if (members) {
        setImmediate(async () => {
          try {
            const newMembers = members.filter(
              (m) => !oldMembers.includes(m.toString()),
            );
            for (const memberId of newMembers) {
              if (memberId.toString() !== req.userId.toString()) {
                await createNotification({
                  userId: memberId,
                  adminId: req.userId,
                  title: "Added to Group",
                  message: `You have been added to the group: "${group.name}".`,
                  emailMessage: generateGeneralEmailTemplate({
                    badge: "GROUP INVITATION",
                    badgeType: "indigo",
                    headline: `Added to "${group.name}"`,
                    message: `<p style="margin: 0 0 10px 0;">You have been added to the workspace group <strong>"${group.name}"</strong> in DoNow.</p><p style="margin: 0; color: #64748b;">Log in to view group tasks and collaborate with your team.</p>`,
                    actionText: "View Group →",
                  }),
                  type: "group",
                });
              }
            }
          } catch (notifErr) {
            console.error("Background notification error in addMemberToGroup:", notifErr);
          }
        });
      }
    } else {
      res.status(404).json({ status: false, message: "Group not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const group = await Group.findById(id);

    if (group) {
      // Check if user is the admin of the group
      if (group.admin.toString() !== req.userId) {
        return res.status(403).json({
          status: false,
          message: "Only the admin who created the group can delete it",
        });
      }

      const groupName = group.name;
      const memberIds = group.members;

      await Group.findByIdAndDelete(id);

      res.status(200).json({
        status: true,
        message: "Group deleted successfully",
      });

      // Notify members about group deletion in background
      setImmediate(async () => {
        try {
          await notifyMultipleUsers({
            userIds: memberIds,
            adminId: req.userId,
            title: "Group Deleted",
            message: `The group "${groupName}" has been deleted.`,
            emailMessage: `
<p>Hello,</p>
<p>The group <strong>"${groupName}"</strong> has been deleted.</p>
<p>If you have any questions, please contact the administrator.</p>
<br>
<p>Best Regards,<br><strong>DoNow Team</strong></p>
`,
            type: "group",
          });
        } catch (notifErr) {
          console.error("Background notification error in deleteGroup:", notifErr);
        }
      });
    } else {
      res.status(404).json({ status: false, message: "Group not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getGroupDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findById(id).populate(
      "members",
      "name email role avatar",
    );

    if (!group) {
      return res
        .status(404)
        .json({ status: false, message: "Group not found" });
    }

    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;

    if (group.admin.toString() !== adminId.toString()) {
      const isMember = group.members.some(
        (m) => m._id.toString() === req.userId,
      );
      if (!isMember && user.role !== "Admin") {
        return res
          .status(403)
          .json({
            status: false,
            message: "Not authorized to view this group",
          });
      }
    }

    const tasks = await Task.find({ groupId: id })
      .populate("assignees", "name email role avatar")
      .populate("comments.userId", "name avatar")
      .populate("createdBy", "name email avatar");

    res.status(200).json({
      status: true,
      message: "Group details fetched successfully",
      data: {
        group,
        tasks,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const uploadWorkspaceFile = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, uploadType, linkUrl } = req.body;

    if (!title) {
      return res.status(400).json({ status: false, message: "Title is required" });
    }

    if (uploadType === "file" && !req.file) {
      return res.status(400).json({ status: false, message: "File is required" });
    }

    if (uploadType === "link" && !linkUrl) {
      return res.status(400).json({ status: false, message: "URL is required" });
    }

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    // Verify user is part of group or admin
    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;
    
    if (group.admin.toString() !== adminId.toString()) {
      const isMember = group.members.some((m) => m._id.toString() === req.userId);
      if (!isMember && user.role !== "Admin") {
        return res.status(403).json({ status: false, message: "Not authorized to upload files to this workspace" });
      }
    }

    let newFile;

    if (uploadType === "file") {
      const uploadedFiles = await uploadMultipleToCloudinary([req.file]);
      
      if (uploadedFiles && uploadedFiles.length > 0) {
        newFile = {
          title,
          url: uploadedFiles[0].url,
          publicId: uploadedFiles[0].publicId,
          format: uploadedFiles[0].format,
          type: uploadedFiles[0].type,
          name: uploadedFiles[0].name
        };
      } else {
        return res.status(500).json({ status: false, message: "Failed to upload file to Cloudinary" });
      }
    } else {
      newFile = {
        title,
        url: linkUrl,
        type: "link"
      };
    }

    group.workspaceFiles = group.workspaceFiles || [];
    group.workspaceFiles.push(newFile);

    await group.save();

    return res.status(200).json({
      status: true,
      message: "Resource added successfully",
      data: newFile
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteWorkspaceFile = async (req, res) => {
  try {
    const { id, fileId } = req.params;

    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({ status: false, message: "Group not found" });
    }

    // Verify user is part of group or admin
    const user = await User.findById(req.userId);
    const adminId = user.role === "Admin" ? user._id : user.adminId;
    
    if (group.admin.toString() !== adminId.toString()) {
      const isMember = group.members.some((m) => m._id.toString() === req.userId);
      if (!isMember && user.role !== "Admin") {
        return res.status(403).json({ status: false, message: "Not authorized to delete files from this workspace" });
      }
    }

    const fileIndex = group.workspaceFiles.findIndex(f => f._id.toString() === fileId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ status: false, message: "File not found" });
    }

    group.workspaceFiles.splice(fileIndex, 1);
    await group.save();

    return res.status(200).json({
      status: true,
      message: "Resource deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
