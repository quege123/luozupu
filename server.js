const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// 数据库路径：优先用/data，不存在则用/tmp
const dbPath = fs.existsSync('/data') ? '/data/family-tree.db' : '/tmp/family-tree.db';
console.log(`Database path: ${dbPath}`);

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE IF NOT EXISTS family_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))`)

const existing = db.prepare('SELECT id FROM family_data WHERE id = 1').get();
if (!existing) {
  db.prepare('INSERT INTO family_data (id, data) VALUES (1, ?)').run(JSON.stringify({}));
  console.log('Initialized empty family data');
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/family-data', (req, res) => {
  try { const row = db.prepare('SELECT data FROM family_data WHERE id = 1').get(); res.json(row ? JSON.parse(row.data) : {}); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/family-data', (req, res) => {
  try { const now = new Date().toISOString(); db.prepare('INSERT OR REPLACE INTO family_data (id, data, updated_at) VALUES (1, ?, ?)').run(JSON.stringify(req.body), now); res.json({ success: true, updated_at: now }); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/family-backup', (req, res) => {
  try { res.json({ success: true, message: 'Backup API ready' }); }
  catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/health', (req, res) => {
  const row = db.prepare('SELECT updated_at FROM family_data WHERE id = 1').get();
  res.json({ status: 'ok', service: 'luozupu', db_path: dbPath, last_updated: row ? row.updated_at : 'never' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Luozupu on port ${PORT}`));
