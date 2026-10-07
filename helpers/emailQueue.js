import nodemailer from "nodemailer";

/**
 * Singleton pooled nodemailer transporter.
 * Reusing connections across email requests avoids expensive TCP & TLS handshakes.
 */
let transporter = null;

export const getTransporter = () => {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT) || 587;
    transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      host: process.env.SMTP_HOST,
      port: port,
      secure: port === 465, // true for 465, false for other ports (587, 25)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }
  return transporter;
};

/**
 * Asynchronous In-Memory Email Queue.
 * Dispatches emails in the background with concurrency control and automatic retries.
 * Prevents HTTP request handlers from ever blocking on slow SMTP network calls.
 */
class EmailQueue {
  constructor(concurrency = 3) {
    this.queue = [];
    this.concurrency = concurrency;
    this.activeWorkers = 0;
  }

  /**
   * Enqueue an email job for background processing.
   * @param {Object} mailOptions Standard nodemailer mail options
   * @param {number} retries Number of retry attempts on failure
   */
  enqueue(mailOptions, retries = 2) {
    if (!mailOptions || !mailOptions.to) return;
    this.queue.push({ mailOptions, retries });
    this.processNext();
  }

  processNext() {
    if (this.activeWorkers >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const item = this.queue.shift();
    if (!item) return;

    this.activeWorkers++;

    (async () => {
      try {
        const trans = getTransporter();
        const info = await trans.sendMail(item.mailOptions);
        console.log(`[EmailQueue] Sent to ${item.mailOptions.to} (ID: ${info?.messageId || "ok"})`);
      } catch (err) {
        console.error(`[EmailQueue] Error sending to ${item.mailOptions.to}:`, err.message);
        if (item.retries > 0) {
          console.log(`[EmailQueue] Retrying in 3s... (${item.retries} retries left)`);
          setTimeout(() => {
            this.enqueue(item.mailOptions, item.retries - 1);
          }, 3000);
        }
      } finally {
        this.activeWorkers--;
        this.processNext();
      }
    })();
  }
}

export const emailQueue = new EmailQueue(3);
