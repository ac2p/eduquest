const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const Quiz = require('../models/Quiz');
const Attempt = require('../models/Attempt');
const { authenticateTeacher } = require('../middleware/auth');

// Get all classes for a teacher
router.get('/my-classes', authenticateTeacher, async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        const classes = await Class.aggregate([
            { $match: { teacherId: mongoose.Types.ObjectId(teacherId) } },
            {
                $lookup: {
                    from: 'quizzes',
                    localField: '_id',
                    foreignField: 'classId',
                    as: 'quizzes'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: 'classId',
                    pipeline: [
                        { $match: { role: 'student' } }
                    ],
                    as: 'students'
                }
            },
            {
                $addFields: {
                    quizCount: { $size: '$quizzes' },
                    studentCount: { $size: '$students' },
                    activeQuizCount: {
                        $size: {
                            $filter: {
                                input: '$quizzes',
                                as: 'quiz',
                                cond: { $eq: ['$$quiz.status', 'published'] }
                            }
                        }
                    }
                }
            },
            {
                $project: {
                    quizzes: 0,
                    students: 0
                }
            },
            { $sort: { status: 1, createdAt: -1 } }
        ]);
        
        res.json({ success: true, classes });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch classes' });
    }
});

// Get single class with quizzes
router.get('/:classId', authenticateTeacher, async (req, res) => {
    try {
        const { classId } = req.params;
        const teacherId = req.user.id;
        
        // Get class details
        const classData = await Class.findOne({
            _id: classId,
            teacherId: teacherId
        });
        
        if (!classData) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        // Get quizzes for this class with attempt statistics
        const quizzes = await Quiz.aggregate([
            { $match: { classId: mongoose.Types.ObjectId(classId), teacherId: mongoose.Types.ObjectId(teacherId) } },
            {
                $lookup: {
                    from: 'attempts',
                    localField: '_id',
                    foreignField: 'quizId',
                    as: 'attempts'
                }
            },
            {
                $addFields: {
                    attemptCount: { $size: '$attempts' },
                    avgScore: {
                        $cond: {
                            if: { $gt: [{ $size: '$attempts' }, 0] },
                            then: { $avg: '$attempts.percentage' },
                            else: 0
                        }
                    },
                    questionCount: { $size: '$questions' }
                }
            },
            {
                $project: {
                    attempts: 0
                }
            },
            {
                $sort: {
                    status: 1,
                    dueDate: 1
                }
            }
        ]);
        
        res.json({ 
            success: true, 
            class: classData, 
            quizzes 
        });
    } catch (error) {
        console.error('Error fetching class:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch class' });
    }
});

// Get all quizzes for a teacher (across all classes)
router.get('/:classId/quizzes/all', authenticateTeacher, async (req, res) => {
    try {
        const teacherId = req.user.id;
        const { subject, status, search, page = 1, limit = 10 } = req.query;
        
        // Build match query
        const matchQuery = { teacherId: mongoose.Types.ObjectId(teacherId) };
        
        if (subject && subject !== 'all') {
            matchQuery.subject = subject;
        }
        
        if (status && status !== 'all') {
            matchQuery.status = status;
        }
        
        if (search) {
            matchQuery.$or = [
                { title: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { moduleTopic: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get quizzes with pagination
        const [quizzes, total] = await Promise.all([
            Quiz.aggregate([
                { $match: matchQuery },
                {
                    $lookup: {
                        from: 'classes',
                        localField: 'classId',
                        foreignField: '_id',
                        as: 'class'
                    }
                },
                { $unwind: { path: '$class', preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: 'attempts',
                        localField: '_id',
                        foreignField: 'quizId',
                        as: 'attempts'
                    }
                },
                {
                    $addFields: {
                        attemptCount: { $size: '$attempts' },
                        avgScore: {
                            $cond: {
                                if: { $gt: [{ $size: '$attempts' }, 0] },
                                then: { $avg: '$attempts.percentage' },
                                else: 0
                            }
                        },
                        questionCount: { $size: '$questions' },
                        className: '$class.className',
                        classSubject: '$class.subject'
                    }
                },
                {
                    $project: {
                        attempts: 0,
                        class: 0
                    }
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: parseInt(limit) }
            ]),
            Quiz.countDocuments(matchQuery)
        ]);
        
        // Get statistics
        const stats = await Quiz.aggregate([
            { $match: { teacherId: mongoose.Types.ObjectId(teacherId) } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    published: {
                        $sum: { $cond: [{ $eq: ['$status', 'published'] }, 1, 0] }
                    },
                    draft: {
                        $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
                    }
                }
            }
        ]);
        
        res.json({ 
            success: true, 
            quizzes,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            stats: stats[0] || { total: 0, published: 0, draft: 0 }
        });
    } catch (error) {
        console.error('Error fetching all quizzes:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

// Create new class
router.post('/create', authenticateTeacher, async (req, res) => {
    try {
        const { className, subject, grade } = req.body;
        const teacherId = req.user.id;
        
        // Generate unique access code
        const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // Check if access code already exists
        const existingClass = await Class.findOne({ accessCode });
        if (existingClass) {
            // Regenerate if exists (very rare but possible)
            accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        }
        
        const newClass = new Class({
            className,
            subject,
            grade,
            accessCode,
            teacherId
        });
        
        await newClass.save();
        
        res.json({ 
            success: true, 
            classId: newClass._id,
            accessCode 
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({ success: false, error: 'Failed to create class' });
    }
});

// Get quiz statistics for dashboard
router.get('/dashboard/stats', authenticateTeacher, async (req, res) => {
    try {
        const teacherId = req.user.id;
        
        const stats = await Promise.all([
            // Total classes
            Class.countDocuments({ teacherId }),
            
            // Total quizzes
            Quiz.countDocuments({ teacherId }),
            
            // Active quizzes (published)
            Quiz.countDocuments({ teacherId, status: 'published' }),
            
            // Average score across all attempts
            Attempt.aggregate([
                {
                    $lookup: {
                        from: 'quizzes',
                        localField: 'quizId',
                        foreignField: '_id',
                        as: 'quiz'
                    }
                },
                { $unwind: '$quiz' },
                { $match: { 'quiz.teacherId': mongoose.Types.ObjectId(teacherId) } },
                {
                    $group: {
                        _id: null,
                        avgScore: { $avg: '$percentage' },
                        totalAttempts: { $sum: 1 }
                    }
                }
            ])
        ]);
        
        res.json({
            success: true,
            stats: {
                totalClasses: stats[0],
                totalQuizzes: stats[1],
                activeQuizzes: stats[2],
                avgScore: stats[3][0]?.avgScore || 0,
                totalAttempts: stats[3][0]?.totalAttempts || 0
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

module.exports = router;