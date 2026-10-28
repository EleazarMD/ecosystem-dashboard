/**
 * Lesson pipeline access control.
 *
 * The lesson lifecycle routes create, generate, publish and assign the
 * material children see. They shipped with no session checks while the
 * dashboard is reachable from the public tunnel — every route now gates on
 * a signed-in adult; publishing is admin-only; assignment is restricted to
 * the child's own parent; children can only read lessons assigned to them.
 */
import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbPool from '@/lib/db/client';

export interface LessonAuth {
  userId: string;
  platformRole: string;
  accountType: string;
  isAdmin: boolean;
  isParent: boolean;
}

interface SessionUserShape {
  id?: unknown;
  platformRole?: unknown;
  accountType?: unknown;
  isParent?: unknown;
}

/** Signed-in session, or a 401 response and null. */
export async function lessonAuth(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<LessonAuth | null> {
  const session = await getServerSession(req, res, authOptions);
  const u = session?.user as SessionUserShape | undefined;
  const userId = typeof u?.id === 'string' ? u.id : '';
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return {
    userId,
    platformRole: typeof u?.platformRole === 'string' ? u.platformRole : 'member',
    accountType: typeof u?.accountType === 'string' ? u.accountType : 'standard',
    // The platform's admin value is 'platform-admin' (see useAuth/withAuth).
    isAdmin: u?.platformRole === 'platform-admin',
    isParent: u?.isParent === true,
  };
}

/** Signed-in adult (admin or parent) — the authoring/curator gate. */
export async function requireLessonAdult(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<LessonAuth | null> {
  const auth = await lessonAuth(req, res);
  if (!auth) return null;
  if (!auth.isAdmin && !auth.isParent) {
    res.status(403).json({ error: 'Adult account required' });
    return null;
  }
  return auth;
}

/** Admin-only — publishing to the shared catalog and registry changes. */
export async function requireLessonAdmin(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<LessonAuth | null> {
  const auth = await lessonAuth(req, res);
  if (!auth) return null;
  if (!auth.isAdmin) {
    res.status(403).json({ error: 'Admin account required' });
    return null;
  }
  return auth;
}

/** Admin, or the child's own parent. */
export async function canAssignChild(
  auth: LessonAuth,
  childUserId: string,
): Promise<boolean> {
  if (!childUserId || childUserId === auth.userId) return false;
  if (auth.isAdmin) return true;
  const r = await dbPool.query(
    'SELECT parent_user_id FROM users WHERE id = $1',
    [childUserId],
  );
  return r.rows[0]?.parent_user_id === auth.userId;
}
