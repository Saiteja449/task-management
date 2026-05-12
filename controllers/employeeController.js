import User from "../models/userModel.js";
import Task from "../models/taskModel.js";
import Group from "../models/groupModel.js";
import sendEmployeeEmail, { sendNotificationEmail } from "../helpers/emailHelper.js";

export const getEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOne({ _id: id, adminId: req.userId });

    if (!employee) {
      return res.status(404).json({ status: false, message: "Employee not found" });
    }

    const tasks = await Task.find({ assignees: id })
      .populate("comments.userId", "name avatar")
      .lean();

    // Fetch group names for group tasks
    const groupIds = [...new Set(tasks.filter(t => t.groupId !== "personal").map(t => t.groupId))];
    const groups = await Group.find({ _id: { $in: groupIds } }).select("name");
    const groupMap = groups.reduce((acc, g) => ({ ...acc, [g._id.toString()]: g.name }), {});

    const tasksWithGroupInfo = tasks.map(task => ({
      ...task,
      groupName: task.groupId === "personal" ? null : (groupMap[task.groupId] || "Deleted Group")
    }));

    res.status(200).json({
      status: true,
      message: "Employee details fetched successfully",
      data: {
        employee,
        tasks: tasksWithGroupInfo,
      },
    });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const { name, email, mobile, role, designation } = req.body;

    const requiredFields = ["name", "email", "mobile", "role"];
    const missingFields = requiredFields.filter((field) => !req.body[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Missing fields",
        errors: missingFields,
      });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res
        .status(400)
        .json({ status: false, message: "Employee already exists" });
    }



    const generateRandomPassword = (length = 10) => {
      const charset =
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
      let password = "";
      for (let i = 0; i < length; i++) {
        password += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      return password;
    };

    const defaultPassword = generateRandomPassword();

    const employee = await User.create({
      name,

      email,
      mobile,
      role,
      designation,
      password: defaultPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: "Offline",
      adminId: req.userId,
    });


    if (employee) {
      await sendEmployeeEmail(email, defaultPassword, name);

      res.status(201).json({
        status: true,
        message: "Employee added successfully and email sent",
      });
    } else {
      res.status(400).json({ status: false, message: "Invalid employee data" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({ 
      adminId: req.userId,
      role: "Employee" 
    }).select("-password").lean();
    
    // Add fallback for name for legacy users
    const sanitizedEmployees = employees.map(emp => ({
        ...emp,
        name: emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'No Name'
    }));

    res.status(200).json({
      status: true,
      message: "Employees fetched successfully",
      data: sanitizedEmployees,
    });

  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, role, permissions, designation } = req.body;

    const employee = await User.findOne({ _id: id, adminId: req.userId });

    if (employee) {
      if (name) {
        employee.name = name;
      }

      employee.email = email || employee.email;
      employee.mobile = mobile || employee.mobile;
      employee.role = role || employee.role;
      employee.designation = designation || employee.designation;




      const updatedEmployee = await employee.save();

      // Send update notification email
      await sendNotificationEmail(
        updatedEmployee.email,
        "Your Account Details Have Been Updated - TaskFlow",
        "Account Updated",
        `
        <p>Hello ${updatedEmployee.name},</p>
        <p>Your account details have been updated by the administrator. Please review your updated profile in the application.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Name:</strong> ${updatedEmployee.name}</p>
            <p style="margin: 0;"><strong>Designation:</strong> ${updatedEmployee.designation || "Not set"}</p>
            <p style="margin: 0;"><strong>Mobile:</strong> ${updatedEmployee.mobile || "Not set"}</p>
        </div>

        `
      );

      res.status(200).json({

        status: true,
        message: "Employee updated successfully",
        data: updatedEmployee,
      });
    } else {
      res.status(404).json({ status: false, message: "Employee not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOneAndDelete({ _id: id, adminId: req.userId });

    if (employee) {
      res.status(200).json({
        status: true,
        message: "Employee deleted successfully",
      });
    } else {
      res.status(404).json({ status: false, message: "Employee not found" });
    }
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
};

