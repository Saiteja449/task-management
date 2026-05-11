import User from "../models/userModel.js";
import sendEmployeeEmail, { sendNotificationEmail } from "../helpers/emailHelper.js";

export const addEmployee = async (req, res) => {
  try {
    const { name, email, mobile, role, permissions, designation } = req.body;


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

    // Split name into firstName and lastName
    const nameParts = name.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "";

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
      firstName,
      lastName,
      email,
      mobile,
      role,
      designation,
      password: defaultPassword,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      status: "Offline",
      adminId: req.userId,
      permissions: permissions || {
        tasks: true,
        manageGroups: false,
      },
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
    }).select("-password");
    
    res.status(200).json({
      status: true,
      message: "Employees fetched successfully",
      data: employees,
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
        const nameParts = name.trim().split(" ");
        employee.firstName = nameParts[0] || employee.firstName;
        employee.lastName = nameParts.slice(1).join(" ") || employee.lastName;
      }
      employee.email = email || employee.email;
      employee.mobile = mobile || employee.mobile;
      employee.role = role || employee.role;
      employee.designation = designation || employee.designation;

      if (permissions) {
        employee.permissions = { ...employee.permissions, ...permissions };
      }

      const updatedEmployee = await employee.save();

      // Send update notification email
      await sendNotificationEmail(
        updatedEmployee.email,
        "Your Account Details Have Been Updated - TaskFlow",
        "Account Updated",
        `
        <p>Hello ${updatedEmployee.firstName},</p>
        <p>Your account details have been updated by the administrator. Please review your updated profile in the application.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Name:</strong> ${updatedEmployee.firstName} ${updatedEmployee.lastName}</p>
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

