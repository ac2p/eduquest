const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Quiz = require('../models/Quiz');
const Class = require('../models/Class');
const { authenticateTeacher } = require('../middleware/auth');

// Create new quiz and assign to appropriate class
router.post('/create', authenticateTeacher, async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
        const teacherId = req.user.id;
        const { 
            title, 
            description, 
            subject, 
            moduleTopic,
            timeLimit, 
            passGrade, 
            shuffleQuestions, 
            allowRetakes, 
            showAnswersImmediately, 
            dueDate,
            questions,
            assignedClasses 
        } = req.body;
        
        // Step 1: Find or create appropriate class for this subject
        let classId;
        let className;
        
        if (assignedClasses && assignedClasses.length > 0) {
            // Use specified class
            classId = assignedClasses[0];
            const classData = await Class.findOne({ _id: classId, teacherId });
            if (!classData) {
                throw new Error('Specified class not found');
            }
            className = classData.className;
        } else {
            // Find existing class for this subject
            const existingClass = await Class.findOne({ 
                teacherId, 
                subject 
            }).sort({ createdAt: -1 });
            
            if (existingClass) {
                classId = existingClass._id;
                className = existingClass.className;
            } else {
                // Create new class for this subject
                const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newClass = new Class({
                    className: `${subject} Class`,
                    subject,
                    accessCode,
                    teacherId
                });
                
                await newClass.save({ session });
                classId = newClass._id;
                className = newClass.className;
            }
        }
        
        // Step 2: Create the quiz
        const newQuiz = new Quiz({
            title,
            description,
            subject,
            moduleTopic,
            classId,
            teacherId,
            questions: questions.map(q => ({
                questionText: q.questionText,
                questionType: q.questionType,
                points: q.points || 1,
                maxWords: q.maxWords || null,
                options: q.options || [],
                correctAnswer: q.correctAnswer || ''
            })),
            timeLimit,
            passGrade,
            shuffleQuestions,
            allowRetakes,
            showAnswersImmediately,
            dueDate: dueDate ? new Date(dueDate) : null,
            assignedClasses: [classId]
        });
        
        await newQuiz.save({ session });
        
        await session.commitTransaction();
        session.endSession();
        
        res.json({ 
            success: true, 
            quizId: newQuiz._id,
            classId,
            className,
            message: 'Quiz created and assigned to class successfully'
        });
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error creating quiz:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get quiz details
router.get('/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const { quizId } = req.params;
        const teacherId = req.user.id;
        
        const quiz = await Quiz.findOne({
            _id: quizId,
            teacherId
        }).populate('classId', 'className subject');
        
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        
        // Get attempt statistics
        const attempts = await Attempt.aggregate([
            { $match: { quizId: mongoose.Types.ObjectId(quizId) } },
            {
                $group: {
                    _id: null,
                    attemptCount: { $sum: 1 },
                    avgScore: { $avg: '$percentage' },
                    bestScore: { $max: '$percentage' }
                }
            }
        ]);
        
        const stats = attempts[0] || { attemptCount: 0, avgScore: 0, bestScore: 0 };
        
        res.json({ 
            success: true, 
            quiz,
            stats 
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quiz' });
    }
});

// Update quiz
router.put('/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const { quizId } = req.params;
        const teacherId = req.user.id;
        const updateData = req.body;
        
        // Remove fields that shouldn't be updated directly
        delete updateData._id;
        delete updateData.teacherId;
        delete updateData.createdAt;
        
        // Update quiz
        const quiz = await Quiz.findOneAndUpdate(
            { _id: quizId, teacherId },
            { $set: updateData },
            { new: true, runValidators: true }
        );
        
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        
        res.json({ success: true, quiz, message: 'Quiz updated successfully' });
    } catch (error) {
        console.error('Error updating quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to update quiz' });
    }
});

// Delete quiz
router.delete('/:quizId', authenticateTeacher, async (req, res) => {
    try {
        const { quizId } = req.params;
        const teacherId = req.user.id;
        
        const quiz = await Quiz.findOneAndDelete({ 
            _id: quizId, 
            teacherId 
        });
        
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        
        // Also delete attempts for this quiz
        await Attempt.deleteMany({ quizId });
        
        res.json({ success: true, message: 'Quiz deleted successfully' });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to delete quiz' });
    }
});

// Update quiz status
router.patch('/:quizId/status', authenticateTeacher, async (req, res) => {
    try {
        const { quizId } = req.params;
        const { status } = req.body;
        const teacherId = req.user.id;
        
        const quiz = await Quiz.findOneAndUpdate(
            { _id: quizId, teacherId },
            { $set: { status } },
            { new: true }
        );
        
        if (!quiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        
        res.json({ success: true, quiz, message: `Quiz ${status} successfully` });
    } catch (error) {
        console.error('Error updating quiz status:', error);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Duplicate quiz
router.post('/:quizId/duplicate', authenticateTeacher, async (req, res) => {
    try {
        const { quizId } = req.params;
        const teacherId = req.user.id;
        
        // Find original quiz
        const originalQuiz = await Quiz.findOne({ 
            _id: quizId, 
            teacherId 
        });
        
        if (!originalQuiz) {
            return res.status(404).json({ success: false, error: 'Quiz not found' });
        }
        
        // Create duplicate
        const duplicateQuiz = new Quiz({
            ...originalQuiz.toObject(),
            _id: undefined,
            title: `${originalQuiz.title} (Copy)`,
            status: 'draft',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        
        await duplicateQuiz.save();
        
        res.json({ 
            success: true, 
            quizId: duplicateQuiz._id,
            message: 'Quiz duplicated successfully' 
        });
    } catch (error) {
        console.error('Error duplicating quiz:', error);
        res.status(500).json({ success: false, error: 'Failed to duplicate quiz' });
    }
});

// Get quizzes by subject
router.get('/subject/:subject', authenticateTeacher, async (req, res) => {
    try {
        const { subject } = req.params;
        const teacherId = req.user.id;
        
        const quizzes = await Quiz.find({
            teacherId,
            subject,
            status: { $ne: 'archived' }
        })
        .sort({ createdAt: -1 })
        .populate('classId', 'className');
        
        res.json({ success: true, quizzes });
    } catch (error) {
        console.error('Error fetching quizzes by subject:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch quizzes' });
    }
});

// Bulk update quizzes (assign to different class)
router.patch('/bulk/assign', authenticateTeacher, async (req, res) => {
    try {
        const { quizIds, classId } = req.body;
        const teacherId = req.user.id;
        
        // Verify teacher owns the target class
        const targetClass = await Class.findOne({ 
            _id: classId, 
            teacherId 
        });
        
        if (!targetClass) {
            return res.status(404).json({ success: false, error: 'Class not found' });
        }
        
        // Update quizzes
        const result = await Quiz.updateMany(
            { 
                _id: { $in: quizIds }, 
                teacherId 
            },
            { 
                $set: { 
                    classId,
                    subject: targetClass.subject,
                    $addToSet: { assignedClasses: classId }
                } 
            }
        );
        
        res.json({ 
            success: true, 
            modifiedCount: result.modifiedCount,
            message: `${result.modifiedCount} quizzes reassigned`
        });
    } catch (error) {
        console.error('Error bulk updating quizzes:', error);
        res.status(500).json({ success: false, error: 'Failed to update quizzes' });
    }
});

module.exports = router;