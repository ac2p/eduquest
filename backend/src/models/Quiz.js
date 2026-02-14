const mongoose = require("mongoose");

const quizSchema = new mongoose.Schema({
    title: { 
        type: String, 
        required: true 
    },
    subject: { 
        type: String, 
        required: true,
        enum: [
            'Biology', 'Science', 'Mathematics', 'Chemistry', 
            'Physics', 'History', 'Social Studies', 'English', 
            'Arts', 'General', 'Multiple Choice'
        ],
        default: 'General'
    },
    assignedClasses: [{
        type: String,
        default: []
    }],
    moduleTopic: String,
    questions: [{
        questionText: String,
        questionType: { 
            type: String, 
            enum: ['multiple-choice', 'true-false', 'short-answer', 'match-pairs'],
            default: 'multiple-choice'
        },
        options: [{
            text: String,
            isCorrect: Boolean
        }],
      
        correctAnswer: String,
        points: { type: Number, default: 1 },
        explanation: String
    }],
    passGrade: { type: Number, default: 70 },
    shuffleQuestions: { type: Boolean, default: false },
    allowRetakes: { type: Boolean, default: false },
    showAnswersImmediately: { type: Boolean, default: false },
    timeLimit: { type: Number, default: 15 },
    dueDate: Date,
    status: {
        type: String,
        enum: ['draft', 'published', 'archived'],
        default: 'draft'
    },
    teacherId: {
        type: String,
        default: ''
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        default: null
    },
    createdAt: { type: Date, default: Date.now }
});

const Quiz = mongoose.model('Quiz', quizSchema);

module.exports = Quiz;
