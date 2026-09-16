const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', productController.list);

module.exports = router;
