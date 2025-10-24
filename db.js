const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'worklog.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS work_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      break_minutes INTEGER DEFAULT 0,
      notes TEXT
    )
  `);
});

module.exports = {
  getAll: () =>
    new Promise((resolve, reject) => {
      db.all('SELECT * FROM work_logs ORDER BY date ASC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }),

  insert: (log) =>
    new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO work_logs (date, start_time, end_time, break_minutes, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [log.date, log.start_time, log.end_time, log.break_minutes || 0, log.notes || 'Brak'],
        function (err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    }),

  update: (log) =>
    new Promise((resolve, reject) => {
      db.run(
        `UPDATE work_logs SET date=?, start_time=?, end_time=?, break_minutes=?, notes=? WHERE id=?`,
        [log.date, log.start_time, log.end_time, log.break_minutes || 0, log.notes || 'Brak', log.id],
        function (err) {
          if (err) reject(err);
          else resolve();
        }
      );
    }),

  delete: (id) =>
    new Promise((resolve, reject) => {
      db.run(`DELETE FROM work_logs WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else resolve();
      });
    }),
};