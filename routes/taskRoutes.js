import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  addComment,
  getAssignedTasks,
  getGroupAssignedTasks,
  getTaskDetails,
  updateTaskStatus,
} from "../controllers/taskController.js";

import { protect, admin } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";


const router = express.Router();

router.post("/create-task", protect, upload.array("files", 5), createTask);
router.get("/get-tasks", protect, getTasks);
router.put("/update-task/:id", protect, upload.array("files", 5), updateTask);
router.delete("/delete-task/:id", protect, deleteTask);
router.get("/get-assigned-tasks", protect, getAssignedTasks);
router.get("/get-group-assigned-tasks", protect, getGroupAssignedTasks);
router.get("/get-task-details/:id", protect, getTaskDetails);
router.put("/update-status/:id", protect, updateTaskStatus);
router.post("/add-comment/:id", protect, addComment);






export default router;
