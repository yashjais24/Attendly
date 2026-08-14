import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// GET /api/timetable
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const slots = await prisma.timetableSlot.findMany({
      where: { userId: req.user!.id, active: true },
      include: { subject: true },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch timetable slots' });
  }
});

// POST /api/timetable
// Can accept a single slot or an array of slots (useful for splitting blocks)
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const slotsData = Array.isArray(req.body) ? req.body : [req.body];
    
    // Process all slots
    const results = [];
    for (const slot of slotsData) {
      const { subjectId, dayOfWeek, startTime, endTime, lectureNumber, room } = slot;
      
      if (!subjectId || dayOfWeek === undefined || !startTime || !endTime || !lectureNumber) {
        res.status(400).json({ error: 'Missing required fields for one or more slots' });
        return;
      }

      const created = await prisma.timetableSlot.create({
        data: {
          userId: req.user!.id,
          subjectId,
          dayOfWeek,
          startTime,
          endTime,
          lectureNumber,
          room
        },
        include: { subject: true }
      });
      results.push(created);
    }
    
    res.status(201).json(Array.isArray(req.body) ? results : results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create timetable slot(s)' });
  }
});

// PATCH /api/timetable/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { subjectId, dayOfWeek, startTime, endTime, lectureNumber, room, active } = req.body;

  try {
    const existing = await prisma.timetableSlot.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Slot not found' });
      return;
    }

    const updated = await prisma.timetableSlot.update({
      where: { id },
      data: { subjectId, dayOfWeek, startTime, endTime, lectureNumber, room, active },
      include: { subject: true }
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update slot' });
  }
});

// DELETE /api/timetable/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const existing = await prisma.timetableSlot.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Slot not found' });
      return;
    }

    // Usually we might want to soft delete if it has attendance records tied to it
    // Wait, the prompt: "Changing timetable should not destroy historical attendance."
    // So instead of a hard delete, we set active = false, OR we delete it and keep the Attendance records. 
    // Wait, Attendance is linked to TimetableSlot `timetableSlotId`. If we hard delete the slot, the relation might cause issues if not configured for cascade/set null.
    // In our schema: `timetableSlot   TimetableSlot? @relation(...)` (it's optional!).
    // So if we delete the slot, Prisma might fail if there's a restriction, or we can just set `active = false` to hide it from the UI but preserve history.
    await prisma.timetableSlot.update({
      where: { id },
      data: { active: false }
    });
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete slot' });
  }
});

export default router;
