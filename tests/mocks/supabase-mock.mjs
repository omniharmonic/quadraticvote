// In-memory mock of the Supabase stack (PostgREST + GoTrue subset) so the
// e2e suite can run hermetically — no Docker, no network, no live project.
//
// Implements exactly the API surface the app uses:
//   REST    : GET/POST/PATCH/DELETE with eq/neq/in/is/gte/lte filters,
//             order/limit/offset, select projection, single & maybeSingle
//             semantics, upsert via on_conflict, count=exact (HEAD)
//   Auth    : signup, password grant, GET/PUT user, logout, recover/resend
//   RPC     : check_rate_limit (the Postgres rate limiter)
//   Trigger : mirrors handle_new_user (auth.users -> public.users)
//   Extras  : GET /__dump (inspect state), GET /__reset (wipe state)
//
// Started automatically by playwright.config.ts (webServer). To run the app
// against it manually:
//   node tests/mocks/supabase-mock.mjs &
//   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=mock-anon-key \
//   SUPABASE_SERVICE_ROLE_KEY=mock-service-role-key pnpm dev
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.env.MOCK_SUPABASE_PORT || 54321);

// ---------------- in-memory database ----------------
const db = {
  users: [],
  events: [],
  options: [],
  invites: [],
  votes: [],
  proposals: [],
  event_admins: [],
  admin_invitations: [],
  rate_limits: [],
  result_snapshots: [],
};

const TABLE_DEFAULTS = {
  events: () => ({
    tags: [], visibility: 'public', timezone: 'UTC', credits_per_voter: 100,
    weighting_mode: 'equal', show_results_during_voting: false, show_results_after_close: true,
    vote_settings: { allowVoteChanges: true, allowLateSubmissions: false, requireEmailVerification: false, allowAnonymous: true },
    admin_code: null, deleted_at: null,
  }),
  options: () => ({ position: 0, source: 'admin' }),
  invites: () => ({ invite_type: 'voting', sent_at: null, used_at: null, vote_submitted_at: null, proposals_submitted: 0, expires_at: null }),
  votes: () => ({ allocations: {}, total_credits_used: 0, submitted_at: new Date().toISOString() }),
  proposals: () => ({ status: 'pending_approval', submitted_at: null, approved_at: null, rejected_at: null, converted_to_option_id: null }),
  event_admins: () => ({ role: 'admin' }),
  admin_invitations: () => ({ accepted_at: null, accepted_by: null }),
};

// auth store
const authUsers = new Map(); // email -> { id, email, password, email_confirmed_at }
const sessions = new Map();  // token -> auth user id

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

function publicUser(u) {
  return {
    id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email,
    email_confirmed_at: u.email_confirmed_at, confirmed_at: u.email_confirmed_at,
    phone: '', app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: u.user_metadata || {}, identities: [],
    created_at: u.created_at, updated_at: u.created_at,
  };
}

function makeSession(u) {
  const token = 'tok_' + crypto.randomBytes(24).toString('hex');
  sessions.set(token, u.id);
  return {
    access_token: token, token_type: 'bearer', expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    refresh_token: 'ref_' + crypto.randomBytes(16).toString('hex'),
    user: publicUser(u),
  };
}

// replicate the handle_new_user trigger
function triggerNewUser(authUser) {
  const existing = db.users.find((r) => r.auth_id === authUser.id);
  if (existing) { existing.email = authUser.email; return; }
  db.users.push({ id: uuid(), auth_id: authUser.id, email: authUser.email, name: null, avatar_url: null, wallet_address: null, created_at: now(), updated_at: now() });
}

// ---------------- PostgREST filter parsing ----------------
function parseFilters(searchParams) {
  const filters = [];
  let order = null, limit = null, offset = null, onConflict = null;
  for (const [key, raw] of searchParams.entries()) {
    if (key === 'select' || key === 'apikey') continue;
    if (key === 'on_conflict') { onConflict = raw.split(','); continue; }
    if (key === 'order') {
      const [col, ...mods] = raw.split('.');
      order = { col, asc: !mods.includes('desc') };
      continue;
    }
    if (key === 'limit') { limit = parseInt(raw); continue; }
    if (key === 'offset') { offset = parseInt(raw); continue; }
    const dot = raw.indexOf('.');
    if (dot === -1) continue;
    const op = raw.slice(0, dot);
    const val = raw.slice(dot + 1);
    filters.push({ col: key, op, val });
  }
  return { filters, order, limit, offset, onConflict };
}

function coerce(val, sample) {
  if (val === 'null') return null;
  if (typeof sample === 'number') return Number(val);
  if (typeof sample === 'boolean') return val === 'true';
  return val;
}

function rowMatches(row, filters) {
  return filters.every(({ col, op, val }) => {
    const cell = row[col];
    switch (op) {
      case 'eq': return String(cell) === val;
      case 'neq': return String(cell) !== val;
      case 'is': return val === 'null' ? cell === null || cell === undefined : String(cell) === val;
      case 'in': {
        const list = val.replace(/^\(/, '').replace(/\)$/, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        return list.includes(String(cell));
      }
      case 'gte': return cell >= coerce(val, cell);
      case 'lte': return cell <= coerce(val, cell);
      case 'gt': return cell > coerce(val, cell);
      case 'lt': return cell < coerce(val, cell);
      default: return true;
    }
  });
}

function project(rows, select) {
  if (!select || select === '*') return rows;
  const cols = select.split(',').map((s) => s.trim()).filter(Boolean);
  if (cols.includes('*')) return rows;
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
}

function sendJSON(res, status, body, headers = {}) {
  const payload = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json', ...headers });
  res.end(payload);
}

function wantsSingle(req) {
  return (req.headers.accept || '').includes('vnd.pgrst.object+json');
}

function singleify(req, res, rows, prefer, status = 200) {
  if (wantsSingle(req)) {
    if (rows.length === 1) return sendJSON(res, status, rows[0]);
    return sendJSON(res, 406, {
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: `Results contain ${rows.length} rows, application/vnd.pgrst.object+json requires 1 row`,
      hint: null,
    });
  }
  const headers = {};
  if ((prefer || '').includes('count=exact')) headers['content-range'] = `0-${rows.length - 1}/${rows.length}`;
  return sendJSON(res, status, rows, headers);
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

// ---------------- request handling ----------------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const path = url.pathname;
  const prefer = req.headers.prefer || '';

  // CORS for browser-side calls (auth, anon REST) from the app origin.
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    req.headers['access-control-request-headers'] || '*'
  );
  res.setHeader('Access-Control-Expose-Headers', 'content-range, content-length');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  try {
    // ---------- GoTrue ----------
    if (path === '/auth/v1/signup' && req.method === 'POST') {
      const body = await readBody(req);
      if (authUsers.has(body.email)) return sendJSON(res, 422, { code: 422, msg: 'User already registered' });
      const u = { id: uuid(), email: body.email, password: body.password, email_confirmed_at: now(), created_at: now(), user_metadata: body.data || {} };
      authUsers.set(body.email, u);
      triggerNewUser(u);
      return sendJSON(res, 200, makeSession(u));
    }
    if (path === '/auth/v1/token' && req.method === 'POST') {
      const body = await readBody(req);
      const u = authUsers.get(body.email);
      if (!u || u.password !== body.password) {
        return sendJSON(res, 400, { error: 'invalid_grant', error_description: 'Invalid login credentials' });
      }
      return sendJSON(res, 200, makeSession(u));
    }
    if (path === '/auth/v1/user') {
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const uid = sessions.get(token);
      const u = [...authUsers.values()].find((x) => x.id === uid);
      if (!u) return sendJSON(res, 401, { code: 401, msg: 'invalid JWT' });
      if (req.method === 'GET') return sendJSON(res, 200, publicUser(u));
      if (req.method === 'PUT') {
        const body = await readBody(req);
        if (body.password) u.password = body.password;
        if (body.data) u.user_metadata = { ...u.user_metadata, ...body.data };
        return sendJSON(res, 200, publicUser(u));
      }
    }
    if (path === '/auth/v1/logout') return sendJSON(res, 204);
    if (path === '/auth/v1/recover' || path === '/auth/v1/resend') return sendJSON(res, 200, {});

    // ---------- RPC ----------
    if (path === '/rest/v1/rpc/check_rate_limit' && req.method === 'POST') {
      const body = await readBody(req);
      const windowStart = Math.floor(Date.now() / 1000 / body.p_window_seconds) * body.p_window_seconds;
      const key = `${body.p_key}|${windowStart}`;
      const row = db.rate_limits.find((r) => r.k === key);
      const count = row ? ++row.count : (db.rate_limits.push({ k: key, count: 1 }), 1);
      return sendJSON(res, 200, [{ allowed: count <= body.p_max_count, current_count: count }]);
    }

    // ---------- PostgREST ----------
    const m = path.match(/^\/rest\/v1\/([a-z_]+)$/);
    if (m) {
      const table = m[1];
      if (!(table in db)) return sendJSON(res, 404, { message: `relation "${table}" does not exist` });
      const { filters, order, limit, offset, onConflict } = parseFilters(url.searchParams);
      const select = url.searchParams.get('select');

      if (req.method === 'GET' || req.method === 'HEAD') {
        let rows = db[table].filter((r) => rowMatches(r, filters));
        if (order) rows = rows.slice().sort((a, b) => {
          const av = a[order.col], bv = b[order.col];
          return (av < bv ? -1 : av > bv ? 1 : 0) * (order.asc ? 1 : -1);
        });
        if (offset) rows = rows.slice(offset);
        if (limit !== null) rows = rows.slice(0, limit);
        const out = project(rows, select);
        if (req.method === 'HEAD') {
          res.writeHead(200, { 'content-type': 'application/json', 'content-range': `0-${out.length - 1}/${out.length}` });
          return res.end();
        }
        return singleify(req, res, out, prefer);
      }

      if (req.method === 'POST') {
        const body = await readBody(req);
        const items = Array.isArray(body) ? body : [body];
        const isUpsert = prefer.includes('resolution=merge-duplicates') || !!onConflict;
        const inserted = [];
        for (const item of items) {
          let existing = null;
          if (isUpsert && onConflict) {
            existing = db[table].find((r) => onConflict.every((c) => String(r[c]) === String(item[c])));
          }
          if (existing) {
            Object.assign(existing, item, { updated_at: now() });
            inserted.push(existing);
          } else {
            const row = { id: uuid(), created_at: now(), updated_at: now(), ...(TABLE_DEFAULTS[table]?.() || {}), ...item };
            db[table].push(row);
            if (table === 'votes' && !item.submitted_at) row.submitted_at = now();
            inserted.push(row);
          }
        }
        if (prefer.includes('return=representation')) return singleify(req, res, project(inserted, select), prefer, 201);
        return sendJSON(res, 201, undefined);
      }

      if (req.method === 'PATCH') {
        const body = await readBody(req);
        const rows = db[table].filter((r) => rowMatches(r, filters));
        rows.forEach((r) => Object.assign(r, body, { updated_at: now() }));
        if (prefer.includes('return=representation')) return singleify(req, res, project(rows, select), prefer);
        return sendJSON(res, 204, undefined);
      }

      if (req.method === 'DELETE') {
        const removed = db[table].filter((r) => rowMatches(r, filters));
        db[table] = db[table].filter((r) => !rowMatches(r, filters));
        if (prefer.includes('return=representation')) return singleify(req, res, project(removed, select), prefer);
        return sendJSON(res, 204, undefined);
      }
    }

    // debug helpers for the test harness
    if (path === '/__dump') return sendJSON(res, 200, db);
    if (path === '/__reset') { Object.keys(db).forEach((k) => (db[k] = [])); authUsers.clear(); sessions.clear(); return sendJSON(res, 200, { ok: true }); }

    return sendJSON(res, 404, { message: 'not found: ' + path });
  } catch (err) {
    console.error('mock error', err);
    return sendJSON(res, 500, { message: String(err) });
  }
});

server.listen(PORT, () => console.log(`mock supabase listening on :${PORT}`));
