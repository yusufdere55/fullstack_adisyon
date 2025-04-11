const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const {authMiddleware, roleMiddleware } = require('../middleware/auth.middleware');

router.post('/login',authController.login)

router.post('/register',authController.register)

module.exports = router;