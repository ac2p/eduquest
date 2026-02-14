const Student = require('../models/Student');

// Get all students
const getStudents = async (req, res) => {
    try {
        const { search, status, grade } = req.query;
        
        // Build filter
        const filter = {};
        if (status) filter.status = status;
        if (grade) filter.grade = grade;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } }
            ];
        }
        
        const students = await Student.find(filter).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: students,
            pagination: {
                total: students.length,
                page: 1,
                pages: 1
            }
        });
    } catch (error) {
        console.error('Error in getStudents:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// Search students
const searchStudents = async (req, res) => {
    try {
        const { q } = req.query;
        
        const filter = q ? {
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { studentId: { $regex: q, $options: 'i' } }
            ]
        } : {};
        
        const students = await Student.find(filter).limit(20);
        
        res.json({
            success: true,
            data: students
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Get single student
const getStudent = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        res.json({ success: true, data: student });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// Create student
const createStudent = async (req, res) => {
    try {
        const student = await Student.create(req.body);
        res.status(201).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Update student
const updateStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        res.json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Update student status
const updateStudentStatus = async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }
        
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        res.json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Delete student
const deleteStudent = async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

module.exports = {
    getStudents,
    searchStudents,
    getStudent,
    createStudent,
    updateStudent,
    updateStudentStatus,
    deleteStudent
};