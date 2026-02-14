const express = require('express');
const router = express.Router();
const {
  getEducatorAdmins,
  searchEducatorAdmins,
  getEducatorAdmin,
  createEducatorAdmin,
  updateEducatorAdmin,
  suspendEducatorAdmin,
  reactivateEducatorAdmin,
  deleteEducatorAdmin,
} = require('../controllers/educatorAdminController');

router.route('/')
  .get(getEducatorAdmins)
  .post(createEducatorAdmin);

router.get('/search', searchEducatorAdmins);

router.route('/:id')
  .get(getEducatorAdmin)
  .put(updateEducatorAdmin)
  .delete(deleteEducatorAdmin);

router.patch('/:id/suspend', suspendEducatorAdmin);
router.patch('/:id/reactivate', reactivateEducatorAdmin);

module.exports = router;