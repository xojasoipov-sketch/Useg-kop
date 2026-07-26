const express = require('express');
const router = express.Router();
const { createStrategy, getStrategies } = require('./controller');

// SMM strategiyasini yaratish
router.post('/strategy', createStrategy);

// SMM strategiyalarini olish
router.get('/strategies', getStrategies);

module.exports = router;