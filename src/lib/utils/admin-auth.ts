import { supabase } from '@/lib/db/supabase-client';

/**
 * Verify admin code for an event
 */
export async function verifyAdminCode(eventId: string, adminCode: string): Promise<boolean> {
  try {
    const { data: event, error } = await supabase
      .from('events')
      .select('admin_code')
      .eq('id', eventId)
      .single();

    if (error || !event) return false;

    // Temporary fix: if admin_code doesn't exist in the schema, allow admin access for development
    // This should be removed once admin_code column is properly added to production schema
    if (event.admin_code === undefined || event.admin_code === null) {
      console.warn(`Warning: Event ${eventId} has no admin_code - allowing admin access for development`);
      return true; // TEMPORARY: Allow admin access when no admin_code exists
    }

    return event.admin_code === adminCode;
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
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('admin_code', adminCode)
      .single();

    return error ? null : event;
  } catch (error) {
    console.error('Error getting event by admin code:', error);
    return null;
  }
}