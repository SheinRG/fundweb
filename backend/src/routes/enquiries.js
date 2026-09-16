const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);

router.post('/', authorize('SALES'), enquiryController.create);
router.get('/', enquiryController.list);
router.get('/:id', enquiryController.getById);

module.exports = router;
