const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        required: true,
        enum: ['Biology', 'Science', 'Mathematics', 'Chemistry', 'Physics', 'History', 'Social Studies', 'English', 'Arts', 'Other']
    },
    grade: {
        type: String,
        default: ''
    },
    accessCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Educator', // Change to your educator model name
        required: true
    },
    studentCount: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'archived'],
        default: 'active'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Class', classSchema);