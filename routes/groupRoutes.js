import express from "express";
import {
  createGroup,
  getGroups,
  updateGroup,
  deleteGroup,
  getGroupDetails,
} from "../controllers/groupController.js";
import { protect, admin } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/create-group", protect, admin, createGroup);
router.get("/get-groups", protect, getGroups);
router.get("/get-group-details/:id", protect, getGroupDetails);
router.put("/update-group/:id", protect, admin, updateGroup);
router.delete("/delete-group/:id", protect, admin, deleteGroup);


export default router;
