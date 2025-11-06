import { db } from '@/lib/db/supabase-client';
import { events } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Verify admin code for an event
 */
export async function verifyAdminCode(eventId: string, adminCode: string): Promise<boolean> {
  try {
    const eventResults = await db.select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventResults[0];

    if (!event) return false;

    return event.adminCode === adminCode;
  } catch (error) {
    console.error('Error verifying admin code:', error);
    return false;
  }
}

/**
 * Get event by admin code
 */
export async function getEventByAdminCode(adminCode: string): Promise<any | null> {
  try {
    const eventResults = await db.select()
      .from(events)
      .where(eq(events.adminCode, adminCode))
      .limit(1);

    return eventResults[0] || null;
  } catch (error) {
    console.error('Error getting event by admin code:', error);
    return null;
  }
}