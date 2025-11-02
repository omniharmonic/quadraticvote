import Redis from 'ioredis';

// Use Upstash REST API in serverless (Vercel), regular Redis in development
const getRedisClient = () => {
  // Check for Upstash REST API (preferred for serverless/Vercel)
  // Upstash provides REDIS_URL (REST endpoint) and REDIS_TOKEN
  if (process.env.REDIS_URL && process.env.REDIS_TOKEN) {
    // Verify if it's a REST URL (Upstash format: https://...upstash.io)
    if (process.env.REDIS_URL.startsWith('https://')) {
      // For serverless environments, use REST API client
      return createUpstashClient(process.env.REDIS_URL, process.env.REDIS_TOKEN);
    }
  }

  // For local development with traditional Redis
  if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not set, using localhost:6379');
  }
  
  return new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,
  });
};

// Simple Upstash REST client for serverless
function createUpstashClient(url: string, token: string) {
  const client = {
    async get(key: string): Promise<string | null> {
      const response = await fetch(`${url}/get/${key}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      return data.result;
    },

    async set(key: string, value: string, exMode?: string, time?: number): Promise<string> {
      const args = [key, value];
      if (exMode && time) {
        args.push(exMode, time.toString());
      }
      
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', ...args]),
      });
      const data = await response.json();
      return data.result;
    },

    async setex(key: string, seconds: number, value: string): Promise<string> {
      return this.set(key, value, 'EX', seconds);
    },

    async del(...keys: string[]): Promise<number> {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['DEL', ...keys]),
      });
      const data = await response.json();
      return data.result;
    },

    async incr(key: string): Promise<number> {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['INCR', key]),
      });
      const data = await response.json();
      return data.result;
    },

    async expire(key: string, seconds: number): Promise<number> {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['EXPIRE', key, seconds]),
      });
      const data = await response.json();
      return data.result;
    },

    async hincrbyfloat(key: string, field: string, increment: number): Promise<string> {
      const response = await fetch(`${url}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['HINCRBYFLOAT', key, field, increment]),
      });
      const data = await response.json();
      return data.result;
    },
  };

  return client as any; // Type compatibility with ioredis
}

export const redis = getRedisClient();

// Key pattern functions for consistency
export const redisKeys = {
  session: (inviteCode: string) => `session:${inviteCode}`,
  rateLimit: (type: string, identifier: string) => `ratelimit:${type}:${identifier}`,
  results: (eventId: string) => `results:${eventId}`,
  votesLive: (eventId: string) => `votes:live:${eventId}`,
  proposalTitles: (eventId: string) => `proposals:titles:${eventId}`,
  wsConnections: (eventId: string) => `ws:connections:${eventId}`,
};

