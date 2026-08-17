import cron from "node-cron";
import Task from "../models/taskModel.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";

const startTaskReminders = () => {
  // Run everyday at 10:00 AM Asia/Kolkata
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log("Running daily task reminder job...");
      try {
        const today = new Date();
        const startOfToday = new Date(today);
        startOfToday.setHours(0, 0, 0, 0);

        const startOfTomorrow = new Date(today);
        startOfTomorrow.setDate(today.getDate() + 1);
        startOfTomorrow.setHours(0, 0, 0, 0);

        const endOfTomorrow = new Date(today);
        endOfTomorrow.setDate(today.getDate() + 1);
        endOfTomorrow.setHours(23, 59, 59, 999);

        // Find Workspace tasks that are pending/in progress/review and either expired or due tomorrow
        const tasks = await Task.find({
          status: { $ne: "Completed" },
          taskType: "group",
          $or: [
            { dueDate: { $lt: startOfToday } }, // Expired
            { dueDate: { $gte: startOfTomorrow, $lte: endOfTomorrow } }, // Expiring tomorrow
          ],
        }).populate("assignees", "name email").populate("responsiblePerson", "name email");

        // Group tasks by user
        const userReminders = new Map();

        tasks.forEach((task) => {
          let recipients = [];
          if (task.responsiblePerson) {
            recipients = [task.responsiblePerson];
          } else if (task.assignees && task.assignees.length > 0) {
            recipients = task.assignees;
          }

          recipients.forEach((user) => {
            if (!user.email) return;

            if (!userReminders.has(user._id.toString())) {
              userReminders.set(user._id.toString(), {
                user,
                expiredTasks: [],
                expiringTomorrowTasks: [],
              });
            }

            const userData = userReminders.get(user._id.toString());
            if (new Date(task.dueDate) < startOfToday) {
              userData.expiredTasks.push(task);
            } else {
              userData.expiringTomorrowTasks.push(task);
            }
          });
        });

        // Send digest emails
        for (const [userId, data] of userReminders.entries()) {
          const { user, expiredTasks, expiringTomorrowTasks } = data;
          
          let messageHtml = `<p>Hello ${user.name},</p><p>Here is your daily task summary for your workspaces:</p>`;
          
          if (expiredTasks.length > 0) {
            messageHtml += `
              <h3 style="color: #ef4444; margin-top: 20px;">🚨 Overdue Tasks</h3>
              <ul style="line-height: 1.6;">
                ${expiredTasks.map(t => `<li><strong>${t.title}</strong> (Due: ${new Date(t.dueDate).toLocaleDateString()})</li>`).join("")}
              </ul>
            `;
          }

          if (expiringTomorrowTasks.length > 0) {
            messageHtml += `
              <h3 style="color: #f59e0b; margin-top: 20px;">⚠️ Tasks Due Tomorrow</h3>
              <ul style="line-height: 1.6;">
                ${expiringTomorrowTasks.map(t => `<li><strong>${t.title}</strong></li>`).join("")}
              </ul>
            `;
          }

          messageHtml += `
            <div style="text-align:center;margin-top:30px;">
              <a href="${process.env.FRONTEND_URL || "https://DoNow.netlify.app"}/login" style="background:#7c3aed;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;">Go to Dashboard</a>
            </div>
            <br>
            <p>Best Regards,<br><strong>DoNow Team</strong></p>
          `;

          await sendNotificationEmail(
            user.email,
            "Daily Task Digest - DoNow",
            "Daily Task Digest",
            messageHtml
          );
        }

        console.log("Daily task reminder job completed.");
      } catch (error) {
        console.error("Error running task reminder job:", error);
      }
    },
    {
      scheduled: true,
      timezone: "Asia/Kolkata",
    }
  );
};

export default startTaskReminders;
