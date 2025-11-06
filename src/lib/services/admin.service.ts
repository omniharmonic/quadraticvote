import { supabase, createServiceRoleClient } from '@/lib/supabase';
import { generateInviteCode } from '@/lib/utils/auth';
import type { User } from '@supabase/supabase-js';
import type { EventAdmin, AdminInvitation, NewEventAdmin, NewAdminInvitation } from '@/lib/db/auth-schema';

export class AdminService {
  /**
   * Check if a user is an admin of a specific event
   */
  async isEventAdmin(userId: string, eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select('id')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error checking admin status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  /**
   * Get user's admin role for an event
   */
  async getAdminRole(userId: string, eventId: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', userId)
        .single();

      if (error) {
        return null;
      }

      return data.role;
    } catch (error) {
      console.error('Error getting admin role:', error);
      return null;
    }
  }

  /**
   * Add a user as an admin to an event
   */
  async addEventAdmin(
    eventId: string,
    userId: string,
    role: 'owner' | 'admin' = 'admin',
    invitedBy?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('event_admins')
        .insert({
          event_id: eventId,
          user_id: userId,
          role,
          invited_by: invitedBy
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error adding event admin:', error);
      return { success: false, error: 'Failed to add admin' };
    }
  }

  /**
   * Remove a user as admin from an event
   */
  async removeEventAdmin(eventId: string, userId: string, removedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if the person doing the removal has permission
      const removerRole = await this.getAdminRole(removedBy, eventId);
      const targetRole = await this.getAdminRole(userId, eventId);

      if (!removerRole) {
        return { success: false, error: 'You are not an admin of this event' };
      }

      // Owners can remove anyone, admins can only remove other admins (not owners)
      if (removerRole === 'admin' && targetRole === 'owner') {
        return { success: false, error: 'Cannot remove event owner' };
      }

      // Cannot remove yourself if you're the only owner
      if (removedBy === userId && targetRole === 'owner') {
        const { data: otherOwners } = await supabase
          .from('event_admins')
          .select('id')
          .eq('event_id', eventId)
          .eq('role', 'owner')
          .neq('user_id', userId);

        if (!otherOwners || otherOwners.length === 0) {
          return { success: false, error: 'Cannot remove yourself as the only owner' };
        }
      }

      const { error } = await supabase
        .from('event_admins')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', userId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error removing event admin:', error);
      return { success: false, error: 'Failed to remove admin' };
    }
  }

  /**
   * Get all admins for an event
   */
  async getEventAdmins(eventId: string): Promise<Array<EventAdmin & { user: { email: string } }>> {
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select(`
          *,
          user:users(email)
        `)
        .eq('event_id', eventId)
        .order('role') // owners first
        .order('created_at');

      if (error) {
        console.error('Error fetching event admins:', error);
        return [];
      }

      return data as any;
    } catch (error) {
      console.error('Error fetching event admins:', error);
      return [];
    }
  }

  /**
   * Get all events where user is admin
   */
  async getUserAdminEvents(userId: string): Promise<Array<EventAdmin & { event: any }>> {
    try {
      const { data, error } = await supabase
        .from('event_admins')
        .select(`
          *,
          event:events(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user admin events:', error);
        return [];
      }

      return data as any;
    } catch (error) {
      console.error('Error fetching user admin events:', error);
      return [];
    }
  }

  /**
   * Send admin invitation
   */
  async inviteAdmin(
    eventId: string,
    email: string,
    role: 'admin' | 'owner' = 'admin',
    invitedBy: string
  ): Promise<{ success: boolean; inviteCode?: string; error?: string }> {
    try {
      // Check if inviter has permission
      const inviterRole = await this.getAdminRole(invitedBy, eventId);
      if (!inviterRole) {
        return { success: false, error: 'You are not an admin of this event' };
      }

      // Only owners can invite other owners
      if (role === 'owner' && inviterRole !== 'owner') {
        return { success: false, error: 'Only owners can invite other owners' };
      }

      // Check if user is already an admin
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

      if (existingUser) {
        const isAlreadyAdmin = await this.isEventAdmin(existingUser.id, eventId);
        if (isAlreadyAdmin) {
          return { success: false, error: 'User is already an admin of this event' };
        }
      }

      // Check for existing pending invitation
      const { data: existingInvite } = await supabase
        .from('admin_invitations')
        .select('id')
        .eq('event_id', eventId)
        .eq('email', email)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        return { success: false, error: 'Invitation already sent to this email' };
      }

      // Create invitation
      const inviteCode = generateInviteCode();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      const { error } = await supabase
        .from('admin_invitations')
        .insert({
          event_id: eventId,
          email,
          role,
          invite_code: inviteCode,
          invited_by: invitedBy,
          expires_at: expiresAt.toISOString()
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, inviteCode };
    } catch (error) {
      console.error('Error inviting admin:', error);
      return { success: false, error: 'Failed to send invitation' };
    }
  }

  /**
   * Accept admin invitation
   */
  async acceptInvitation(inviteCode: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get invitation details
      const { data: invitation, error: inviteError } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('invite_code', inviteCode)
        .is('accepted_at', null)
        .single();

      if (inviteError || !invitation) {
        return { success: false, error: 'Invalid or expired invitation' };
      }

      // Check if invitation has expired
      if (new Date() > new Date(invitation.expires_at)) {
        return { success: false, error: 'Invitation has expired' };
      }

      // Get user email to verify
      const { data: user } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();

      if (!user || user.email !== invitation.email) {
        return { success: false, error: 'Invitation email does not match your account' };
      }

      // Add user as admin
      const addResult = await this.addEventAdmin(
        invitation.event_id,
        userId,
        invitation.role as 'owner' | 'admin',
        invitation.invited_by
      );

      if (!addResult.success) {
        return addResult;
      }

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('admin_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: userId
        })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
        // Don't fail the whole operation for this
      }

      return { success: true };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return { success: false, error: 'Failed to accept invitation' };
    }
  }

  /**
   * Get pending invitations for an event
   */
  async getEventInvitations(eventId: string): Promise<AdminInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('admin_invitations')
        .select('*')
        .eq('event_id', eventId)
        .is('accepted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return [];
      }

      return data;
    } catch (error) {
      console.error('Error fetching invitations:', error);
      return [];
    }
  }

  /**
   * Server-side: Verify user has admin access to event
   * Used in API routes
   */
  async verifyEventAccess(
    userToken: string,
    eventId: string
  ): Promise<{ isAuthorized: boolean; user?: User; role?: string; error?: string }> {
    try {
      // Verify JWT token
      const serviceRoleClient = createServiceRoleClient();
      const { data: { user }, error: authError } = await serviceRoleClient.auth.getUser(userToken);

      if (authError || !user) {
        return { isAuthorized: false, error: 'Invalid authentication token' };
      }

      // Check admin status
      const isAdmin = await this.isEventAdmin(user.id, eventId);
      if (!isAdmin) {
        return { isAuthorized: false, error: 'Not authorized to access this event' };
      }

      const role = await this.getAdminRole(user.id, eventId);

      return {
        isAuthorized: true,
        user,
        role: role || 'admin'
      };
    } catch (error) {
      console.error('Error verifying event access:', error);
      return { isAuthorized: false, error: 'Authorization verification failed' };
    }
  }
}

export const adminService = new AdminService();