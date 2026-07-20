/**
 * Child iCloud Provisioning API
 * ============================================================================
 * POST   /api/admin/children/[id]/icloud   — Provision iCloud email + calendar
 * GET    /api/admin/children/[id]/icloud   — Get iCloud connection status
 * DELETE /api/admin/children/[id]/icloud   — Disconnect iCloud account
 *
 * Provisions iCloud IMAP email via CIG and CalDAV calendar via the existing
 * AppleCalendarSyncService — same pattern as adult onboarding but scoped to
 * a child account and verified through guardian access.
 *
 * Requires: parent/guardian NextAuth session, verifyGuardian check.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import dbPool from '@/lib/db/client';
import { verifyGuardian } from '@/lib/platform/guardian-access';
import { appleCalendarSync, getSyncAccounts } from '@/lib/calendar';
import { issueScopedSecretToken, deriveSecretPath, deriveScopes } from '@/lib/platform/scoped-secrets';

const CIG_URL = process.env.CIG_URL || 'http://localhost:8780';
const CIG_API_KEY = process.env.CIG_API_KEY || 'cig-api-key-prod-2024';
const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'your-development-secret-change-in-production';

const ICLOUD_IMAP_HOST = 'imap.mail.me.com';
const ICLOUD_IMAP_PORT = 993;
const ICLOUD_SMTP_HOST = 'smtp.mail.me.com';
const ICLOUD_SMTP_PORT = 587;
const APPLE_CALDAV_URL = 'https://caldav.icloud.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const guardianId = (session.user as any).id;
  const { id } = req.query;
  const childId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  if (!childId) {
    return res.status(400).json({ error: 'Child ID is required' });
  }

  // Verify guardian access
  const isGuardian = await verifyGuardian(dbPool, guardianId, childId);
  if (!isGuardian) {
    return res.status(403).json({ error: 'Not authorized for this child' });
  }

  switch (req.method) {
    case 'GET':
      return handleGetStatus(childId, res);
    case 'POST':
      return handleProvision(childId, guardianId, req.body, res);
    case 'PUT':
      return handleUpdate(childId, req.body, res);
    case 'DELETE':
      return handleDisconnect(childId, req.body, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
}

// ============================================================================
// GET — iCloud connection status for child
// ============================================================================

async function handleGetStatus(childId: string, res: NextApiResponse) {
  try {
    // Check calendar sync accounts
    const calendarAccounts = await getSyncAccounts(childId);
    const appleCalendarAccount = calendarAccounts.find(a => a.provider === 'apple_calendar');

    // Get actual synced calendars for this child with visibility
    let syncedCalendars: any[] = [];
    try {
      const calsResult = await dbPool.query(
        `SELECT id, name, color, visibility, sync_enabled
         FROM calendar.calendars
         WHERE owner_id = $1 AND calendar_type = 'synced_apple' AND NOT archived
         ORDER BY name`,
        [childId],
      );
      syncedCalendars = calsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        color: row.color,
        selected: row.sync_enabled,
        visible: row.visibility === 'family' || row.visibility === 'public',
        visibility: row.visibility,
      }));
    } catch { /* table may not exist or no rows */ }

    // Check CIG email enrollment
    let emailConnected = false;
    let emailError: string | undefined;
    try {
      const childResult = await dbPool.query(
        'SELECT email FROM public.users WHERE id = $1',
        [childId],
      );
      const childEmail = childResult.rows[0]?.email;
      if (childEmail) {
        const cigResponse = await fetch(`${CIG_URL}/v1/accounts/status`, {
          headers: {
            'X-API-Key': CIG_API_KEY,
            'X-User-ID': childId,
          },
        });
        if (cigResponse.ok) {
          const cigData = await cigResponse.json();
          emailConnected = cigData.connected ?? cigData.status === 'active';
        }
      }
    } catch {
      emailError = 'CIG unreachable';
    }

    return res.status(200).json({
      email: {
        connected: emailConnected,
        error: emailError,
        provider: 'icloud',
        imapHost: ICLOUD_IMAP_HOST,
        imapPort: ICLOUD_IMAP_PORT,
        smtpHost: ICLOUD_SMTP_HOST,
        smtpPort: ICLOUD_SMTP_PORT,
      },
      calendar: {
        connected: !!appleCalendarAccount,
        accountId: appleCalendarAccount?.id,
        accountEmail: appleCalendarAccount?.account_email,
        lastSyncAt: appleCalendarAccount?.last_sync_at,
        lastSyncStatus: appleCalendarAccount?.last_sync_status,
        calendars: syncedCalendars.length > 0 ? syncedCalendars : (appleCalendarAccount?.discovered_calendars ?? []),
      },
    });
  } catch (error) {
    console.error('[Child iCloud] GET status error:', error);
    return res.status(500).json({ error: 'Failed to get iCloud status' });
  }
}

// ============================================================================
// POST — Provision iCloud email + calendar for child
// ============================================================================

async function handleProvision(
  childId: string,
  guardianId: string,
  body: {
    icloudEmail: string;
    appSpecificPassword: string;
    enableCalendar?: boolean;
    enableEmail?: boolean;
  },
  res: NextApiResponse,
) {
  const { icloudEmail, appSpecificPassword, enableCalendar = true, enableEmail = true } = body;

  if (!icloudEmail || !appSpecificPassword) {
    return res.status(400).json({
      error: 'icloudEmail and appSpecificPassword are required',
    });
  }

  // Get child's tenant for scoped secrets
  let tenantId: string | undefined;
  try {
    const tenantResult = await dbPool.query(
      `SELECT tm.tenant_id FROM public.tenant_memberships tm
       WHERE tm.user_id = $1 AND tm.status = 'active' LIMIT 1`,
      [childId],
    );
    tenantId = tenantResult.rows[0]?.tenant_id;
  } catch { /* non-fatal */ }

  const results: { email?: any; calendar?: any; errors: string[] } = { errors: [] };

  // ─── 1. Provision Email via CIG ──────────────────────────────────────────
  if (enableEmail) {
    try {
      // Issue scoped secret token for the IMAP password
      let scopedSecretToken: string | undefined;
      try {
        const secretPath = deriveSecretPath(icloudEmail, 'imap');
        const scopes = deriveScopes('imap');
        const scoped = issueScopedSecretToken({
          userId: childId,
          tenantId,
          secretPath,
          scopes,
          config: { secret: JWT_SECRET },
        });
        scopedSecretToken = scoped.token;
      } catch { /* fall back to legacy */ }

      const cigResponse = await fetch(`${CIG_URL}/v1/accounts/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CIG_API_KEY,
          'X-User-ID': childId,
        },
        body: JSON.stringify({
          email: icloudEmail,
          imap_host: ICLOUD_IMAP_HOST,
          imap_port: ICLOUD_IMAP_PORT,
          imap_username: icloudEmail,
          imap_scoped_token: scopedSecretToken,
          imap_app_password: scopedSecretToken ? undefined : appSpecificPassword,
        }),
      });

      if (cigResponse.ok) {
        const cigData = await cigResponse.json();
        results.email = {
          connected: true,
          provider: 'icloud',
          cigResponse: cigData,
          scopedSecretUsed: !!scopedSecretToken,
        };
      } else {
        const errorText = await cigResponse.text();
        results.errors.push(`Email provisioning failed: CIG returned ${cigResponse.status} - ${errorText.substring(0, 200)}`);
        results.email = { connected: false, error: `CIG error: ${cigResponse.status}` };
      }
    } catch (error) {
      results.errors.push(`Email provisioning error: ${(error as Error).message}`);
      results.email = { connected: false, error: (error as Error).message };
    }
  }

  // ─── 2. Provision Calendar via CalDAV ────────────────────────────────────
  if (enableCalendar) {
    try {
      const account = await appleCalendarSync.connectAccount({
        owner_id: childId,
        username: icloudEmail,
        password: appSpecificPassword,
      });

      results.calendar = {
        connected: true,
        accountId: account.id,
        accountEmail: account.account_email,
        calendars: account.discovered_calendars,
      };

      // Trigger initial sync
      try {
        await appleCalendarSync.syncFromApple(account.id);
        results.calendar.initialSync = 'completed';
      } catch (syncError) {
        results.calendar.initialSync = 'failed';
        results.errors.push(`Calendar initial sync failed: ${(syncError as Error).message}`);
      }
    } catch (error) {
      const errorMsg = (error as Error).message;
      results.errors.push(`Calendar provisioning error: ${errorMsg}`);
      results.calendar = {
        connected: false,
        error: errorMsg.includes('401') || errorMsg.includes('Unauthorized')
          ? 'Invalid iCloud credentials. Make sure you\'re using an app-specific password.'
          : errorMsg,
      };
    }
  }

  // ─── 3. Log activity ─────────────────────────────────────────────────────
  try {
    await dbPool.query(
      `INSERT INTO child_activity_log (child_user_id, activity_type, service_id, metadata)
       VALUES ($1, 'icloud_provisioning', 'icloud-setup', $2)`,
      [
        childId,
        JSON.stringify({
          guardianId,
          emailConnected: results.email?.connected ?? false,
          calendarConnected: results.calendar?.connected ?? false,
          errors: results.errors,
          timestamp: new Date().toISOString(),
        }),
      ],
    );
  } catch { /* non-fatal */ }

  const overallSuccess =
    (results.email?.connected || !enableEmail) &&
    (results.calendar?.connected || !enableCalendar);

  return res.status(overallSuccess ? 200 : 207).json({
    success: overallSuccess,
    message: overallSuccess
      ? 'iCloud email and calendar connected successfully'
      : 'iCloud setup completed with some errors',
    results,
  });
}

// ============================================================================
// PUT — Update iCloud settings (e.g. calendar visibility)
// ============================================================================

async function handleUpdate(
  childId: string,
  body: { action?: string; calendarId?: string; visible?: boolean },
  res: NextApiResponse,
) {
  const { action = 'calendar-visibility', calendarId, visible } = body;

  if (action === 'calendar-visibility') {
    if (!calendarId || visible === undefined) {
      return res.status(400).json({ error: 'calendarId and visible are required' });
    }

    try {
      // Ensure the calendar belongs to the child
      const calResult = await dbPool.query(
        `SELECT id FROM calendar.calendars WHERE id = $1 AND owner_id = $2`,
        [calendarId, childId],
      );

      if (calResult.rows.length === 0) {
        return res.status(404).json({ error: 'Calendar not found for this child' });
      }

      const visibility = visible ? 'family' : 'private';
      await dbPool.query(
        `UPDATE calendar.calendars SET visibility = $1, updated_at = NOW() WHERE id = $2`,
        [visibility, calendarId],
      );

      return res.status(200).json({
        success: true,
        calendarId,
        visible,
        visibility,
      });
    } catch (error) {
      console.error('[Child iCloud] Update visibility error:', error);
      return res.status(500).json({ error: 'Failed to update calendar visibility' });
    }
  }

  return res.status(400).json({ error: 'Unknown update action' });
}

// ============================================================================
// DELETE — Disconnect iCloud account for child
// ============================================================================

async function handleDisconnect(
  childId: string,
  body: { disconnectEmail?: boolean; disconnectCalendar?: boolean; calendarAccountId?: string },
  res: NextApiResponse,
) {
  const { disconnectEmail = true, disconnectCalendar = true, calendarAccountId } = body;
  const results: { errors: string[] } = { errors: [] };

  // Disconnect calendar
  if (disconnectCalendar) {
    try {
      // Find Apple Calendar sync account for this child
      let accountId = calendarAccountId;
      if (!accountId) {
        const accounts = await getSyncAccounts(childId);
        const appleAccount = accounts.find(a => a.provider === 'apple_calendar');
        accountId = appleAccount?.id;
      }

      if (accountId) {
        // Remove linked calendars and events
        await dbPool.query(
          `DELETE FROM calendar.calendars WHERE sync_account_id = $1`,
          [accountId],
        );
        await dbPool.query(
          `DELETE FROM calendar.sync_accounts WHERE id = $1 AND owner_id = $2`,
          [accountId, childId],
        );
      }
    } catch (error) {
      results.errors.push(`Calendar disconnect error: ${(error as Error).message}`);
    }
  }

  // Disconnect email (CIG)
  if (disconnectEmail) {
    try {
      const cigResponse = await fetch(`${CIG_URL}/v1/accounts/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': CIG_API_KEY,
          'X-User-ID': childId,
        },
      });
      if (!cigResponse.ok) {
        results.errors.push(`Email disconnect: CIG returned ${cigResponse.status}`);
      }
    } catch (error) {
      results.errors.push(`Email disconnect error: ${(error as Error).message}`);
    }
  }

  return res.status(200).json({
    success: results.errors.length === 0,
    message: results.errors.length === 0
      ? 'iCloud accounts disconnected'
      : 'Disconnect completed with errors',
    results,
  });
}
