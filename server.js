import 'dotenv/config';
// Force restart to apply Mongoose schema changes for attachments
import express from 'express';
import cors from 'cors';
import connectDB from './configs/db.js';
import userRoutes from './routes/userRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import groupRoutes from './routes/groupRoutes.js';
import taskRoutes from './routes/taskRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import startTaskReminders from './jobs/taskReminders.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  })
);

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

connectDB();

// Initialize scheduled jobs
startTaskReminders();

app.use(['/api/users', '/task-management/api/users'], userRoutes);
app.use(['/api/employees', '/task-management/api/employees'], employeeRoutes);
app.use(['/api/groups', '/task-management/api/groups'], groupRoutes);
app.use(['/api/tasks', '/task-management/api/tasks'], taskRoutes);
app.use(['/api/notifications', '/task-management/api/notifications'], notificationRoutes);
app.use(['/api/dashboard', '/task-management/api/dashboard'], dashboardRoutes);

// DoNow API Health Check
app.get('/', (req, res) => {
  res.send('DoNow API is running (ES Modules)...');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

