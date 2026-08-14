import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../prisma';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  // Auto-sync user to local DB to prevent foreign key constraint issues
  // if they skipped the explicit register route or it failed.
  try {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {}, // Do nothing if exists
      create: {
        id: user.id,
        email: user.email || '',
        name: user.user_metadata?.name || 'User',
        defaultRequiredAttendance: 75.0,
      }
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      console.warn('Email exists for a different ID. Recovering...');
      try {
        await prisma.user.delete({ where: { email: user.email } });
        await prisma.user.upsert({
          where: { id: user.id },
          update: {},
          create: {
            id: user.id,
            email: user.email || '',
            name: user.user_metadata?.name || 'User',
            defaultRequiredAttendance: 75.0,
          }
        });
      } catch (retryErr: any) {
        console.error("Failed to recover user sync:", retryErr.message);
      }
    } else {
      console.error("Failed to auto-sync user in requireAuth:", err.message);
    }
  }

  req.user = { id: user.id, email: user.email };
  next();
};
