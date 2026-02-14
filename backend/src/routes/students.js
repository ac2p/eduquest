const express = require('express');
const router = express.Router();
const {
    getStudents,
    searchStudents,
    getStudent,
    createStudent,
    updateStudent,
    updateStudentStatus,
    deleteStudent
} = require('../controllers/studentController');

// Search route
router.get('/search', searchStudents);

// Main routes
router.route('/')
    .get(getStudents)
    .post(createStudent);

// Individual routes
router.route('/:id')
    .get(getStudent)
    .put(updateStudent)
    .delete(deleteStudent);

// Status update
router.patch('/:id/status', updateStudentStatus);

module.exports = router;