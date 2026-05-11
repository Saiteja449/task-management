import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  addComment,
  getAssignedTasks,
  getTaskDetails,
  updateTaskStatus,
} from "../controllers/taskController.js";

import { protect, admin } from "../middlewares/authMiddleware.js";


const router = express.Router();

router.post("/create-task", protect, admin, createTask);
router.get("/get-tasks", protect, getTasks);
router.put("/update-task/:id", protect, admin, updateTask);
router.delete("/delete-task/:id", protect, admin, deleteTask);
router.get("/get-assigned-tasks", protect, getAssignedTasks);
router.get("/get-task-details/:id", protect, getTaskDetails);
router.put("/update-status/:id", protect, updateTaskStatus);
router.post("/add-comment/:id", protect, addComment);






export default router;
