const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('worklog.db');

// Tworzenie tabeli, jeśli nie istnieje
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT,
      start_time TEXT,
      end_time TEXT,
      break_minutes INTEGER,
      notes TEXT
    )
  `);
});

function getAllLogs() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM work_logs ORDER BY date DESC', (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function addLog(log) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO work_logs (date, start_time, end_time, break_minutes, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [log.date, log.start_time, log.end_time, log.break_minutes, log.notes],
      function (err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

function updateLog(log) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE work_logs
       SET date = ?, start_time = ?, end_time = ?, break_minutes = ?, notes = ?
       WHERE id = ?`,
      [log.date, log.start_time, log.end_time, log.break_minutes, log.notes, log.id],
      function (err) {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

module.exports = { getAllLogs, addLog, updateLog };