const mongoose = require('mongoose');

const statsSchema = new mongoose.Schema({
    activeClassrooms: { 
        type: Number, 
        default: 10000,
        min: 0
    },
    questsCompleted: { 
        type: Number, 
        default: 1000000,
        min: 0
    },
    studentEngagement: { 
        type: Number, 
        default: 94,
        min: 0,
        max: 100
    },
    teacherRating: { 
        type: Number, 
        default: 5,
        min: 0,
        max: 5
    },
    lastUpdated: { 
        type: Date, 
        default: Date.now 
    }
}, {
    timestamps: true
});

// Ensure only one statistics document exists
statsSchema.statics.getStats = async function() {
    let stats = await this.findOne();
    if (!stats) {
        stats = await this.create({
            activeClassrooms: 10000,
            questsCompleted: 1000000,
            studentEngagement: 94,
            teacherRating: 5
        });
    }
    return stats;
};

module.exports = mongoose.model('Statistics', statsSchema);