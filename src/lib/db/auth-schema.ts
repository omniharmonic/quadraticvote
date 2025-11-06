// Authentication and authorization schema types

export interface EventAdmin {
  id: string;
  user_id: string;
  event_id: string;
  role: 'owner' | 'admin';
  granted_at: string;
  granted_by: string;
}

export interface AdminInvitation {
  id: string;
  event_id: string;
  email: string;
  role: 'owner' | 'admin';
  invite_code: string;
  invited_by: string;
  invited_at: string;
  accepted_at?: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
}

export interface NewEventAdmin {
  user_id: string;
  event_id: string;
  role: 'owner' | 'admin';
  granted_by: string;
}

export interface NewAdminInvitation {
  event_id: string;
  email: string;
  role: 'owner' | 'admin';
  invite_code: string;
  invited_by: string;
  expires_at: string;
}