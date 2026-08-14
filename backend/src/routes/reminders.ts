import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/reminders
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const reminders = await prisma.reminder.findMany({
      where: { userId: req.user!.id },
      include: {
        timetableSlot: {
          include: { subject: true }
        }
      }
    });
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reminders' });
  }
});

// POST /api/reminders
router.post('/', async (req: AuthRequest, res: Response) => {
  const { timetableSlotId, minutesBefore } = req.body;
  if (!timetableSlotId || minutesBefore === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  
  try {
    // Check if slot exists and belongs to user
    const slot = await prisma.timetableSlot.findFirst({
      where: { id: timetableSlotId, userId: req.user!.id }
    });

    if (!slot) {
      res.status(404).json({ error: 'Timetable slot not found' });
      return;
    }

    const reminder = await prisma.reminder.create({
      data: {
        userId: req.user!.id,
        timetableSlotId,
        minutesBefore,
        enabled: true
      },
      include: {
        timetableSlot: {
          include: { subject: true }
        }
      }
    });
    res.status(201).json(reminder);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create reminder', details: error.message });
  }
});

// DELETE /api/reminders/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!reminder) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }

    await prisma.reminder.delete({ where: { id } });
    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete reminder', details: error.message });
  }
});

// GET /api/reminders/upcoming
// Returns classes coming up in the next 24 hours to display in a notification center
router.get('/upcoming', async (req: AuthRequest, res: Response) => {
  try {
    // A simplified upcoming logic: get today's slots that haven't passed yet
    const today = new Date();
    const dayOfWeek = today.getDay();
    const currentHour = today.getHours();
    const currentMinute = today.getMinutes();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    const slots = await prisma.timetableSlot.findMany({
      where: { 
        userId: req.user!.id, 
        active: true,
        dayOfWeek: dayOfWeek,
        startTime: { gte: currentTimeStr }
      },
      include: { subject: true },
      orderBy: { startTime: 'asc' }
    });

    res.json(slots);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch upcoming classes', details: error.message });
  }
});

export default router;
