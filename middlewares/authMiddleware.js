import jwt from "jsonwebtoken";
import User from "../models/userModel.js";

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;

      next();
    } catch (error) {
      console.error(error);
      return res
        .status(401)
        .json({ status: false, message: "Not authorized, token failed" });
    }
  }

  if (!token) {
    return res
      .status(401)
      .json({ status: false, message: "Not authorized, no token provided" });
  }
};

export const admin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    if (user && user.role === "Admin") {
      next();
    } else {
      res.status(403).json({ status: false, message: "Not authorized as an admin" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};





