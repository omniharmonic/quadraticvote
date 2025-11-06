import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Create service role client for admin operations
export const createServiceRoleClient = () => {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

// Enhanced database adapter using Supabase
export const db = {
  // Events operations
  events: {
    async create(data: any) {
      console.log('Creating event with data:', data);
      const { data: result, error } = await supabase
        .from('events')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Event creation error:', error);
        throw new Error(`Failed to create event: ${error.message}`);
      }

      return result;
    },

    async findById(id: string) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .is('deleted_at', null)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw new Error(`Failed to find event: ${error.message}`);
      }

      return data;
    },

    async findMany(filters?: any) {
      let query = supabase
        .from('events')
        .select('*')
        .is('deleted_at', null);

      if (filters?.visibility) {
        query = query.eq('visibility', filters.visibility);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to find events: ${error.message}`);
      }

      return data || [];
    }
  },

  // Options operations
  options: {
    async create(data: any[]) {
      if (!data || data.length === 0) return [];

      const { data: result, error } = await supabase
        .from('options')
        .insert(data)
        .select();

      if (error) {
        throw new Error(`Failed to create options: ${error.message}`);
      }

      return result;
    },

    async findByEventId(eventId: string) {
      const { data, error } = await supabase
        .from('options')
        .select('*')
        .eq('event_id', eventId);

      if (error) {
        throw new Error(`Failed to find options: ${error.message}`);
      }

      return data || [];
    }
  },

  // Invites operations
  invites: {
    async create(data: any[]) {
      if (!data || data.length === 0) return [];

      const { data: result, error } = await supabase
        .from('invites')
        .insert(data)
        .select();

      if (error) {
        throw new Error(`Failed to create invites: ${error.message}`);
      }

      return result;
    }
  },

  // Transaction support (sequential operations)
  async transaction(callback: (tx: any) => Promise<any>) {
    // Supabase doesn't have explicit transactions in the client
    // We'll simulate it by passing the same db object
    return await callback(this);
  }
};