const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', inventoryController.list);
router.patch('/:productId', authorize('ADMIN'), inventoryController.updateStock);

module.exports = router;
