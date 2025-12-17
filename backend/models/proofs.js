import db from '../db/connection.js';

export const insertProof = (record) =>
  new Promise((resolve, reject) => {
    const stmt = db.prepare(
      'INSERT INTO proofs (id, hash, timestamp, filename, mimetype, txHash, uri, qr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      (err) => {
        if (err) reject(err);
      }
    );
    stmt.run(
      record.id,
      record.hash,
      record.timestamp,
      record.filename,
      record.mimetype,
      record.txHash,
      record.uri,
      record.qr,
      (err) => {
        if (err) reject(err);
        resolve(record);
      }
    );
  });

export const getProof = (id) =>
  new Promise((resolve, reject) => {
    db.get('SELECT * FROM proofs WHERE id = ?', [id], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });

export const listProofs = () =>
  new Promise((resolve, reject) => {
    db.all('SELECT * FROM proofs ORDER BY timestamp DESC', (err, rows) => {
      if (err) reject(err);
      resolve(rows);
    });
  });
