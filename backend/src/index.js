const express = require('express');
const cors = require('cors');
const db = require('./config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'wilayah-super-secret-key';

app.use(cors());
app.use(express.json());

// Public API Endpoints

// 1. GET /api/v1/stats
app.get('/api/v1/stats', (req, res) => {
  db.all(
    `SELECT level, COUNT(*) as count FROM wilayah GROUP BY level`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const stats = {
        provinsi: 0,
        kabupaten: 0,
        kecamatan: 0,
        desa: 0
      };
      rows.forEach(row => {
        if (stats[row.level] !== undefined) {
          stats[row.level] = row.count;
        }
      });
      res.json(stats);
    }
  );
});

// 2. GET /api/v1/wilayah
app.get('/api/v1/wilayah', (req, res) => {
  const { level, search, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let query = `SELECT * FROM wilayah WHERE 1=1`;
  let countQuery = `SELECT COUNT(*) as total FROM wilayah WHERE 1=1`;
  const params = [];

  if (level) {
    query += ` AND level = ?`;
    countQuery += ` AND level = ?`;
    params.push(level);
  }

  if (search) {
    query += ` AND (nama_bps LIKE ? OR kode_bps LIKE ? OR nama_dagri LIKE ? OR kode_dagri LIKE ?)`;
    countQuery += ` AND (nama_bps LIKE ? OR kode_bps LIKE ? OR nama_dagri LIKE ? OR kode_dagri LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam, searchParam);
  }

  query += ` ORDER BY kode_bps ASC LIMIT ? OFFSET ?`;
  
  db.get(countQuery, params, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    
    const total_data = row.total;
    const total_page = Math.ceil(total_data / limit);

    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        metadata: {
          total_data,
          page: parseInt(page),
          limit: parseInt(limit),
          total_page
        },
        data: rows
      });
    });
  });
});

// 3. GET /api/v1/wilayah/detail?level=<level>&kode=<kode>
app.get('/api/v1/wilayah/detail', (req, res) => {
  const { level, kode } = req.query;
  if (!level || !kode) return res.status(400).json({ error: "level and kode are required" });

  let column = '';
  if (level === 'provinsi') column = 'kode_provinsi';
  else if (level === 'kabupaten') column = 'kode_kabupaten';
  else if (level === 'kecamatan') column = 'kode_kecamatan';
  else return res.status(400).json({ error: "Invalid level" });

  console.log('Querying detail:', `SELECT kode_bps, kode_dagri FROM wilayah WHERE level = '${level}' AND ${column} = '${kode}' LIMIT 1`);
  db.get(
    `SELECT kode_bps, kode_dagri FROM wilayah WHERE level = ? AND ${column} = ? LIMIT 1`,
    [level, kode],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: "Data not found" });
      res.json(row);
    }
  );
});

// 4. GET /api/v1/wilayah/:kode_bps
app.get('/api/v1/wilayah/:kode_bps', (req, res) => {
  const { kode_bps } = req.params;
  db.get(`SELECT * FROM wilayah WHERE kode_bps = ?`, [kode_bps], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Data not found" });
    res.json(row);
  });
});

// Cascading Dropdowns Endpoints

// 1. GET /api/v1/provinsi
app.get('/api/v1/provinsi', (req, res) => {
  db.all(
    `SELECT DISTINCT kode_provinsi, nama_provinsi FROM wilayah WHERE kode_provinsi IS NOT NULL AND kode_provinsi != '' ORDER BY kode_provinsi ASC`,
    [],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 2. GET /api/v1/kabupaten?provinsi_id=<kode>
app.get('/api/v1/kabupaten', (req, res) => {
  const { provinsi_id } = req.query;
  if (!provinsi_id) return res.status(400).json({ error: "provinsi_id is required" });
  
  db.all(
    `SELECT DISTINCT kode_kabupaten, nama_kabupaten FROM wilayah WHERE kode_provinsi = ? AND kode_kabupaten IS NOT NULL AND kode_kabupaten != '' ORDER BY kode_kabupaten ASC`,
    [provinsi_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// 3. GET /api/v1/kecamatan?kabupaten_id=<kode>
app.get('/api/v1/kecamatan', (req, res) => {
  const { kabupaten_id } = req.query;
  if (!kabupaten_id) return res.status(400).json({ error: "kabupaten_id is required" });
  
  db.all(
    `SELECT DISTINCT kode_kecamatan, nama_kecamatan FROM wilayah WHERE kode_kabupaten = ? AND kode_kecamatan IS NOT NULL AND kode_kecamatan != '' ORDER BY kode_kecamatan ASC`,
    [kabupaten_id],
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});



// Auth API Endpoints

app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });

  db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, username: user.username });
  });
});

app.put('/api/v1/auth/password', (req, res) => {
  // Extract token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) return res.status(400).json({ error: "oldPassword and newPassword required" });

    db.get('SELECT * FROM users WHERE id = ?', [decoded.id], (err, user) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!user) return res.status(404).json({ error: "User not found" });

      const isValid = bcrypt.compareSync(oldPassword, user.password_hash);
      if (!isValid) return res.status(401).json({ error: "Old password incorrect" });

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);

      db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hash, user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: "Password updated successfully" });
      });
    });
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
});

// Admin Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

// Admin API Endpoints

// 1. POST /api/v1/admin/wilayah
app.post('/api/v1/admin/wilayah', authenticateToken, (req, res) => {
  const { level, kode_bps, nama_bps, kode_dagri, nama_dagri, kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, kode_kecamatan, nama_kecamatan } = req.body;
  
  if (!level || !kode_bps || !nama_bps) {
    return res.status(400).json({ error: "level, kode_bps, and nama_bps are required" });
  }

  const query = `
    INSERT INTO wilayah (
      level, kode_bps, nama_bps, kode_dagri, nama_dagri, 
      kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, 
      kode_kecamatan, nama_kecamatan
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(query, [level, kode_bps, nama_bps, kode_dagri, nama_dagri, kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, kode_kecamatan, nama_kecamatan], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.status(201).json({ message: "Data created successfully", id: this.lastID });
  });
});

// 2. PUT /api/v1/admin/wilayah/:id
app.put('/api/v1/admin/wilayah/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  const { level, kode_bps, nama_bps, kode_dagri, nama_dagri, kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, kode_kecamatan, nama_kecamatan } = req.body;
  
  const query = `
    UPDATE wilayah SET 
      level = COALESCE(?, level), 
      kode_bps = COALESCE(?, kode_bps), 
      nama_bps = COALESCE(?, nama_bps), 
      kode_dagri = COALESCE(?, kode_dagri), 
      nama_dagri = COALESCE(?, nama_dagri), 
      kode_provinsi = COALESCE(?, kode_provinsi), 
      nama_provinsi = COALESCE(?, nama_provinsi), 
      kode_kabupaten = COALESCE(?, kode_kabupaten), 
      nama_kabupaten = COALESCE(?, nama_kabupaten), 
      kode_kecamatan = COALESCE(?, kode_kecamatan), 
      nama_kecamatan = COALESCE(?, nama_kecamatan),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(query, [level, kode_bps, nama_bps, kode_dagri, nama_dagri, kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, kode_kecamatan, nama_kecamatan, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Data not found" });
    res.json({ message: "Data updated successfully" });
  });
});

// 3. DELETE /api/v1/admin/wilayah/:id
app.delete('/api/v1/admin/wilayah/:id', authenticateToken, (req, res) => {
  const { id } = req.params;
  db.run(`DELETE FROM wilayah WHERE id = ?`, [id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "Data not found" });
    res.json({ message: "Data deleted successfully" });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
