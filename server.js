const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const db = new Database('/data/family-tree.db');
db.pragma('journal_mode = WAL');

db.exec(`CREATE TABLE IF NOT EXISTS family_data (id INTEGER PRIMARY KEY CHECK (id = 1), data TEXT NOT NULL, updated_at TEXT DEFAULT (datetime('now')))`)

const existingData = db.prepare('SELECT data FROM family_data WHERE id = 1').get();
if (!existingData) {
  const seedFile = path.join(__dirname, 'family_data_seed.json');
  if (fs.existsSync(seedFile)) {
    const seedData = fs.readFileSync(seedFile, 'utf-8');
    db.prepare('INSERT INTO family_data (id, data) VALUES (1, ?)').run(seedData);
  } else {
    db.prepare('INSERT INTO family_data (id, data) VALUES (1, ?)').run(JSON.stringify({}));
  }
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
  try {
    const row = db.prepare('SELECT data FROM family_data WHERE id = 1').get();
    if (!row) return res.status(404).json({ error: 'No data' });
    const backupDir = '/data/backups';
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `family_data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backupFile, row.data);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/health', (req, res) => {
  const row = db.prepare('SELECT updated_at FROM family_data WHERE id = 1').get();
  res.json({ status: 'ok', service: 'luozupu', last_updated: row ? row.updated_at : 'never' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Luozupu on port ${PORT}`));
