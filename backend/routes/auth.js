const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

router.post(
  '/register',
  [
    body('firstName').notEmpty(),
    body('lastName').notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { firstName, lastName, email, password } = req.body;

      let existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        firstName,
        lastName,
        email,
        password: hashedPassword
      });

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'supersecret',
        { expiresIn: '1h' }
      );

      res.status(201).json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.post(
  '/login',
  [
    body('email').isEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(400).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET || 'supersecret',
        { expiresIn: '1h' }
      );

      res.json({ token, user: { id: user.id, email: user.email } });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'You have access!', user: req.user });
});

module.exports = router;
