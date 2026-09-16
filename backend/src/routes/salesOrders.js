const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.get('/', salesOrderController.list);
router.get('/:id', salesOrderController.getById);
router.post('/:id/confirm', authorize('ADMIN'), salesOrderController.confirm);
router.post('/:id/dispatch', authorize('ADMIN'), salesOrderController.dispatch);

module.exports = router;
