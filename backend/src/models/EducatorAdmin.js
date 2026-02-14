const mongoose = require('mongoose');

const educatorAdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    institution: {
        type: String,
        required: true,
    },
    joinDate: {
        type: Date,
        default: Date.now,
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED'],
        default: 'ACTIVE',
    },
    role: {
        type: String,
        default: 'EDUCATOR_ADMIN',
    },
    lastActive: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
    collection: 'educators' //  THIS IS THE KEY FIX - use your existing collection name
});

// Create indexes for search
educatorAdminSchema.index({ name: 'text', email: 'text', institution: 'text' });

module.exports = mongoose.model('EducatorAdmin', educatorAdminSchema);