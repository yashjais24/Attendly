import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import subjectRoutes from './routes/subjects';
import timetableRoutes from './routes/timetable';
import attendanceRoutes from './routes/attendance';
import uploadRoutes from './routes/upload';
import reminderRoutes from './routes/reminders';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log('➡️ REQUEST:', req.method, req.url);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/timetable', timetableRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/reminders', reminderRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'Attendly API is running' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
