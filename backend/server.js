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

import { insertProof, getProof, listProofs } from './models/proofs.js';
import { sendToPolygon } from './utils/blockchain.js';
import { generateQr } from './utils/qrcode.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const limiter = rateLimit({ windowMs: 60 * 1000, max: 100 });
app.use(limiter);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use('/public', express.static(path.join(__dirname, '../public')));

const requireApiKey = (req, res, next) => {
  const expected = process.env.API_KEY;
  if (!expected) return next();
  const provided = req.headers['x-api-key'];
  if (provided !== expected) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  return next();
};

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const handleCertification = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'File is required' });
    const buffer = req.file.buffer;
    const hashHex = '0x' + crypto.createHash('sha256').update(buffer).digest('hex');
    const timestamp = Math.floor(Date.now() / 1000);
    const id = nanoid();

    const verifyUrl = `${process.env.PUBLIC_BASE_URL || req.protocol + '://' + req.get('host')}/public/verify.html?id=${id}`;
    const qr = await generateQr(verifyUrl);
    const chainResult = await sendToPolygon({ hashHex, timestamp, uri: verifyUrl });

    const record = {
      id,
      hash: hashHex,
      timestamp,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      txHash: chainResult.txHash,
      uri: verifyUrl,
      qr
    };

    await insertProof(record);
    res.json({ ...record, note: chainResult.note });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Certification failed', error: error.message });
  }
};

app.post('/api/certify', requireApiKey, upload.single('file'), handleCertification);
app.post('/api/partner/certify', requireApiKey, upload.single('file'), handleCertification);

app.get('/api/verify/:id', async (req, res) => {
  try {
    const proof = await getProof(req.params.id);
    if (!proof) return res.status(404).json({ message: 'Proof not found' });
    res.json(proof);
  } catch (error) {
    res.status(500).json({ message: 'Lookup failed', error: error.message });
  }
});

app.get('/api/history', requireApiKey, async (_req, res) => {
  try {
    const proofs = await listProofs();
    res.json(proofs);
  } catch (error) {
    res.status(500).json({ message: 'Unable to fetch history', error: error.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Evidencia backend listening on port ${PORT}`);
});
