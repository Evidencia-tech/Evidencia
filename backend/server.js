import express from 'express';
import multer from 'multer';
import crypto from 'crypto';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { nanoid } from 'nanoid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import fsPromises from 'fs/promises';

import { insertProof, getProof, listProofs } from './models/proofs.js';
import { sendToPolygon } from './utils/blockchain.js';
import { generateQr } from './utils/qrcode.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// public/proofs (côté serveur)
const publicDir = path.join(__dirname, '../public');
const proofsDir = path.join(publicDir, 'proofs');

if (!fs.existsSync(proofsDir)) {
  fs.mkdirSync(proofsDir, { recursive: true });
}

// ---------------------------
// Helpers: extension & mediaUrl
// ---------------------------
const extFromMimetypeOrName = (mimetype, originalname) => {
  const m = (mimetype || '').toLowerCase();

  // images
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/png') return '.png';
  if (m === 'image/gif') return '.gif';

  // vidéos
  if (m === 'video/mp4') return '.mp4';
  if (m === 'video/webm') return '.webm';
  if (m === 'video/quicktime') return '.mov';
  if (m === 'video/x-m4v') return '.m4v';

  const ext = path.extname(originalname || '').trim().toLowerCase();
  return ext || '.bin';
};

const resolveMediaUrl = (id) => {
  const candidates = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.webm', '.mov', '.m4v'];
  for (const ext of candidates) {
    const candidatePath = path.join(proofsDir, `${id}${ext}`);
    if (fs.existsSync(candidatePath)) {
      return `/public/proofs/${id}${ext}`;
    }
  }
  return null;
};

// ---------------------------
// App
// ---------------------------
const app = express();
app.set('trust proxy', 1);

// Static
app.use('/public', express.static(publicDir));

// Sécurité / réseau
const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Upload (100MB pour vidéos iPhone)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// API key (optionnelle)
const requireApiKey = (req, res, next) => {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  const provided = req.headers['x-api-key'];
  if (provided !== expected) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  return next();
};

// Home
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Health
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/ping', (_req, res) => res.status(200).send('pong'));

// ---------------------------
// Certification handler
// ---------------------------
const handleCertification = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });

    const buffer = req.file.buffer;
    const hashHex = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const id = nanoid();

    // ✅ Stockage TOUJOURS (photo OU vidéo)
    const mimetype = req.file.mimetype || '';
    const extension = extFromMimetypeOrName(mimetype, req.file.originalname);

    const storedFileName = `${id}${extension}`;
    const storedPath = path.join(proofsDir, storedFileName);
    await fsPromises.writeFile(storedPath, buffer);

    // ✅ URL publique unique consommée par verify.js
    const mediaUrl = `/public/proofs/${storedFileName}`;

    // URL publique de la preuve
    const base =
      process.env.PUBLIC_BASE_URL ||
      `${req.protocol}://${req.get('host')}`;

    const verifyUrl = `${base}/public/verify.html?id=${encodeURIComponent(id)}`;

    // QR + chain
    const qr = await generateQr(verifyUrl);
    const chainResult = await sendToPolygon({ hashHex, timestamp, uri: verifyUrl });

    const record = {
      id,
      hash: hashHex,
      timestamp,
      filename: req.file.originalname,
      mimetype,
      txHash: chainResult.txHash,
      uri: verifyUrl,
      qr,
      mediaUrl
    };

    await insertProof(record);

    res.json({
      ...record,
      note: chainResult.note,
      verifyUrl,
      qrUrl: qr
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Certification failed', error: error.message });
  }
};

// Routes certify
app.post('/api/certify', requireApiKey, upload.single('file'), handleCertification);
app.post('/api/partner/certify', requireApiKey, upload.single('file'), handleCertification);

// ---------------------------
// Verify (public)
// ---------------------------
app.get('/api/verify/:id', async (req, res) => {
  try {
    const proof = await getProof(req.params.id);
    if (!proof) return res.status(404).json({ message: 'Proof not found' });

    const verifyUrl =
      proof.uri || `${req.protocol}://${req.get('host')}/public/verify.html?id=${encodeURIComponent(proof.id)}`;

    const qrUrl = proof.qr || (await generateQr(verifyUrl));

    // ✅ mediaUrl prioritaire, sinon on tente de résoudre sur disque
    const mediaUrl = proof.mediaUrl || resolveMediaUrl(proof.id);

    res.json({ ...proof, verifyUrl, qrUrl, mediaUrl });
  } catch (error) {
    res.status(500).json({ message: 'Lookup failed', error: error.message });
  }
});

// ---------------------------
// History (protégé)
// ---------------------------
app.get('/api/history', requireApiKey, async (_req, res) => {
  try {
    const proofs = await listProofs();
    res.json(proofs);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch history', error: error.message });
  }
});

// Listen
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Evidencia backend listening on port ${PORT}`);
});
