const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// JSON文件路径：优先用/data（Railway Volume），否则用/tmp
const dataDir = fs.existsSync('/data') ? '/data' : '/tmp';
const dbPath = path.join(dataDir, 'family-data.json');
console.log(`Data file: ${dbPath}`);

// 初始化数据文件
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, JSON.stringify({}), 'utf8');
  console.log('Initialized empty data file');
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/family-data', (req, res) => {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    res.json(JSON.parse(raw));
  } catch (err) {
    console.error('Read error:', err.message);
    res.status(500).json({ error: 'Failed to read data' });
  }
});

app.post('/api/family-data', (req, res) => {
  try {
    const now = new Date().toISOString();
    fs.writeFileSync(dbPath, JSON.stringify(req.body), 'utf8');
    res.json({ success: true, updated_at: now });
  } catch (err) {
    console.error('Write error:', err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

app.post('/api/family-backup', (req, res) => {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const backupPath = path.join(dataDir, `family-data-backup-${Date.now()}.json`);
    fs.writeFileSync(backupPath, raw, 'utf8');
    res.json({ success: true, backup: backupPath });
  } catch (err) {
    res.status(500).json({ error: 'Backup failed' });
  }
});

app.get('/api/health', (req, res) => {
  const stats = fs.existsSync(dbPath) ? fs.statSync(dbPath) : null;
  res.json({
    status: 'ok',
    service: 'luozupu',
    data_file: dbPath,
    file_size: stats ? stats.size : 0,
    modified: stats ? stats.mtime.toISOString() : 'never'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Luozupu on port ${PORT}`));
