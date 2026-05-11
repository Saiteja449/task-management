import express from "express";
import {
  getAdminStats,
  getEmployeeStats,
} from "../controllers/dashboardController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/admin", protect, admin, getAdminStats);
router.get("/employee", protect, getEmployeeStats);

export default router;
