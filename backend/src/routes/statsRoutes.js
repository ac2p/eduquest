const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');

// Public routes
router.get('/', statsController.getStatistics);

// Protected admin routes (add authentication middleware if needed)
// router.put('/', authenticate, authorize('admin'), statsController.updateStatistics);

// For now, make update public (add authentication later)
router.put('/', statsController.updateStatistics);

module.exports = router;