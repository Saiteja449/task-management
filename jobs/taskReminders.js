import cron from "node-cron";
import Task from "../models/taskModel.js";
import { sendNotificationEmail } from "../helpers/emailHelper.js";
import { generateDigestEmailTemplate } from "../helpers/emailTemplates.js";

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
        })
          .populate("assignees", "name email")
          .populate("responsiblePerson", "name email");

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

        // Send one digest email per user
        for (const [userId, data] of userReminders.entries()) {
          const { user, expiredTasks, expiringTomorrowTasks } = data;

          const emailHtml = generateDigestEmailTemplate({
            recipientName: user.name || "Team Member",
            expiredTasks,
            expiringTomorrowTasks,
          });

          await sendNotificationEmail(
            user.email,
            "Daily Task Digest - DoNow",
            "Daily Task Digest",
            emailHtml
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
