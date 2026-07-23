import mongoose from "mongoose";

const workspaceFileSchema = mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    url: String,
    publicId: String,
    format: String,
    type: String,
    name: String,
  },
  { timestamps: true }
);

const groupSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a group name"],
    },
    description: {
      type: String,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sections: [
      {
        type: String,
      },
    ],
    workspaceFiles: [workspaceFileSchema],
  },
  {
    timestamps: true,
  }
);

const Group = mongoose.model("Group", groupSchema);

export default Group;
