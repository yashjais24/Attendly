import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { calculateAttendanceIntelligence } from '../utils/attendanceMath';

const router = Router();
router.use(requireAuth);

// GET /api/attendance?date=YYYY-MM-DD
// Returns attendance for a specific date, merging timetable slots and recorded attendance
router.get('/', async (req: AuthRequest, res: Response) => {
  const dateStr = req.query.date as string;
  
  if (!dateStr) {
    res.status(400).json({ error: 'Date is required (YYYY-MM-DD)' });
    return;
  }

  try {
    const targetDate = new Date(dateStr);
    // getDay() returns 0 for Sunday, 1 for Monday... matching our TimetableSlot dayOfWeek
    const dayOfWeek = targetDate.getDay(); 

    // Find all active slots for this day
    const slots = await prisma.timetableSlot.findMany({
      where: { userId: req.user!.id, dayOfWeek, active: true },
      include: { subject: true },
      orderBy: { startTime: 'asc' }
    });

    // Find all attendance records for this date
    // Note: since date timezones can be tricky, we should match exact YYYY-MM-DD by parsing at UTC or local.
    // For simplicity, we assume the frontend sends a date string and we compare the DATE parts.
    // However, Prisma stores DateTime. Let's find records where date >= targetDate at 00:00 and < targetDate + 1 day
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23,59,59,999);

    const attendances = await prisma.attendance.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    const attendanceMap = new Map();
    for (const a of attendances) {
      if (a.timetableSlotId) attendanceMap.set(a.timetableSlotId, a);
    }

    // Merge slots and attendance
    const results = slots.map(slot => {
      const record = attendanceMap.get(slot.id);
      return {
        timetableSlotId: slot.id,
        subject: slot.subject,
        startTime: slot.startTime,
        endTime: slot.endTime,
        lectureNumber: slot.lectureNumber,
        room: slot.room,
        attendanceId: record?.id || null,
        status: record?.status || 'PENDING', // PENDING, PRESENT, ABSENT, CANCELLED
      };
    });

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/range?start=YYYY-MM-DD&end=YYYY-MM-DD
// Used for calendar view to fetch all active slots and recorded attendance over a range
router.get('/range', async (req: AuthRequest, res: Response) => {
  const { start, end } = req.query;

  if (!start || !end) {
    res.status(400).json({ error: 'Start and end dates required' });
    return;
  }

  try {
    const startDate = new Date(start as string);
    startDate.setUTCHours(0,0,0,0);
    const endDate = new Date(end as string);
    endDate.setUTCHours(23,59,59,999);

    // Get all active timetable slots
    const slots = await prisma.timetableSlot.findMany({
      where: { userId: req.user!.id, active: true },
      include: { subject: true }
    });

    // Get all attendance records in range
    const attendances = await prisma.attendance.findMany({
      where: {
        userId: req.user!.id,
        date: { gte: startDate, lte: endDate }
      }
    });

    // We generate a flat array of 'events' for the calendar
    const events: any[] = [];
    
    // Map existing attendance for quick lookup: map[YYYY-MM-DD][slotId] = record
    const attendanceMap: Record<string, Record<string, any>> = {};
    for (const a of attendances) {
      const dStr = a.date.toISOString().split('T')[0];
      if (!attendanceMap[dStr]) attendanceMap[dStr] = {};
      if (a.timetableSlotId) {
        attendanceMap[dStr][a.timetableSlotId] = a;
      }
    }

    // Loop through every day in range
    for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
      const dStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getUTCDay();

      // Find slots for this day of week
      const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek);

      for (const slot of daySlots) {
        const record = attendanceMap[dStr]?.[slot.id];
        events.push({
          date: dStr,
          timetableSlotId: slot.id,
          subject: slot.subject,
          startTime: slot.startTime,
          endTime: slot.endTime,
          lectureNumber: slot.lectureNumber,
          room: slot.room,
          attendanceId: record?.id || null,
          status: record?.status || 'PENDING'
        });
      }
    }

    res.json(events);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch range' });
  }
});

// POST /api/attendance
// Mark attendance for a specific slot on a specific date
router.post('/', async (req: AuthRequest, res: Response) => {
  const { timetableSlotId, subjectId, date, status } = req.body;

  if (!timetableSlotId || !subjectId || !date || !status) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const targetDate = new Date(date);
    targetDate.setUTCHours(12,0,0,0); // Use noon to avoid timezone shift dropping it to previous day

    // Upsert the attendance record
    // Wait, prisma upsert needs a unique identifier. We have a unique constraint on [userId, timetableSlotId, date]
    // Since date is tricky in unique constraints with time components, let's just findFirst and then update or create.
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0,0,0,0);
    const endOfDay = new Date(targetDate);
    endOfDay.setUTCHours(23,59,59,999);

    const existing = await prisma.attendance.findFirst({
      where: {
        userId: req.user!.id,
        timetableSlotId,
        date: { gte: startOfDay, lte: endOfDay }
      }
    });

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: { status }
      });
      res.json(updated);
    } else {
      const created = await prisma.attendance.create({
        data: {
          userId: req.user!.id,
          timetableSlotId,
          subjectId,
          date: targetDate,
          status
        }
      });
      res.status(201).json(created);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// GET /api/attendance/summary
// Calculate overall and subject-wise attendance percentages
router.get('/summary', async (req: AuthRequest, res: Response) => {
  try {
    // We only calculate based on recorded (completed) lectures. 
    // "Do not count: Future lectures, Cancelled lectures, Unmarked future lectures"
    const attendances = await prisma.attendance.findMany({
      where: { 
        userId: req.user!.id,
        status: { in: ['PRESENT', 'ABSENT'] } 
      },
      include: { subject: true }
    });

    const user = await prisma.user.findUnique({ where: { id: req.user!.id }});
    const defaultReq = user?.defaultRequiredAttendance || 75.0;

    let totalPresent = 0;
    let totalClasses = 0;
    
    const subjectStats: Record<string, any> = {};

    for (const a of attendances) {
      totalClasses++;
      if (a.status === 'PRESENT') totalPresent++;

      const subId = a.subjectId;
      if (!subjectStats[subId]) {
        subjectStats[subId] = {
          subject: a.subject,
          present: 0,
          total: 0,
          required: a.subject.requiredAttendance || defaultReq
        };
      }
      subjectStats[subId].total++;
      if (a.status === 'PRESENT') {
        subjectStats[subId].present++;
      }
    }

    const overallPercentage = totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0;
    const overallIntelligence = calculateAttendanceIntelligence(totalPresent, totalClasses, defaultReq);
    
    const subjects = Object.values(subjectStats).map(stat => {
      const percentage = stat.total > 0 ? (stat.present / stat.total) * 100 : 0;
      const intelligence = calculateAttendanceIntelligence(stat.present, stat.total, stat.required);
      return {
        ...stat,
        percentage,
        intelligence
      };
    });

    res.json({
      overall: {
        present: totalPresent,
        total: totalClasses,
        percentage: overallPercentage,
        required: defaultReq,
        intelligence: overallIntelligence
      },
      subjects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

export default router;
