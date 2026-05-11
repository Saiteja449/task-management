import express from "express";
import {
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  addComment,
} from "../controllers/taskController.js";
import { protect, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-task", protect, checkPermission("tasks"), createTask);
router.get("/get-tasks", protect, getTasks);
router.put("/update-task/:id", protect, checkPermission("tasks"), updateTask);
router.delete("/delete-task/:id", protect, checkPermission("tasks"), deleteTask);
router.post("/add-comment/:id", protect, addComment);


export default router;
