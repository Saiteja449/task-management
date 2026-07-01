import Group from "../models/groupModel.js";
import Task from "../models/taskModel.js";
import User from "../models/userModel.js";
import {
  createNotification,
  notifyMultipleUsers,
} from "../helpers/notificationHelper.js";

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
      sections: req.body.sections || ["General"],
      admin: req.userId,
    });

    if (group) {
      // Notify creator that the group was successfully created
      await createNotification({
        userId: req.userId,
        adminId: req.userId,
        title: "Group Created",
        message: `The group "${group.name}" was successfully created.`,
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
              type: "group",
            });
          }
        }
      }

      res.status(201).json({
        status: true,
        message: "Group created successfully",
        data: group,
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

      // Notify new members
      if (members) {
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
              type: "group",
            });
          }
        }
      }

      res.status(200).json({
        status: true,
        message: "Group updated successfully",
        data: updatedGroup,
      });
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

      // Notify members about group deletion
      await notifyMultipleUsers({
        userIds: memberIds,
        adminId: req.userId,
        title: "Group Deleted",
        message: `The group "${groupName}" has been deleted.`,
        type: "group",
      });

      res.status(200).json({
        status: true,
        message: "Group deleted successfully",
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
      .populate("comments.userId", "name avatar");

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
