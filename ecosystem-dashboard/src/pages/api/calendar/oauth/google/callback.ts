/**
 * Google Calendar OAuth Callback
 * Handles the OAuth callback and token exchange
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://eleazar@localhost/ecosystem_unified',
});

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CALENDAR_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXTAUTH_URL + '/api/calendar/oauth/google/callback';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { code, state, error } = req.query;

  if (error) {
    return res.redirect(`/settings/calendar?error=${encodeURIComponent(error as string)}`);
  }

  if (!code || !state) {
    return res.redirect('/settings/calendar?error=missing_params');
  }

  try {
    // Decode state
    const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
    const { userId, returnUrl } = stateData;

    if (!userId) {
      return res.redirect('/settings/calendar?error=invalid_state');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code as string,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Token exchange failed:', errorData);
      return res.redirect(`/settings/calendar?error=token_exchange_failed`);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const userInfo = await userInfoResponse.json();

    // Store the sync account
    await pool.query(`
      INSERT INTO calendar_sync_accounts (
        user_id, provider, account_email, account_name,
        access_token, refresh_token, token_expires_at, sync_enabled
      ) VALUES ($1, 'google', $2, $3, $4, $5, $6, true)
      ON CONFLICT (user_id, provider, account_email) 
      DO UPDATE SET 
        access_token = EXCLUDED.access_token,
        refresh_token = COALESCE(EXCLUDED.refresh_token, calendar_sync_accounts.refresh_token),
        token_expires_at = EXCLUDED.token_expires_at,
        account_name = EXCLUDED.account_name,
        sync_enabled = true,
        updated_at = NOW()
    `, [
      userId,
      userInfo.email,
      userInfo.name || userInfo.email,
      tokens.access_token,
      tokens.refresh_token,
      tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
    ]);

    // Fetch and store calendars
    await syncGoogleCalendars(userId, userInfo.email, tokens.access_token);

    return res.redirect(`${returnUrl || '/settings/calendar'}?success=google_connected`);
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect('/settings/calendar?error=callback_failed');
  }
}

async function syncGoogleCalendars(userId: string, accountEmail: string, accessToken: string) {
  try {
    // Get the sync account ID
    const accountResult = await pool.query(
      `SELECT id FROM calendar_sync_accounts WHERE user_id = $1 AND provider = 'google' AND account_email = $2`,
      [userId, accountEmail]
    );

    if (accountResult.rows.length === 0) return;
    const syncAccountId = accountResult.rows[0].id;

    // Fetch calendars from Google
    const calendarsResponse = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!calendarsResponse.ok) return;

    const calendarsData = await calendarsResponse.json();

    // Store calendars
    for (const cal of calendarsData.items || []) {
      await pool.query(`
        INSERT INTO calendar_sync_calendars (sync_account_id, external_id, name, color, sync_enabled)
        VALUES ($1, $2, $3, $4, true)
        ON CONFLICT (sync_account_id, external_id) DO UPDATE SET
          name = EXCLUDED.name,
          color = EXCLUDED.color
      `, [syncAccountId, cal.id, cal.summary, cal.backgroundColor]);
    }

    // Update last sync
    await pool.query(
      `UPDATE calendar_sync_accounts SET last_sync_at = NOW(), last_sync_status = 'success' WHERE id = $1`,
      [syncAccountId]
    );
  } catch (error) {
    console.error('Failed to sync Google calendars:', error);
  }
}
