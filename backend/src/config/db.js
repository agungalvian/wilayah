const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const bcrypt = require('bcryptjs');

// The DB will be placed in the backend root
const dbPath = path.resolve(__dirname, '../../wilayah.db');
// The CSV is expected in the project root (one level above backend directory)
const csvPath = path.resolve(__dirname, '../../../wilayah_bps_2025.csv');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    initializeDb();
  }
});

function initializeDb() {
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS wilayah (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT CHECK (level IN ('provinsi', 'kabupaten', 'kecamatan', 'desa')),
        kode_bps TEXT NOT NULL,
        nama_bps TEXT NOT NULL,
        kode_dagri TEXT,
        nama_dagri TEXT,
        kode_provinsi TEXT,
        nama_provinsi TEXT,
        kode_kabupaten TEXT,
        nama_kabupaten TEXT,
        kode_kecamatan TEXT,
        nama_kecamatan TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_kode_bps ON wilayah(kode_bps)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_kode_dagri ON wilayah(kode_dagri)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_level ON wilayah(level)`);

    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Seed default admin
    db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
      if (!err && row.count === 0) {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync('admin', salt);
        db.run('INSERT INTO users (username, password_hash) VALUES (?, ?)', ['admin', hash], (err) => {
          if (err) console.error('Error seeding admin user:', err.message);
          else console.log('Default admin user seeded successfully.');
        });
      }
    });

    // Check if empty and seed
    db.get('SELECT COUNT(*) as count FROM wilayah', (err, row) => {
      if (err) {
        console.error('Error checking database records:', err.message);
      } else if (row.count === 0) {
        console.log('Database is empty. Starting to seed data...');
        seedData();
      } else {
        console.log(`Database already seeded with ${row.count} records.`);
      }
    });
  });
}

function seedData() {
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at:', csvPath);
    return;
  }

  const results = [];
  
  fs.createReadStream(csvPath)
    .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^\uFEFF/g, '').trim() }))
    .on('data', (data) => results.push(data))
    .on('end', () => {
      console.log(`Read ${results.length} rows from CSV. Beginning bulk insert...`);
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
          INSERT INTO wilayah (
            level, kode_bps, nama_bps, kode_dagri, nama_dagri, 
            kode_provinsi, nama_provinsi, kode_kabupaten, nama_kabupaten, 
            kode_kecamatan, nama_kecamatan
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        results.forEach((row) => {
          stmt.run([
            row.level,
            row.kode_bps,
            row.nama_bps,
            row.kode_dagri,
            row.nama_dagri,
            row.kode_provinsi,
            row.nama_provinsi,
            row.kode_kabupaten,
            row.nama_kabupaten,
            row.kode_kecamatan,
            row.nama_kecamatan
          ]);
        });

        stmt.finalize();
        
        db.run('COMMIT', (err) => {
          if (err) {
            console.error('Error committing transaction:', err);
          } else {
            console.log('Data successfully seeded!');
          }
        });
      });
    });
}

module.exports = db;
