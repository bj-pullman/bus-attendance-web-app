// init_db.js
require('dotenv').config();
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);

const dbFile = path.join(dataDir, 'bus-attendance.sqlite');
const db = new Database(dbFile);

// Create tables
// Add this line to each table on Live Server
// completed_at DATETIME DEFAULT CURRENT_TIMESTAMP
db.exec(`
CREATE TABLE IF NOT EXISTS bus_subs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bus_number TEXT,
  morning_sub TEXT,
  afternoon_sub TEXT,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bus_repairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  down_bus_number TEXT,
  reason TEXT,
  sub_bus_number TEXT,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS field_trips (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT,
  from_location TEXT,
  to_location TEXT,
  start_time TEXT,
  end_time TEXT,
  driver TEXT,
  bus_number TEXT,
  completed INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

// Insert some sample seed data if tables empty
// const rowCount = db.prepare('SELECT COUNT(*) as c FROM bus_subs').get().c;
// if (rowCount === 0) {
//   const ins1 = db.prepare('INSERT INTO bus_subs (bus_number, morning_sub, afternoon_sub) VALUES (?, ?, ?)');
//   ins1.run('12', 'John Doe', 'Alice White');

//   const ins2 = db.prepare('INSERT INTO bus_repairs (down_bus_number, reason, sub_bus_number) VALUES (?, ?, ?)');
//   ins2.run('15', 'Engine trouble', '22');

//   const ins3 = db.prepare(`INSERT INTO field_trips
//     (date, from_location, to_location, start_time, end_time, driver, bus_number)
//     VALUES (?, ?, ?, ?, ?, ?, ?)`);
//   ins3.run('2025-09-20', 'High School Volleyball', 'City Stadium', '08:00 AM', '12:00 PM', 'D. Martin', '12');

//   console.log('Seed data inserted.');
// } else {
//   console.log('DB already has data — no seed inserted.');
// }

db.close();
console.log('DB initialized at', dbFile);
