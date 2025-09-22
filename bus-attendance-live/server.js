// server.js
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const options = { timeZone: 'America/Chicago' };
const centralDate = new Date(new Date().toLocaleString('en-US', options));

const app = express();
app.use(helmet());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('cookie-parser')());

const PORT = process.env.PORT || 3000;
const db = new Database(path.join(__dirname, 'data', 'bus-attendance.sqlite'));

// session
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev_secret_change_me',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

// Helper: is authenticated
function ensureAuth(req, res, next) {
  console.log('🔒 ensureAuth check. Session:', req.session);
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'unauthorized' });
}

// Login route (simple)
app.post('/api/login', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'missing password' });

  const hash = process.env.ADMIN_PASSWORD_HASH;
  const plain = process.env.ADMIN_PASSWORD;

  try {
    if (hash) {
      // compare bcrypt hash
      const ok = await bcrypt.compare(password, hash);
      if (ok) { 
        req.session.isAdmin = true; 
        return res.json({ ok: true }); 
      }
    
    } else if (plain) {
      if (password === plain) { 
        req.session.isAdmin = true; 
        console.log('✅ Login successful. Session now:', req.session);
        return res.json({ ok: true }); 
      }
    } else {
      return res.status(500).json({ error: 'no admin password configured on server' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'server error' });
  }

  return res.status(403).json({ error: 'invalid password' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// --- API endpoints for each resource ---
// GET all
app.get('/api/bus-subs', (req, res) => {
  const rows = db.prepare('SELECT * FROM bus_subs WHERE completed = 0 ORDER BY bus_number').all();
  res.json(rows);
});
app.get('/api/bus-repairs', (req, res) => {
  const rows = db.prepare('SELECT * FROM bus_repairs WHERE completed = 0 ORDER BY created_at DESC').all();
  res.json(rows);
});
app.get('/api/field-trips', (req, res) => {
  const rows = db.prepare('SELECT * FROM field_trips WHERE completed = 0 ORDER BY date, start_time').all();
  res.json(rows);
});

// Protected create/update/delete
// Create
app.post('/api/bus-subs', ensureAuth, (req, res) => {
  const { bus_number, morning_sub, afternoon_sub } = req.body;
  const stmt = db.prepare('INSERT INTO bus_subs (bus_number, morning_sub, afternoon_sub) VALUES (?, ?, ?)');
  const info = stmt.run(bus_number || '', morning_sub || '', afternoon_sub || '');
  console.log('Session info:', req.session);
  res.json({ id: info.lastInsertRowid });
});
app.post('/api/bus-repairs', ensureAuth, (req, res) => {
  const { down_bus_number, reason, sub_bus_number } = req.body;
  const stmt = db.prepare('INSERT INTO bus_repairs (down_bus_number, reason, sub_bus_number) VALUES (?, ?, ?)');
  const info = stmt.run(down_bus_number || '', reason || '', sub_bus_number || '');
  res.json({ id: info.lastInsertRowid });
});
app.post('/api/field-trips', ensureAuth, (req, res) => {
  const { date, from_location, to_location, start_time, end_time, driver, bus_number } = req.body;
  const stmt = db.prepare(`INSERT INTO field_trips
    (date, from_location, to_location, start_time, end_time, driver, bus_number)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const info = stmt.run(date || '', from_location || '', to_location || '', start_time || '', end_time || '', driver || '', bus_number || '');
  res.json({ id: info.lastInsertRowid });
});

// Update
app.put('/api/bus-subs/:id', ensureAuth, (req, res) => {
  const { id } = req.params;
  const { bus_number, morning_sub, afternoon_sub } = req.body;
  db.prepare('UPDATE bus_subs SET bus_number=?, morning_sub=?, afternoon_sub=? WHERE id=?')
    .run(bus_number, morning_sub, afternoon_sub, id);
  res.json({ ok: true });
});
app.put('/api/bus-repairs/:id', ensureAuth, (req, res) => {
  const { id } = req.params;
  const { down_bus_number, reason, sub_bus_number } = req.body;
  db.prepare('UPDATE bus_repairs SET down_bus_number=?, reason=?, sub_bus_number=? WHERE id=?')
    .run(down_bus_number, reason, sub_bus_number, id);
  res.json({ ok: true });
});
app.put('/api/field-trips/:id', ensureAuth, (req, res) => {
  const { id } = req.params;
  const { date, from_location, to_location, start_time, end_time, driver, bus_number } = req.body;
  db.prepare(`UPDATE field_trips SET date=?, from_location=?, to_location=?, start_time=?, end_time=?, driver=?, bus_number=? WHERE id=?`)
    .run(date, from_location, to_location, start_time, end_time, driver, bus_number, id);
  res.json({ ok: true });
});

// Mark complete/uncomplete
app.post('/api/mark-complete', ensureAuth, (req, res) => {
  const { table, id, completed } = req.body;
  const allowed = { 'bus_subs': 1, 'bus_repairs': 1, 'field_trips': 1 };
  if (!allowed[table]) return res.status(400).json({ error: 'invalid table' });

  const stmt = db.prepare(`UPDATE ${table} 
    SET completed = ?, completed_at = ? 
    WHERE id = ?`);
  stmt.run(completed ? 1 : 0, completed ? new Date().toISOString() : null, id);

  res.json({ ok: true });
});

// Delete
app.delete('/api/:table/:id', ensureAuth, (req, res) => {
  const { table, id } = req.params;
  const allowed = ['bus_subs', 'bus_repairs', 'field_trips'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'invalid table' });
  db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
  res.json({ ok: true });
});

// Create/Update Log Table
app.get('/api/log/:table', ensureAuth, (req, res) => {
  const { table } = req.params;
  const allowed = ['bus_subs', 'bus_repairs', 'field_trips'];
  if (!allowed.includes(table)) return res.status(400).json({ error: 'invalid table' });

  const rows = db.prepare(`SELECT * FROM ${table} WHERE completed = 1 ORDER BY id DESC`).all();
  res.json(rows);
});

app.get('/api/session', (req, res) => {
  res.json({ isAdmin: !!(req.session && req.session.isAdmin) });
});

// catch-all
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start
app.listen(PORT, () => {
  console.log(`Server started on http://localhost:${PORT}`);
});

