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