const Statistics = require('../models/Statistics');

// Get current statistics
exports.getStatistics = async (req, res) => {
    try {
        const stats = await Statistics.getStats();
        
        res.status(200).json({
            success: true,
            data: {
                activeClassrooms: stats.activeClassrooms,
                questsCompleted: stats.questsCompleted,
                studentEngagement: stats.studentEngagement,
                teacherRating: stats.teacherRating,
                lastUpdated: stats.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics',
            error: error.message
        });
    }
};

// Update statistics (Admin only)
exports.updateStatistics = async (req, res) => {
    try {
        const { activeClassrooms, questsCompleted, studentEngagement, teacherRating } = req.body;
        
        // Validate input
        if (activeClassrooms && (activeClassrooms < 0 || !Number.isInteger(activeClassrooms))) {
            return res.status(400).json({
                success: false,
                message: 'Active classrooms must be a positive integer'
            });
        }
        
        if (questsCompleted && (questsCompleted < 0 || !Number.isInteger(questsCompleted))) {
            return res.status(400).json({
                success: false,
                message: 'Quests completed must be a positive integer'
            });
        }
        
        if (studentEngagement && (studentEngagement < 0 || studentEngagement > 100)) {
            return res.status(400).json({
                success: false,
                message: 'Student engagement must be between 0 and 100'
            });
        }
        
        if (teacherRating && (teacherRating < 0 || teacherRating > 5)) {
            return res.status(400).json({
                success: false,
                message: 'Teacher rating must be between 0 and 5'
            });
        }
        
        const stats = await Statistics.getStats();
        
        // Update only provided fields
        const updates = {};
        if (activeClassrooms !== undefined) updates.activeClassrooms = activeClassrooms;
        if (questsCompleted !== undefined) updates.questsCompleted = questsCompleted;
        if (studentEngagement !== undefined) updates.studentEngagement = studentEngagement;
        if (teacherRating !== undefined) updates.teacherRating = teacherRating;
        updates.lastUpdated = Date.now();
        
        const updatedStats = await Statistics.findByIdAndUpdate(
            stats._id,
            updates,
            { new: true, runValidators: true }
        );
        
        res.status(200).json({
            success: true,
            message: 'Statistics updated successfully',
            data: {
                activeClassrooms: updatedStats.activeClassrooms,
                questsCompleted: updatedStats.questsCompleted,
                studentEngagement: updatedStats.studentEngagement,
                teacherRating: updatedStats.teacherRating,
                lastUpdated: updatedStats.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error updating statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update statistics',
            error: error.message
        });
    }
};

// Increment statistics (for automated updates)
exports.incrementQuestCount = async (questsCompleted = 1) => {
    try {
        const stats = await Statistics.getStats();
        stats.questsCompleted += questsCompleted;
        stats.lastUpdated = Date.now();
        await stats.save();
        return true;
    } catch (error) {
        console.error('Error incrementing quest count:', error);
        return false;
    }
};

// Get statistics for dashboard
exports.getDashboardStats = async () => {
    try {
        const stats = await Statistics.getStats();
        return {
            activeClassrooms: stats.activeClassrooms,
            questsCompleted: stats.questsCompleted,
            studentEngagement: stats.studentEngagement,
            teacherRating: stats.teacherRating,
            lastUpdated: stats.lastUpdated
        };
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return null;
    }
};