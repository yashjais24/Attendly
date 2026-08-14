import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply auth middleware to all subject routes
router.use(requireAuth);

// GET /api/subjects
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const subjects = await prisma.subject.findMany({
      where: { userId: req.user!.id },
      orderBy: { name: 'asc' }
    });
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch subjects' });
  }
});

// POST /api/subjects
router.post('/', async (req: AuthRequest, res: Response) => {
  console.log('🔥 POST /api/subjects HIT');
  console.log('BODY:', req.body);
  console.log('USER:', req.user);

  const { name, code, teacher, room, requiredAttendance, color } = req.body;

  if (!name || !code) {
    res.status(400).json({ error: 'Name and Code are required' });
    return;
  }

  try {
    console.log('🔥 About to call Prisma');

    const subject = await prisma.subject.create({
      data: {
        userId: req.user!.id,
        name,
        code,
        teacher,
        room,
        requiredAttendance,
        color
      }
    });

    console.log('✅ Prisma created subject:', subject);

    res.status(201).json(subject);
  } catch (error: any) {
    console.error('❌ CREATE SUBJECT ERROR:', error);

    res.status(500).json({
      error: 'Failed to create subject',
      details: error.message
    });
  }
});

// PATCH /api/subjects/:id
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;
  const { name, code, teacher, room, requiredAttendance, color } = req.body;

  try {
    // Ensure the subject belongs to the user
    const existing = await prisma.subject.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }

    const subject = await prisma.subject.update({
      where: { id },
      data: { name, code, teacher, room, requiredAttendance, color }
    });
    res.json(subject);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update subject' });
  }
});

// DELETE /api/subjects/:id
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const id = req.params.id as string;

  try {
    const existing = await prisma.subject.findFirst({
      where: { id, userId: req.user!.id }
    });

    if (!existing) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }

    await prisma.subject.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete subject' });
  }
});

export default router;
