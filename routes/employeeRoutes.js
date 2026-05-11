import express from "express";
import {
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployeeDetails,
} from "../controllers/employeeController.js";

import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/add-employee", protect, admin, addEmployee);
router.get("/get-employees", protect, admin, getEmployees);
router.put("/update-employee/:id", protect, admin, updateEmployee);
router.delete("/delete-employee/:id", protect, admin, deleteEmployee);
router.get("/get-employee-details/:id", protect, admin, getEmployeeDetails);


export default router;

