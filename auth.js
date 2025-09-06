const express = require('express');
const router = express.Router();
const pool = require('./db'); // adjust path if needed
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Signup
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    try {
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashed]
        );
        res.json({ message: 'User created', user: result.rows[0] });
    } catch (err) {
        res.status(400).json({ error: 'User already exists or invalid input' });
    }
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const userRes = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (userRes.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

module.exports = router;
