import User from "../models/userModel.js";
import Task from "../models/taskModel.js";
import Group from "../models/groupModel.js";
import sendEmployeeEmail, {
  sendNotificationEmail,
} from "../helpers/emailHelper.js";

export const getEmployeeDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findOne({ _id: id, adminId: req.userId });

    if (!employee) {
      return res
        .status(404)
        .json({ status: false, message: "Employee not found" });
    }

    const tasks = await Task.find({
      assignees: id,
      $or: [
        { taskType: { $in: ["employee", "group"] } },
        { groupId: { $ne: "personal" } },
        {
          taskType: { $exists: false },
          groupId: "personal",
          createdBy: req.userId,
        },
      ],
    })
      .populate("comments.userId", "name avatar")
      .lean();

    // Fetch group names for group tasks
    const groupIds = [
      ...new Set(
        tasks.filter((t) => t.groupId !== "personal").map((t) => t.groupId),
      ),
    ];
    const groups = await Group.find({ _id: { $in: groupIds } }).select("name");
    const groupMap = groups.reduce(
      (acc, g) => ({ ...acc, [g._id.toString()]: g.name }),
      {},
    );

    const tasksWithGroupInfo = tasks.map((task) => ({
      ...task,
      groupName:
        task.groupId === "personal"
          ? null
          : groupMap[task.groupId] || "Deleted Group",
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
      const adminUser = await User.findById(req.userId);
      await sendEmployeeEmail(
        email,
        defaultPassword,
        name,
        adminUser?.name || "Administrator",
        adminUser?.businessName || "Your Organization",
        designation || "Employee",
      );

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
      role: "Employee",
    })
      .select("-password")
      .lean();

    // Add fallback for name for legacy users
    const sanitizedEmployees = employees.map((emp) => ({
      ...emp,
      name:
        emp.name ||
        `${emp.firstName || ""} ${emp.lastName || ""}`.trim() ||
        "No Name",
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
        "✅ Your Account Information Has Been Updated",
        "Account Details Updated",
        `
    <p>Hello <strong>${updatedEmployee.name}</strong>,</p>

    <p>
      This is to let you know that your account information in
      <strong>Task-Management-Infasta</strong> has been updated by your administrator.
    </p>

    <div style="
      background:#f9fafb;
      border:1px solid #e5e7eb;
      border-radius:10px;
      padding:20px;
      margin:25px 0;
    ">

      <h3 style="margin-top:0;color:#111827;">
        📋 Updated Profile Information
      </h3>

      <table style="width:100%;border-collapse:collapse;">

        <tr>
          <td style="padding:8px 0;"><strong>Name</strong></td>
          <td style="padding:8px 0;">${updatedEmployee.name}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Email</strong></td>
          <td style="padding:8px 0;">${updatedEmployee.email}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Mobile</strong></td>
          <td style="padding:8px 0;">${updatedEmployee.mobile || "Not Provided"}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Designation</strong></td>
          <td style="padding:8px 0;">${updatedEmployee.designation || "Not Assigned"}</td>
        </tr>

        <tr>
          <td style="padding:8px 0;"><strong>Role</strong></td>
          <td style="padding:8px 0;">${updatedEmployee.role}</td>
        </tr>

      </table>

    </div>

    <div style="
      background:#eef2ff;
      border-left:4px solid #7c3aed;
      padding:18px;
      border-radius:6px;
      margin-bottom:25px;
    ">
      <strong>What should you do?</strong>
      <ul style="margin:10px 0 0 18px;line-height:1.8;">
        <li>Review your updated profile information.</li>
        <li>Verify that all details are accurate.</li>
        <li>If you notice anything incorrect, please contact your administrator.</li>
      </ul>
    </div>

    <p>
      If you did not expect these changes, please reach out to your administrator immediately.
    </p>

    <p>
      Thank you for using <strong>Task-Management-Infasta</strong>.
    </p>

    <br>

    <p>
      Best Regards,<br>
      <strong>Task-Management-Infasta Team</strong>
    </p>
  `,
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
    const employee = await User.findOneAndDelete({
      _id: id,
      adminId: req.userId,
    });

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
