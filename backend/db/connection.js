import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, 'evidencia.db');

sqlite3.verbose();

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite', err);
  } else {
    console.log('SQLite connected at', dbPath);
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY,
      hash TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      filename TEXT,
      mimetype TEXT,
      txHash TEXT,
      uri TEXT,
      qr TEXT,
      imageUrl TEXT
    )
  `);

  db.run(`ALTER TABLE proofs ADD COLUMN imageUrl TEXT`, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Failed to ensure imageUrl column', err);
    }
  });
});

export default db;
