// server.js
import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import authRoutes from './auth.js';
import pool from './db.js';
import jwt from 'jsonwebtoken';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from /public
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

// mount auth routes
app.use(authRoutes);

// simple health check
app.get('/api/health', (req, res) => res.json({ ok: true }));

// auth middleware
function requireAuth(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// POST /api/shorten  (protected)
app.post('/api/shorten', requireAuth, async (req, res) => {
  const { longUrl } = req.body;
  if (!longUrl) return res.status(400).json({ error: 'longUrl required' });

  // generate short code (6 chars)
  const shortCode = Math.random().toString(36).substring(2, 8);

  try {
    await pool.query(
      'INSERT INTO urls (user_id, short_code, long_url) VALUES ($1,$2,$3)',
      [req.user.id, shortCode, longUrl]
    );
    const shortUrl = `${process.env.BASE_URL}/u/${shortCode}`;
    return res.json({ shortUrl, shortCode });
  } catch (err) {
    console.error(err);
    // unique violation for short_code? try again or return error
    return res.status(500).json({ error: 'Failed to create short url' });
  }
});

// redirect handler: GET /u/:code
app.get('/u/:code', async (req, res) => {
  const { code } = req.params;
  try {
    const { rows } = await pool.query('SELECT id, long_url FROM urls WHERE short_code = $1', [code]);
    if (rows.length === 0) return res.status(404).send('Not found');
    const longUrl = rows[0].long_url;
    // increment clicks (best effort)
    pool.query('UPDATE urls SET clicks = clicks + 1 WHERE id = $1', [rows[0].id]).catch(() => {});
    return res.redirect(longUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send('Server error');
  }
});

// optional: API to list user's urls
app.get('/api/my-urls', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, short_code, long_url, clicks, created_at FROM urls WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
