import { Router, Request, Response } from 'express';
import { prisma } from '../prisma';

const router = Router();

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { id, email, name } = req.body;
  
  if (!id || !email) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  try {
    const user = await prisma.user.create({
      data: {
        id,
        email,
        name,
        defaultRequiredAttendance: 75.0,
      }
    });
    res.status(201).json(user);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'P2002') {
      // User might already exist if Supabase sync was retried
      res.status(200).json({ message: 'User already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

export default router;
