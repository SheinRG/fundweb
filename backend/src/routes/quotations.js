const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('SALES'), quotationController.create);
router.get('/', quotationController.list);
router.get('/:id', quotationController.getById);
router.patch('/:id/status', authorize('SALES'), quotationController.updateStatus);
router.post('/:id/convert', authorize('SALES'), quotationController.convertToSalesOrder);

module.exports = router;
