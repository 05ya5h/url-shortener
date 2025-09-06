const express = require('express');
const router = express.Router();
const pool = require('./db'); // adjust path
const jwt = require('jsonwebtoken');

// Middleware to verify token
function authMiddleware(req, res, next) {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.userId = decoded.id;
        next();
    });
}

function generateShortCode() {
    return Math.random().toString(36).substring(2, 8);
}

// Create short URL
router.post('/shorten', authMiddleware, async (req, res) => {
    const { longURL } = req.body;
    const shortCode = generateShortCode();
    await pool.query(
        'INSERT INTO urls (user_id, short_code, long_url) VALUES ($1, $2, $3)',
        [req.userId, shortCode, longURL]
    );
    res.json({ shortURL: `http://localhost:3000/${shortCode}` });
});

// Redirect short URL
router.get('/:shortCode', async (req, res) => {
    const { shortCode } = req.params;
    const result = await pool.query('SELECT * FROM urls WHERE short_code=$1', [shortCode]);
    if (result.rows.length === 0) return res.status(404).send('URL not found');

    await pool.query('UPDATE urls SET clicks = clicks + 1 WHERE short_code=$1', [shortCode]);
    res.redirect(result.rows[0].long_url);
});

module.exports = router;
