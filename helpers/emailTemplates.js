/**
 * DoNow - Modern, Clean & Responsive Email Templates
 */

export const getFrontendBaseUrl = () => {
  const url = process.env.FRONTEND_URL || "https://holyminicow.com/DoNow";
  return url.replace(/\/+$/, "");
};

export const getTaskUrl = (taskId) => {
  const base = getFrontendBaseUrl();
  return taskId ? `${base}/tasks/${taskId}` : `${base}/`;
};

export const getLoginUrl = () => {
  const base = getFrontendBaseUrl();
  return `${base}/login`;
};

const getBadgeStyle = (type = "indigo") => {
  switch (type) {
    case "emerald":
    case "success":
      return { bg: "#ecfdf5", color: "#059669", border: "#a7f3d0" };
    case "amber":
    case "warning":
      return { bg: "#fffbeb", color: "#d97706", border: "#fde68a" };
    case "rose":
    case "danger":
    case "overdue":
      return { bg: "#fff1f2", color: "#e11d48", border: "#fecdd3" };
    case "sky":
    case "info":
      return { bg: "#f0f9ff", color: "#0284c7", border: "#bae6fd" };
    case "violet":
      return { bg: "#f5f3ff", color: "#7c3aed", border: "#ddd6fe" };
    case "indigo":
    default:
      return { bg: "#eef2ff", color: "#4f46e5", border: "#c7d2fe" };
  }
};

const getPriorityStyle = (priority = "Medium") => {
  const p = (priority || "").toLowerCase();
  if (p === "high" || p === "urgent") {
    return { bg: "#fee2e2", color: "#dc2626", border: "#fca5a5" };
  }
  if (p === "low") {
    return { bg: "#e0f2fe", color: "#0284c7", border: "#bae6fd" };
  }
  return { bg: "#fef3c7", color: "#d97706", border: "#fde68a" };
};

const getStatusStyle = (status = "Pending") => {
  const s = (status || "").toLowerCase();
  if (s === "completed") {
    return { bg: "#dcfce7", color: "#16a34a", border: "#86efac" };
  }
  if (s === "in progress") {
    return { bg: "#e0e7ff", color: "#4f46e5", border: "#a5b4fc" };
  }
  return { bg: "#fef3c7", color: "#d97706", border: "#fde68a" };
};

/**
 * Base layout wrapper for all DoNow emails
 */
const renderEmailShell = ({
  badge = "NOTIFICATION",
  badgeType = "indigo",
  headline = "",
  subheadline = "",
  bodyHtml = "",
  actionText = "Open in DoNow →",
  actionUrl = "",
  footerNote = "You received this email because you are a member of DoNow.",
}) => {
  const badgeStyle = getBadgeStyle(badgeType);
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${headline || "DoNow Notification"}</title>
  <style>
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table {
      border-collapse: collapse !important;
    }
    a {
      text-decoration: none;
    }
    @media only screen and (max-width: 620px) {
      .email-container {
        width: 100% !important;
        padding: 12px !important;
      }
      .card-body {
        padding: 24px 18px !important;
      }
      .meta-col {
        display: block !important;
        width: 100% !important;
        margin-bottom: 8px !important;
      }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Container -->
        <table role="presentation" class="email-container" width="580" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; width: 100%; margin: 0 auto;">
          
          <!-- Brand Header -->
          <tr>
            <td align="center" style="padding-bottom: 20px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 8px 18px; border-radius: 12px; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.25);">
                      <span style="font-size: 19px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">⚡ DoNow</span>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main White Card -->
          <tr>
            <td>
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(15, 23, 42, 0.05);">
                
                <!-- Accent Color Top Bar -->
                <tr>
                  <td height="4" style="background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%); line-height: 4px; font-size: 4px;">&nbsp;</td>
                </tr>

                <!-- Card Content -->
                <tr>
                  <td class="card-body" style="padding: 34px 32px 30px 32px;">
                    
                    <!-- Badge -->
                    ${
                      badge
                        ? `
                    <div style="margin-bottom: 14px;">
                      <span style="display: inline-block; background-color: ${badgeStyle.bg}; color: ${badgeStyle.color}; border: 1px solid ${badgeStyle.border}; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${badge}
                      </span>
                    </div>
                    `
                        : ""
                    }

                    <!-- Headline -->
                    ${
                      headline
                        ? `
                    <h1 style="margin: 0 0 8px 0; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.35; letter-spacing: -0.4px;">
                      ${headline}
                    </h1>
                    `
                        : ""
                    }

                    <!-- Subheadline -->
                    ${
                      subheadline
                        ? `
                    <p style="margin: 0 0 22px 0; color: #64748b; font-size: 15px; line-height: 1.55;">
                      ${subheadline}
                    </p>
                    `
                        : ""
                    }

                    <!-- Body Content -->
                    ${bodyHtml}

                    <!-- Call To Action Button -->
                    ${
                      actionUrl
                        ? `
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-top: 30px; margin-bottom: 18px;">
                      <tr>
                        <td align="center">
                          <a href="${actionUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-size: 15px; font-weight: 700; text-align: center; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.35); border: 1px solid rgba(255, 255, 255, 0.2);">
                            ${actionText}
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top: 14px;">
                          <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.4;">
                            Button not opening? Copy and paste this URL into your browser:<br/>
                            <a href="${actionUrl}" target="_blank" style="color: #6366f1; word-break: break-all; text-decoration: underline;">${actionUrl}</a>
                          </p>
                        </td>
                      </tr>
                    </table>
                    `
                        : ""
                    }

                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px 0 16px;">
              <p style="margin: 0 0 6px 0; color: #64748b; font-size: 12px; line-height: 1.5; text-align: center;">
                ${footerNote}
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 11px; text-align: center;">
                © ${currentYear} DoNow • All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Clean task details card for task-related emails
 */
export const generateTaskEmailTemplate = ({
  badge = "TASK NOTIFICATION",
  badgeType = "indigo",
  headline = "Task Update",
  subheadline = "",
  task = {},
  taskId = "",
  groupName = "",
  creatorName = "",
  responsiblePersonName = "",
  customMessage = "",
  actionText = "Open Task in DoNow →",
  attachments = [],
}) => {
  const resolvedTaskId = taskId || task?._id || "";
  const taskUrl = getTaskUrl(resolvedTaskId);

  const priorityStyle = getPriorityStyle(task?.priority);
  const statusStyle = getStatusStyle(task?.status);

  let formattedDueDate = "No due date";
  if (task?.dueDate) {
    try {
      formattedDueDate = new Date(task.dueDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      formattedDueDate = String(task.dueDate);
    }
  }

  const attachmentsHtml =
    attachments && attachments.length > 0
      ? `
      <div style="margin-top: 18px; padding-top: 14px; border-top: 1px dashed #e2e8f0;">
        <p style="margin: 0 0 8px 0; font-size: 13px; font-weight: 700; color: #1e293b;">📎 Attached Files (${attachments.length}):</p>
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
          ${attachments
            .map(
              (f) => `
            <tr>
              <td style="padding: 4px 0;">
                <a href="${f.url}" target="_blank" style="color: #6366f1; font-size: 13px; font-weight: 600; text-decoration: none;">
                  📄 ${f.name || "Download Attachment"}
                </a>
              </td>
            </tr>
          `,
            )
            .join("")}
        </table>
      </div>
    `
      : "";

  const bodyHtml = `
    <!-- Custom message / note if provided -->
    ${
      customMessage
        ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px;">
        <p style="margin: 0; color: #334155; font-size: 14px; line-height: 1.55;">
          ${customMessage}
        </p>
      </div>
      `
        : ""
    }

    <!-- Task Card Box -->
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px;">
      <tr>
        <td style="padding: 20px;">
          
          <!-- Task Title -->
          <h2 style="margin: 0 0 8px 0; color: #0f172a; font-size: 17px; font-weight: 700; line-height: 1.4;">
            ${task?.title || "Untitled Task"}
          </h2>

          <!-- Task Description -->
          ${
            task?.description
              ? `
          <p style="margin: 0 0 16px 0; color: #475569; font-size: 13px; line-height: 1.6; white-space: pre-line;">
            ${task.description}
          </p>
          `
              : `<div style="height: 8px;"></div>`
          }

          <!-- Metadata Grid -->
          <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top: 1px solid #e2e8f0; padding-top: 14px;">
            <tr>
              <td width="50%" valign="top" style="padding-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Due Date</span><br/>
                <span style="font-size: 14px; font-weight: 700; color: #1e293b;">📅 ${formattedDueDate}</span>
              </td>
              <td width="50%" valign="top" style="padding-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Priority</span><br/>
                <span style="display: inline-block; background-color: ${priorityStyle.bg}; color: ${priorityStyle.color}; border: 1px solid ${priorityStyle.border}; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 3px;">
                  ⚡ ${task?.priority || "Medium"}
                </span>
              </td>
            </tr>

            <tr>
              <td width="50%" valign="top" style="padding-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Status</span><br/>
                <span style="display: inline-block; background-color: ${statusStyle.bg}; color: ${statusStyle.color}; border: 1px solid ${statusStyle.border}; padding: 2px 8px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-top: 3px;">
                  ${task?.status || "Pending"}
                </span>
              </td>
              <td width="50%" valign="top" style="padding-bottom: 10px;">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Workspace / Section</span><br/>
                <span style="font-size: 13px; font-weight: 600; color: #334155;">
                  ${groupName ? `📁 ${groupName}` : "Personal"} ${task?.section ? `› ${task.section}` : ""}
                </span>
              </td>
            </tr>

            ${
              creatorName || responsiblePersonName
                ? `
            <tr>
              ${
                creatorName
                  ? `
              <td width="50%" valign="top">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Created By</span><br/>
                <span style="font-size: 13px; font-weight: 600; color: #334155;">👤 ${creatorName}</span>
              </td>
              `
                  : `<td width="50%"></td>`
              }
              ${
                responsiblePersonName
                  ? `
              <td width="50%" valign="top">
                <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Responsible</span><br/>
                <span style="font-size: 13px; font-weight: 600; color: #334155;">⭐ ${responsiblePersonName}</span>
              </td>
              `
                  : `<td width="50%"></td>`
              }
            </tr>
            `
                : ""
            }

          </table>

          ${attachmentsHtml}

        </td>
      </tr>
    </table>
  `;

  return renderEmailShell({
    badge,
    badgeType,
    headline,
    subheadline,
    bodyHtml,
    actionText,
    actionUrl: taskUrl,
  });
};

/**
 * General purpose notification email (for deletions, general notices, etc.)
 */
export const generateGeneralEmailTemplate = ({
  badge = "NOTIFICATION",
  badgeType = "indigo",
  headline = "",
  subheadline = "",
  message = "",
  actionText = "Go to DoNow →",
  actionUrl = "",
}) => {
  const targetUrl = actionUrl || getFrontendBaseUrl();
  const bodyHtml = `
    <div style="color: #334155; font-size: 15px; line-height: 1.65;">
      ${message}
    </div>
  `;

  return renderEmailShell({
    badge,
    badgeType,
    headline,
    subheadline,
    bodyHtml,
    actionText,
    actionUrl: targetUrl,
  });
};

/**
 * Daily Task Reminder / Digest Template
 */
export const generateDigestEmailTemplate = ({
  recipientName = "Team Member",
  expiredTasks = [],
  expiringTomorrowTasks = [],
}) => {
  const dashboardUrl = getFrontendBaseUrl();

  const renderTaskList = (tasks, icon, color) => `
    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 16px;">
      ${tasks
        .map(
          (t) => `
        <tr>
          <td style="padding: 8px 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 6px;">
            <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${icon} ${t.title}</span><br/>
                  <span style="font-size: 12px; color: ${color}; font-weight: 600;">
                    Due: ${new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </td>
                <td align="right" width="90">
                  <a href="${getTaskUrl(t._id)}" target="_blank" style="display: inline-block; background-color: #e2e8f0; color: #334155; font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 6px; text-decoration: none;">
                    View →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr><td height="6"></td></tr>
      `,
        )
        .join("")}
    </table>
  `;

  let contentHtml = `<p style="margin: 0 0 16px 0; color: #334155; font-size: 15px;">Hi <strong>${recipientName}</strong>, here is your daily summary of tasks that need immediate attention.</p>`;

  if (expiredTasks.length > 0) {
    contentHtml += `
      <div style="margin-top: 16px;">
        <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; border: 1px solid #fca5a5; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 10px;">
          🚨 Overdue Tasks (${expiredTasks.length})
        </span>
        ${renderTaskList(expiredTasks, "⚠️", "#dc2626")}
      </div>
    `;
  }

  if (expiringTomorrowTasks.length > 0) {
    contentHtml += `
      <div style="margin-top: 16px;">
        <span style="display: inline-block; background-color: #fef3c7; color: #d97706; border: 1px solid #fde68a; padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 10px;">
          ⏰ Due Tomorrow (${expiringTomorrowTasks.length})
        </span>
        ${renderTaskList(expiringTomorrowTasks, "📌", "#d97706")}
      </div>
    `;
  }

  return renderEmailShell({
    badge: "DAILY DIGEST",
    badgeType: expiredTasks.length > 0 ? "rose" : "amber",
    headline: "Your Daily Task Digest",
    subheadline: "Stay on top of your deadlines and team responsibilities.",
    bodyHtml: contentHtml,
    actionText: "Open Dashboard in DoNow →",
    actionUrl: dashboardUrl,
  });
};

/**
 * Welcome Email Template for new signups
 */
export const generateWelcomeEmailTemplate = ({
  name = "User",
  businessName = "Your Workspace",
}) => {
  const loginUrl = getLoginUrl();

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hi <strong>${name}</strong>,<br/><br/>
      We're thrilled to welcome you to <strong>DoNow</strong>! Your workspace for <strong>${businessName}</strong> has been created and is ready to boost your team's productivity.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #0f172a; font-size: 15px; font-weight: 700;">🚀 Quick Start Guide:</h3>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;">✅ Create tasks and assign deadlines</td></tr>
        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;">👥 Invite team members to collaborate</td></tr>
        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;">📊 Track progress in real-time across workspaces</td></tr>
        <tr><td style="padding: 4px 0; font-size: 14px; color: #475569;">🔔 Stay aligned with automated reminders</td></tr>
      </table>
    </div>
  `;

  return renderEmailShell({
    badge: "WELCOME",
    badgeType: "emerald",
    headline: `Welcome to DoNow, ${name}! 👋`,
    subheadline: `Your workspace "${businessName}" is ready.`,
    bodyHtml,
    actionText: "Login to Your Workspace →",
    actionUrl: loginUrl,
  });
};

/**
 * Employee Invitation Template
 */
export const generateEmployeeInviteEmailTemplate = ({
  name = "Team Member",
  adminName = "Administrator",
  businessName = "Your Organization",
  designation = "Employee",
  email = "",
  password = "",
}) => {
  const loginUrl = getLoginUrl();

  const bodyHtml = `
    <p style="margin: 0 0 16px 0; color: #334155; font-size: 15px; line-height: 1.6;">
      Hi <strong>${name}</strong>,<br/><br/>
      <strong>${adminName}</strong> has invited you to join the <strong>${businessName}</strong> team on DoNow as <strong>${designation}</strong>.
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 14px 0; color: #0f172a; font-size: 15px; font-weight: 700;">🔐 Your Login Credentials:</h3>
      <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
        <tr>
          <td width="90" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Email:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-weight: 700;">${email}</td>
        </tr>
        <tr>
          <td width="90" style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Password:</td>
          <td style="padding: 6px 0; font-size: 14px; color: #0f172a; font-family: monospace; font-weight: 700; background-color: #e2e8f0; padding: 2px 8px; border-radius: 4px; display: inline-block;">${password}</td>
        </tr>
      </table>
    </div>

    <p style="margin: 0 0 10px 0; color: #64748b; font-size: 13px; line-height: 1.5;">
      💡 For security, we recommend changing your password after your first login.
    </p>
  `;

  return renderEmailShell({
    badge: "TEAM INVITATION",
    badgeType: "indigo",
    headline: `Join the ${businessName} team`,
    subheadline: "You have been added to DoNow Task Management.",
    bodyHtml,
    actionText: "Login to DoNow →",
    actionUrl: loginUrl,
  });
};
