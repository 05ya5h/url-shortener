// auth.js
import express from 'express';
import pool from './db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// POST /api/auth/register
router.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (exists.rowCount > 0) return res.status(409).json({ error: 'User exists' });

    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      'INSERT INTO users(username, email, password) VALUES ($1,$2,$3) RETURNING id, username, email',
      [username, email, hash]
    );
    const user = rows[0];
    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/api/auth/login', async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows } = await pool.query(
      'SELECT id, username, email, password FROM users WHERE email=$1 OR username=$1',
      [emailOrUsername]
    );
    if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

export default router;
