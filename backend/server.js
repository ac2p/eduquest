// server.js (or app.js)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Statistics Schema
const statsSchema = new mongoose.Schema({
    activeClassrooms: { type: Number, default: 10000 },
    questsCompleted: { type: Number, default: 1000000 },
    studentEngagement: { type: Number, default: 94 },
    teacherRating: { type: Number, default: 5 },
    lastUpdated: { type: Date, default: Date.now }
});

const Statistics = mongoose.model('Statistics', statsSchema);

// Default statistics (run once)
async function initializeStats() {
    const count = await Statistics.countDocuments();
    if (count === 0) {
        await Statistics.create({
            activeClassrooms: 10000,
            questsCompleted: 1000000,
            studentEngagement: 94,
            teacherRating: 5
        });
        console.log('Initial statistics created');
    }
}

// API endpoint to get statistics
app.get('/api/statistics', async (req, res) => {
    try {
        const stats = await Statistics.findOne().sort({ lastUpdated: -1 });
        if (!stats) {
            return res.status(404).json({ error: 'Statistics not found' });
        }
        
        res.json({
            activeClassrooms: stats.activeClassrooms,
            questsCompleted: stats.questsCompleted,
            studentEngagement: stats.studentEngagement,
            teacherRating: stats.teacherRating,
            lastUpdated: stats.lastUpdated
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API endpoint to update statistics (for admin use)
app.put('/api/statistics', async (req, res) => {
    try {
        const { activeClassrooms, questsCompleted, studentEngagement, teacherRating } = req.body;
        
        const stats = await Statistics.findOneAndUpdate(
            {},
            {
                activeClassrooms,
                questsCompleted,
                studentEngagement,
                teacherRating,
                lastUpdated: Date.now()
            },
            { new: true, upsert: true }
        );
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    initializeStats();
});


