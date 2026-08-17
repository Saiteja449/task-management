import mongoose from "mongoose";

const commentSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const attachmentSchema = mongoose.Schema(
  {
    url: String,
    publicId: String,
    format: String,
    type: String,
    name: String,
  },
  { _id: false },
);

const taskSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please add a task title"],
    },
    description: {
      type: String,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Review", "Completed"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    dueDate: {
      type: Date,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    taskType: {
      type: String,
      enum: ["personal", "employee", "group"],
      default: "personal",
    },
    responsiblePerson: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    section: {
      type: String,
      default: "General",
    },
    groupId: {
      type: String, // Can be a Group ObjectId or "personal"
      default: "personal",
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    attachments: [attachmentSchema],
    reminders: {
      type: Boolean,
      default: false,
    },
    deadlineReminderSent: {
      type: Boolean,
      default: false,
    },
    recurring: {
      type: String,
      enum: ["None", "Daily", "Weekly", "Monthly"],
      default: "None",
    },
    comments: [commentSchema],
  },
  {
    timestamps: true,
  },
);

const Task = mongoose.model("Task", taskSchema);

export default Task;
