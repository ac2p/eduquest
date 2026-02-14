const cron = require("node-cron");
require('dotenv').config();
const hbs = require("hbs");
const cors = require('cors')
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const session = require("express-session");
const path = require('path');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const rateLimit = require('express-rate-limit');

// =============== IMPORT MODELS ===============
const ChallengeSchedule = require("./models/ChallengeSchedule");
const Challenge = require("./models/Challenge");
const Quiz = require('./models/Quiz');
const Class = require('./models/Class');
const Statistics = require('./models/Statistics');
const Attempt = require('./models/Attempt');
const EducatorAdmin = require('./models/EducatorAdmin');
const Student = require('./models/Student');
const AttemptChallenge = require('./models/AttemptChallenge');
const AttemptQuiz = require('./models/AttemptQuiz');
const Educator = require('./models/Educator');
const Feedback = require('./models/feedback');
const Institution = require('./models/Institution');
const Invoice = require('./models/Invoice');
const StudentReward = require('./models/StudentReward');
const Subscription = require('./models/Subscription');
const SubscriptionPlan = require('./models/SubscriptionPlan');

// =============== IMPORT ROUTES ===============
const educatorRoutes = require("./routes/educatorRoutes");
const edadminRoutes = require("./routes/edadminRoutes");
const studentRoutes = require("./routes/studentRoutes");
const adminRoutes = require("./routes/adminRoutes");
const unregRoutes = require("./routes/unregRoutes");
const feedbackRoutes = require("./routes/feedbackRoutes");
const studentViewQuizRoutes = require("./routes/studentViewQuizRoutes");
const attemptQuizRoutes = require("./routes/attemptQuizRoutes");
const attemptChallengesRoutes = require("./routes/attemptChallengesRoutes");
const pickChallengesRoutes = require("./routes/pickChallengesRoutes");
const viewChallengesRoutes = require("./routes/viewChallengesRoutes");
const subscriptionPlanRoutes = require("./routes/subscriptionplanRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const manageSubscriptionRoutes = require("./routes/manageSubscriptionRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");

const connectDB = require("./config/db");

// =============== MIDDLEWARE ===============
app.use(express.static("public"));
app.use(express.static(path.join(__dirname, '../../frontend')));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5500',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Session configuration
app.use(
  session({
    secret: "k8d9fjsl39fjs8fjsldkfj394jfslf",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  })
);

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', apiLimiter);

// =============== VIEW ENGINE SETUP ===============
app.set("view engine", "hbs");
hbs.registerHelper("ifEquals", function (arg1, arg2, options) {
  return arg1 == arg2 ? options.fn(this) : options.inverse(this);
});

// =============== DATABASE CONNECTION ===============
connectDB(); // From config/db

const MONGODB_URI = process.env.MONGODB_URI || process.env.DB_URI || 'mongodb+srv://aungsithuphyoe_db_user:TestPass123@eduquest.oq3vfld.mongodb.net/eduquest';

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB successfully!');
    initializeStatistics();
    initializeEducatorAdmins();
    initializeStudents();
  })
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =============== GEMINI AI INITIALIZATION ===============
let genAI, model;
if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    console.log('🤖 Gemini AI initialized successfully!');
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
  }
} else {
  console.warn('⚠️ GEMINI_API_KEY not found. AI features will be disabled.');
}

// =============== AUTH MIDDLEWARE ===============
const authenticateTeacher = (req, res, next) => {
    req.user = { 
        id: new mongoose.Types.ObjectId(),
        role: 'teacher' 
    };
    next();
};

// Apply to protected routes
app.use('/api/classes', authenticateTeacher);
app.use('/api/quizzes/save', authenticateTeacher);
app.use('/api/quizzes/all', authenticateTeacher);
app.use('/api/statistics', authenticateTeacher);

// =============== CRON JOB FOR CHALLENGE SCHEDULING ===============
cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log("⏰ Running challenge scheduler:", now);

  try {
    // Make challenges AVAILABLE when within time range
    const activeSchedules = await ChallengeSchedule.find({
      startDate: { $lte: now },
      endDate: { $gte: now }
    });

    for (let s of activeSchedules) {
      await Challenge.updateOne(
        { _id: s.challengeId },
        { status: "available" }
      );
      console.log("✅ Made AVAILABLE:", s.challengeId);
    }

    // Make challenges UNAVAILABLE when end time has passed
    const expiredSchedules = await ChallengeSchedule.find({
      endDate: { $lt: now }
    });

    for (let s of expiredSchedules) {
      await Challenge.updateOne(
        { _id: s.challengeId },
        { status: "unavailable" }
      );
      console.log("❌ Made UNAVAILABLE:", s.challengeId);
    }

  } catch (err) {
    console.error("Cron error:", err);
  }
});

// =============== SCHEMAS & MODELS ===============

// QUIZ SCHEMA
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

// CLASS SCHEMA
const classSchema = new mongoose.Schema({
    className: {
        type: String,
        required: true,
        trim: true
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
        type: String,
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
    }
}, {
    timestamps: true
});

// STATISTICS SCHEMA
const statisticsSchema = new mongoose.Schema({
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
statisticsSchema.statics.getStats = async function() {
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

// ATTEMPT SCHEMA
const attemptSchema = new mongoose.Schema({
    quizId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Quiz',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    classId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Class',
        required: true
    },
    answers: [{
        questionId: mongoose.Schema.Types.ObjectId,
        answer: String,
        isCorrect: Boolean,
        points: Number
    }],
    score: {
        type: Number,
        default: 0
    },
    totalPoints: {
        type: Number,
        default: 0
    },
    percentage: {
        type: Number,
        default: 0
    },
    timeSpent: {
        type: Number,
        default: 0
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// EDUCATOR ADMIN SCHEMA
const educatorAdminSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    institution: {
        type: String,
        required: [true, 'Institution is required'],
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
    phone: String,
    department: String,
}, {
    timestamps: true,
});

// STUDENT SCHEMA
const studentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Student name is required'],
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    studentId: {
        type: String,
        required: [true, 'Student ID is required'],
        unique: true,
    },
    grade: {
        type: String,
        required: [true, 'Grade is required'],
    },
    teacher: {
        type: String,
        required: [true, 'Teacher name is required'],
    },
    institution: {
        type: String,
        required: [true, 'Institution is required'],
    },
    status: {
        type: String,
        enum: ['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED'],
        default: 'ACTIVE',
    },
    enrollmentDate: {
        type: Date,
        default: Date.now,
    },
    dateOfBirth: Date,
    parentInfo: {
        name: String,
        email: String,
        phone: String,
    },
    address: {
        street: String,
        city: String,
        state: String,
        zipCode: String,
    },
    educatorAdminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'EducatorAdmin',
    },
    attendance: [{
        date: Date,
        status: {
            type: String,
            enum: ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'],
        },
    }],
}, {
    timestamps: true,
});

// Create indexes for search
educatorAdminSchema.index({ name: 'text', email: 'text', institution: 'text' });
studentSchema.index({ name: 'text', email: 'text', studentId: 'text' });

// =============== REGISTER MODELS ===============
// Only register models if they haven't been registered already
try {
  if (!mongoose.models.Quiz) mongoose.model('Quiz', quizSchema);
  if (!mongoose.models.Class) mongoose.model('Class', classSchema);
  if (!mongoose.models.Statistics) mongoose.model('Statistics', statisticsSchema);
  if (!mongoose.models.Attempt) mongoose.model('Attempt', attemptSchema);
  if (!mongoose.models.EducatorAdmin) mongoose.model('EducatorAdmin', educatorAdminSchema);
  if (!mongoose.models.Student) mongoose.model('Student', studentSchema);
} catch (error) {
  console.log('Models already registered or error:', error.message);
}

// =============== INITIALIZATION FUNCTIONS ===============
async function initializeStatistics() {
    try {
        const Statistics = mongoose.model('Statistics');
        const count = await Statistics.countDocuments();
        if (count === 0) {
            await Statistics.create({
                activeClassrooms: 10000,
                questsCompleted: 1000000,
                studentEngagement: 94,
                teacherRating: 5
            });
            console.log('📊 Initial statistics created');
        } else {
            console.log('📊 Statistics already initialized');
        }
    } catch (error) {
        console.error('❌ Error initializing statistics:', error);
    }
}

async function initializeEducatorAdmins() {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const count = await EducatorAdmin.countDocuments();
        if (count === 0) {
            await EducatorAdmin.insertMany([
                {
                    name: 'Principal Skinner',
                    email: 'skinner@springfield.edu',
                    institution: 'Springfield Elementary',
                    status: 'ACTIVE',
                },
                {
                    name: 'Vance Refrigeration',
                    email: 'bob@vance.com',
                    institution: 'Scranton High',
                    status: 'SUSPENDED',
                    joinDate: new Date('2024-01-04'),
                },
                {
                    name: 'Ms. Hoover',
                    email: 'hoover@springfield.edu',
                    institution: 'Springfield Elementary',
                    status: 'ACTIVE',
                },
                {
                    name: 'Mrs. Krabappel',
                    email: 'krabappel@springfield.edu',
                    institution: 'Springfield Elementary',
                    status: 'ACTIVE',
                },
            ]);
            console.log('👤 Initial educator admins created');
        } else {
            console.log(`👤 ${count} educator admins found in database`);
        }
    } catch (error) {
        console.error('❌ Error initializing educator admins:', error);
    }
}

async function initializeStudents() {
    try {
        const Student = mongoose.model('Student');
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const count = await Student.countDocuments();
        if (count === 0) {
            const educators = await EducatorAdmin.find();
            
            if (educators.length > 0) {
                await Student.insertMany([
                    {
                        name: 'Lisa Simpson',
                        email: 'lisa@student.edu',
                        studentId: '88291',
                        grade: '2',
                        teacher: 'Ms. Hoover',
                        institution: 'Springfield Elementary',
                        status: 'ACTIVE',
                        educatorAdminId: educators.find(e => e.name === 'Ms. Hoover')?._id || educators[0]._id,
                        parentInfo: {
                            name: 'Homer Simpson',
                            email: 'homer@simpson.com',
                            phone: '555-0101',
                        },
                        enrollmentDate: new Date('2023-09-01'),
                    },
                    {
                        name: 'Bart Simpson',
                        email: 'bart@student.edu',
                        studentId: '10294',
                        grade: '4',
                        teacher: 'Mrs. Krabappel',
                        institution: 'Springfield Elementary',
                        status: 'ACTIVE',
                        educatorAdminId: educators.find(e => e.name === 'Mrs. Krabappel')?._id || educators[0]._id,
                        parentInfo: {
                            name: 'Homer Simpson',
                            email: 'homer@simpson.com',
                            phone: '555-0101',
                        },
                        enrollmentDate: new Date('2023-09-01'),
                    },
                    {
                        name: 'Nelson Muntz',
                        email: 'nelson@student.edu',
                        studentId: '59204',
                        grade: '4',
                        teacher: 'Mrs. Krabappel',
                        institution: 'Springfield Elementary',
                        status: 'SUSPENDED',
                        educatorAdminId: educators.find(e => e.name === 'Mrs. Krabappel')?._id || educators[0]._id,
                        enrollmentDate: new Date('2023-09-01'),
                    },
                    {
                        name: 'Jim Halpert',
                        email: 'jim@dundermifflin.edu',
                        studentId: '20384',
                        grade: '11',
                        teacher: 'Mr. Schrute',
                        institution: 'Scranton High',
                        status: 'ACTIVE',
                        educatorAdminId: educators.find(e => e.name === 'Vance Refrigeration')?._id || educators[1]._id,
                        enrollmentDate: new Date('2023-08-15'),
                    },
                ]);
                console.log('🎓 Initial students created');
            }
        } else {
            console.log(`🎓 ${count} students found in database`);
        }
    } catch (error) {
        console.error('❌ Error initializing students:', error);
    }
}

// =============== ROUTES ===============
app.use("/", unregRoutes);
app.use("/edadmin", edadminRoutes);
app.use("/educator", educatorRoutes);
app.use("/student", studentRoutes);
app.use("/admin", adminRoutes);
app.use("/api/educators", educatorRoutes);
app.use("/api/feedbacks", feedbackRoutes);
app.use("/api/quizzes", studentViewQuizRoutes);
app.use("/api/attemptquiz", attemptQuizRoutes);
app.use("/api/attempt-challenges", attemptChallengesRoutes);
app.use("/api/pick-challenges", pickChallengesRoutes);
app.use("/api/view-challenges", viewChallengesRoutes);
app.use("/api/subscriptionplans", subscriptionPlanRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/manage-subscription", manageSubscriptionRoutes);
app.use("/api/invoice", invoiceRoutes);

// =============== STATISTICS API ENDPOINTS ===============
app.get('/api/statistics', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
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
});

app.put('/api/statistics', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
        const { activeClassrooms, questsCompleted, studentEngagement, teacherRating } = req.body;
        
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
});

app.post('/api/statistics/increment-quests', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
        const { count = 1 } = req.body;
        
        const stats = await Statistics.getStats();
        stats.questsCompleted += count;
        stats.lastUpdated = Date.now();
        await stats.save();
        
        res.status(200).json({
            success: true,
            message: `Quests completed incremented by ${count}`,
            data: {
                questsCompleted: stats.questsCompleted,
                lastUpdated: stats.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error incrementing quests:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to increment quests',
            error: error.message
        });
    }
});

app.get('/api/statistics/dashboard', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
        const Quiz = mongoose.model('Quiz');
        const Class = mongoose.model('Class');
        const Attempt = mongoose.model('Attempt');
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const Student = mongoose.model('Student');
        
        const stats = await Statistics.getStats();
        
        const totalQuizzes = await Quiz.countDocuments();
        const totalClasses = await Class.countDocuments();
        const totalAttempts = await Attempt.countDocuments();
        const totalEducatorAdmins = await EducatorAdmin.countDocuments();
        const totalStudents = await Student.countDocuments();
        
        const publishedQuizzes = await Quiz.countDocuments({ status: 'published' });
        const quizCompletionRate = totalAttempts > 0 ? 
            Math.min(100, Math.round((totalAttempts / (publishedQuizzes || 1)) * 10)) : 0;
        
        res.status(200).json({
            success: true,
            data: {
                platformStats: {
                    activeClassrooms: stats.activeClassrooms,
                    questsCompleted: stats.questsCompleted,
                    studentEngagement: stats.studentEngagement,
                    teacherRating: stats.teacherRating
                },
                userStats: {
                    totalEducatorAdmins,
                    totalStudents,
                },
                systemStats: {
                    totalQuizzes,
                    totalClasses,
                    totalAttempts,
                    publishedQuizzes,
                    quizCompletionRate
                },
                lastUpdated: stats.lastUpdated
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dashboard statistics',
            error: error.message
        });
    }
});

// =============== EDUCATOR ADMIN ENDPOINTS ===============
app.get('/api/educator-admins', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, search } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { institution: { $regex: search, $options: 'i' } },
            ];
        }

        const admins = await EducatorAdmin.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await EducatorAdmin.countDocuments(filter);
        const statuses = await EducatorAdmin.distinct('status');

        res.json({
            success: true,
            data: admins,
            filters: { statuses },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});


app.get('/api/educator-admins/search', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const { q } = req.query;
        
        const filter = q ? {
            $or: [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { institution: { $regex: q, $options: 'i' } },
            ]
        } : {};

        const admins = await EducatorAdmin.find(filter).limit(20);
        
        res.json({
            success: true,
            data: admins,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/educator-admins/:id', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const Student = mongoose.model('Student');
        const admin = await EducatorAdmin.findById(req.params.id);
        
        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }
        
        const students = await Student.find({ educatorAdminId: admin._id });
        
        res.json({ 
            success: true, 
            data: {
                ...admin.toObject(),
                students: students
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/educator-admins', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const admin = await EducatorAdmin.create(req.body);
        res.status(201).json({ success: true, data: admin });
    } catch (error) {
        if (error.code === 11000) {
            res.status(400).json({ 
                success: false, 
                error: 'Email already exists' 
            });
        } else {
            res.status(400).json({ success: false, error: error.message });
        }
    }
});

app.put('/api/educator-admins/:id', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const admin = await EducatorAdmin.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }
        
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.patch('/api/educator-admins/:id/status', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const { status } = req.body;
        
        if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const admin = await EducatorAdmin.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );
        
        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }
        
        res.json({ success: true, data: admin });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.delete('/api/educator-admins/:id', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const Student = mongoose.model('Student');
        const admin = await EducatorAdmin.findByIdAndDelete(req.params.id);
        
        if (!admin) {
            return res.status(404).json({ success: false, error: 'Admin not found' });
        }
        
        await Student.updateMany(
            { educatorAdminId: admin._id },
            { $unset: { educatorAdminId: "" } }
        );
        
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============== STUDENT ENDPOINTS ===============
app.get('/api/students', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;
        const { status, grade, institution, search, educatorAdminId } = req.query;

        const filter = {};
        if (status) filter.status = status;
        if (grade) filter.grade = grade;
        if (institution) filter.institution = institution;
        if (educatorAdminId) filter.educatorAdminId = educatorAdminId;
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { studentId: { $regex: search, $options: 'i' } },
            ];
        }

        const students = await Student.find(filter)
            .populate('educatorAdminId', 'name email')
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        const total = await Student.countDocuments(filter);
        const [grades, institutions, statuses] = await Promise.all([
            Student.distinct('grade'),
            Student.distinct('institution'),
            Student.distinct('status'),
        ]);

        res.json({
            success: true,
            data: students,
            filters: { grades, institutions, statuses },
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});









app.get('/api/debug/educator-data', async (req, res) => {
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        let educatorData = [];
        let educatorCount = 0;
        
        if (collectionNames.includes('educatoradmin')) {
            educatorData = await mongoose.connection.db
                .collection('educatoradmin')
                .find({})
                .limit(10)
                .toArray();
            educatorCount = await mongoose.connection.db
                .collection('educatoradmin')
                .countDocuments();
        }
        
        let modelData = [];
        try {
            const EducatorAdmin = mongoose.model('EducatorAdmin');
            modelData = await EducatorAdmin.find({}).limit(10);
        } catch (modelError) {
            console.error('Model query error:', modelError);
        }
        
        res.json({
            success: true,
            database: mongoose.connection.name,
            collections: collectionNames,
            directQuery: {
                count: educatorCount,
                sample: educatorData
            },
            modelQuery: {
                count: modelData.length,
                sample: modelData,
                modelCollection: EducatorAdmin?.collection?.name || 'unknown'
            },
            connection: {
                host: mongoose.connection.host,
                port: mongoose.connection.port,
                readyState: mongoose.connection.readyState
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
});

app.get('/api/students/search', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const { q, grade, status, institution } = req.query;
        
        const filter = {};
        
        if (q) {
            filter.$or = [
                { name: { $regex: q, $options: 'i' } },
                { email: { $regex: q, $options: 'i' } },
                { studentId: { $regex: q, $options: 'i' } },
            ];
        }
        
        if (grade) filter.grade = grade;
        if (status) filter.status = status;
        if (institution) filter.institution = institution;

        const students = await Student.find(filter)
            .populate('educatorAdminId', 'name email')
            .limit(20);

        res.json({
            success: true,
            data: students,
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/students/:id', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const Attempt = mongoose.model('Attempt');
        const student = await Student.findById(req.params.id)
            .populate('educatorAdminId', 'name email institution');
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        const attempts = await Attempt.find({ studentId: student._id })
            .populate('quizId', 'title subject')
            .sort({ completedAt: -1 });
        
        res.json({ 
            success: true, 
            data: {
                ...student.toObject(),
                attempts
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/students', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const existingStudent = await Student.findOne({
            $or: [
                { studentId: req.body.studentId },
                { email: req.body.email }
            ]
        });

        if (existingStudent) {
            return res.status(400).json({ 
                success: false, 
                error: 'Student with this ID or email already exists' 
            });
        }

        const student = await Student.create(req.body);
        res.status(201).json({ success: true, data: student });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.put('/api/students/:id', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
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
});

app.patch('/api/students/:id/status', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
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
});

app.delete('/api/students/:id', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const Attempt = mongoose.model('Attempt');
        const student = await Student.findByIdAndDelete(req.params.id);
        
        if (!student) {
            return res.status(404).json({ success: false, error: 'Student not found' });
        }
        
        await Attempt.deleteMany({ studentId: student._id });
        
        res.json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/students/bulk-delete', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const Attempt = mongoose.model('Attempt');
        const { ids } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'Please provide an array of IDs' });
        }

        const result = await Student.deleteMany({ _id: { $in: ids } });
        
        await Attempt.deleteMany({ studentId: { $in: ids } });
        
        res.json({ 
            success: true, 
            message: `${result.deletedCount} students deleted successfully` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/api/students/bulk-status', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const { ids, status } = req.body;
        
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ success: false, error: 'Please provide an array of IDs' });
        }
        
        if (!['ACTIVE', 'SUSPENDED', 'GRADUATED', 'TRANSFERRED'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        const result = await Student.updateMany(
            { _id: { $in: ids } },
            { status }
        );
        
        res.json({ 
            success: true, 
            message: `${result.modifiedCount} students updated successfully` 
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// =============== AI ENDPOINTS ===============
app.get('/api/ai/health', (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ 
      status: 'disabled', 
      message: 'Gemini AI is not configured' 
    });
  }
  
  res.json({ 
    status: 'healthy', 
    service: 'EduQuest AI Assistant',
    timestamp: new Date().toISOString(),
    model: 'gemini-2.5-flash'
  });
});

app.post('/api/ai/assist', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY || !model) {
      return res.status(503).json({ 
        error: 'AI service is not configured',
        message: 'Please set GEMINI_API_KEY in environment variables'
      });
    }

    const { message, context, action } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let prompt = '';
    
    switch(action) {
      case 'generate_question':
        prompt = generateQuestionPrompt(message, context);
        break;
      case 'improve_question':
        prompt = improveQuestionPrompt(message, context);
        break;
      case 'suggest_answers':
        prompt = suggestAnswersPrompt(message, context);
        break;
      case 'check_difficulty':
        prompt = checkDifficultyPrompt(message, context);
        break;
      case 'explain_concept':
        prompt = explainConceptPrompt(message, context);
        break;
      default:
        prompt = generalAssistantPrompt(message, context);
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      response: text,
      action: action,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      error: 'Failed to process AI request',
      details: error.message 
    });
  }
});


// =============== EDUCATOR QUIZ MANAGEMENT ENDPOINTS ===============

/**
 * GET /api/educator/quizzes
 * Get all quizzes (alias for /api/quizzes)
 */
app.get('/api/educator/quizzes', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const { classId, teacherId, status } = req.query;
        
        // Build filter
        const filter = {};
        if (classId) filter.classId = classId;
        if (teacherId) filter.teacherId = teacherId;
        if (status && status !== 'all') filter.status = status;
        
        const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            data: quizzes,
            count: quizzes.length
        });
    } catch (error) {
        console.error('Error fetching quizzes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quizzes',
            message: error.message
        });
    }
});

/**
 * GET /api/educator/quizzes/:id
 * Get single quiz by ID
 */
app.get('/api/educator/quizzes/:id', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const quiz = await Quiz.findById(req.params.id);
        
        if (!quiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found'
            });
        }
        
        res.json({
            success: true,
            data: quiz
        });
    } catch (error) {
        console.error('Error fetching quiz:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch quiz',
            message: error.message
        });
    }
});

/**
 * POST /api/educator/quizzes/:id/duplicate
 * Duplicate a quiz
 */
app.post('/api/educator/quizzes/:id/duplicate', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const originalQuiz = await Quiz.findById(req.params.id);
        
        if (!originalQuiz) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found'
            });
        }
        
        // Create duplicate
        const quizData = originalQuiz.toObject();
        delete quizData._id;
        delete quizData.__v;
        delete quizData.createdAt;
        
        quizData.title = `${originalQuiz.title} (Copy)`;
        quizData.status = 'draft';
        quizData.createdAt = new Date();
        
        const newQuiz = new Quiz(quizData);
        await newQuiz.save();
        
        res.json({
            success: true,
            message: 'Quiz duplicated successfully',
            data: newQuiz
        });
    } catch (error) {
        console.error('Error duplicating quiz:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to duplicate quiz',
            message: error.message
        });
    }
});

/**
 * DELETE /api/educator/quizzes/:id
 * Delete a quiz
 */
app.delete('/api/educator/quizzes/:id', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const result = await Quiz.findByIdAndDelete(req.params.id);
        
        if (!result) {
            return res.status(404).json({
                success: false,
                error: 'Quiz not found'
            });
        }
        
        res.json({
            success: true,
            message: 'Quiz deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting quiz:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete quiz',
            message: error.message
        });
    }
});

// =============== QUIZ ENDPOINTS ===============
app.post('/api/quizzes/save', async (req, res) => {
    try {
        console.log('📥 Received quiz save request');
        
        const Quiz = mongoose.model('Quiz');
        const Class = mongoose.model('Class');
        const Statistics = mongoose.model('Statistics');
        
        const quizData = req.body;
        const teacherId = quizData.teacherId || new mongoose.Types.ObjectId();
        
        if (!quizData.title || !quizData.questions || quizData.questions.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Quiz title and at least one question are required'
            });
        }
        
        let classId = quizData.classId;
        let className = '';
        
        if (!classId && quizData.subject) {
            const existingClass = await Class.findOne({ 
                teacherId, 
                subject: quizData.subject 
            }).sort({ createdAt: -1 });
            
            if (existingClass) {
                classId = existingClass._id;
                className = existingClass.className;
            } else {
                const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
                const newClass = new Class({
                    className: `${quizData.subject} Class`,
                    subject: quizData.subject,
                    accessCode,
                    teacherId
                });
                
                await newClass.save();
                classId = newClass._id;
                className = newClass.className;
                
                await updateActiveClassroomsCount();
            }
        }
        
        const quiz = new Quiz({
            ...quizData,
            classId,
            teacherId,
            assignedClasses: classId ? [classId] : []
        });
        
        await quiz.save();
        
        console.log('✅ Quiz saved with ID:', quiz._id, 'Assigned to class:', className);
        
        res.json({
            success: true,
            message: `Quiz saved successfully!${className ? ` Assigned to ${className}` : ''}`,
            quizId: quiz._id,
            classId,
            className,
            title: quiz.title,
            createdAt: quiz.createdAt
        });
    } catch (error) {
        console.error('❌ Error saving quiz:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save quiz',
            error: error.message
        });
    }
});

app.get('/api/quizzes', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const quizzes = await Quiz.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: quizzes.length,
            quizzes: quizzes
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quizzes',
            error: error.message
        });
    }
});

app.get('/api/quizzes/:id', async (req, res) => {
    try {
        const Quiz = mongoose.model('Quiz');
        const quiz = await Quiz.findById(req.params.id);
        if (!quiz) {
            return res.status(404).json({
                success: false,
                message: 'Quiz not found'
            });
        }
        res.json({
            success: true,
            quiz: quiz
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch quiz',
            error: error.message
        });
    }
});

// =============== CLASS ENDPOINTS ===============
app.post('/api/classes/create', async (req, res) => {
    try {
        const Class = mongoose.model('Class');
        const { className, subject, grade } = req.body;
        const teacherId = req.body.teacherId || new mongoose.Types.ObjectId();
        
        let accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const existingClass = await Class.findOne({ accessCode });
        if (existingClass) {
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
        
        await updateActiveClassroomsCount();
        
        res.json({
            success: true,
            message: 'Class created successfully!',
            classId: newClass._id,
            accessCode
        });
    } catch (error) {
        console.error('Error creating class:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create class'
        });
    }
});

app.get('/api/classes', async (req, res) => {
    try {
        const Class = mongoose.model('Class');
        const Quiz = mongoose.model('Quiz');
        const teacherId = req.query.teacherId || new mongoose.Types.ObjectId();
        
        const classes = await Class.find({ teacherId }).sort({ createdAt: -1 });
        
        const classesWithStats = await Promise.all(
            classes.map(async (classItem) => {
                const quizCount = await Quiz.countDocuments({ 
                    classId: classItem._id,
                    status: { $ne: 'archived' }
                });
                
                const publishedCount = await Quiz.countDocuments({ 
                    classId: classItem._id,
                    status: 'published'
                });
                
                return {
                    ...classItem.toObject(),
                    quizCount,
                    publishedCount
                };
            })
        );
        
        res.json({
            success: true,
            classes: classesWithStats
        });
    } catch (error) {
        console.error('Error fetching classes:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch classes'
        });
    }
});

// =============== HELPER FUNCTIONS ===============
async function updateActiveClassroomsCount() {
    try {
        const Class = mongoose.model('Class');
        const Statistics = mongoose.model('Statistics');
        const activeClassrooms = await Class.countDocuments({ status: 'active' });
        const stats = await Statistics.getStats();
        
        if (stats.activeClassrooms !== activeClassrooms) {
            stats.activeClassrooms = activeClassrooms;
            stats.lastUpdated = Date.now();
            await stats.save();
            console.log(`📊 Updated active classrooms count to: ${activeClassrooms}`);
        }
    } catch (error) {
        console.error('Error updating classrooms count:', error);
    }
}

function generateQuestionPrompt(message, context) {
    return `You are an expert educational quiz designer. Generate a high-quality quiz question based on: "${message}"

Context: ${context || 'General knowledge'}

Requirements:
1. Create a clear, unambiguous question
2. Include 4 multiple-choice options if applicable
3. Mark the correct answer clearly
4. Provide a brief explanation
5. Indicate difficulty level (Easy/Medium/Hard)

Format your response as:
QUESTION: [The question]
OPTIONS: A) [Option 1], B) [Option 2], C) [Option 3], D) [Option 4]
CORRECT: [Letter]
EXPLANATION: [Brief explanation]
DIFFICULTY: [Easy/Medium/Hard]`;
}

function improveQuestionPrompt(message, context) {
    return `As an expert educator, improve this quiz question: "${message}"

Context: ${context || 'General knowledge'}

Provide:
1. Improved version of the question
2. What was changed and why
3. Suggestions for better distractors (if multiple choice)
4. Common misconceptions to address`;
}

function suggestAnswersPrompt(message, context) {
    return `Suggest high-quality answers for this question: "${message}"

Context: ${context || 'General knowledge'}

Provide:
1. The correct answer with explanation
2. 3 plausible distractors (wrong answers)
3. Why each distractor might seem correct to students
4. Key points the question should assess`;
}

function checkDifficultyPrompt(message, context) {
    return `Analyze the difficulty of this quiz question: "${message}"

Context: ${context || 'General knowledge'}

Assess:
1. Difficulty level (Easy/Medium/Hard) with confidence score
2. What makes it easy or difficult
3. Prerequisite knowledge required
4. Suggested modifications to adjust difficulty
5. Bloom's Taxonomy level this question targets`;
}

function explainConceptPrompt(message, context) {
    return `Explain this educational concept for quiz creation: "${message}"

Context: ${context || 'General knowledge'}

Provide:
1. Clear explanation suitable for teachers
2. Key points to include in questions
3. Common student misunderstandings
4. Related concepts to link with
5. Example questions at different difficulty levels`;
}

function generalAssistantPrompt(message, context) {
    return `You are EduQuest AI, an expert assistant for teachers creating quizzes.

Teacher asks: "${message}"
Context: ${context || 'General knowledge'}

Provide helpful, specific advice for creating effective quiz questions. Focus on educational best practices, assessment design, and student learning.`;
}

// =============== TEST ENDPOINTS ===============
app.get('/api/test/stats', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
        const stats = await Statistics.getStats();
        res.json({
            success: true,
            message: 'Statistics test endpoint',
            stats: stats,
            note: 'Use PUT /api/statistics to update these values'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/test/update-stats', async (req, res) => {
    try {
        const Statistics = mongoose.model('Statistics');
        const { activeClassrooms, questsCompleted, studentEngagement, teacherRating } = req.body;
        
        const stats = await Statistics.getStats();
        
        if (activeClassrooms !== undefined) stats.activeClassrooms = activeClassrooms;
        if (questsCompleted !== undefined) stats.questsCompleted = questsCompleted;
        if (studentEngagement !== undefined) stats.studentEngagement = studentEngagement;
        if (teacherRating !== undefined) stats.teacherRating = teacherRating;
        
        stats.lastUpdated = Date.now();
        await stats.save();
        
        res.json({
            success: true,
            message: 'Test statistics updated',
            stats: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/test/update-classrooms-count', async (req, res) => {
    try {
        const Class = mongoose.model('Class');
        const Statistics = mongoose.model('Statistics');
        await updateActiveClassroomsCount();
        const stats = await Statistics.getStats();
        
        res.json({
            success: true,
            message: 'Classrooms count updated',
            activeClassrooms: stats.activeClassrooms,
            totalClasses: await Class.countDocuments()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/test/educator-admins', async (req, res) => {
    try {
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const count = await EducatorAdmin.countDocuments();
        const admins = await EducatorAdmin.find().limit(5);
        
        res.json({
            success: true,
            message: 'Educator admins test endpoint',
            totalCount: count,
            sampleAdmins: admins
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/test/students', async (req, res) => {
    try {
        const Student = mongoose.model('Student');
        const EducatorAdmin = mongoose.model('EducatorAdmin');
        const count = await Student.countDocuments();
        const students = await Student.find().populate('educatorAdminId', 'name').limit(5);
        
        res.json({
            success: true,
            message: 'Students test endpoint',
            totalCount: count,
            sampleStudents: students
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// =============== ROOT ROUTES ===============
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'EduQuest Backend',
    timestamp: new Date().toISOString(),
    features: {
      database: 'MongoDB',
      ai: process.env.GEMINI_API_KEY ? 'Gemini AI' : 'Disabled',
      statistics: 'Enabled',
      educatorAdmin: 'Enabled',
      studentManagement: 'Enabled'
    }
  });
});

// =============== START SERVER ===============
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(` Server running: http://localhost:${PORT}`);
  // rest of your startup logs
});

app.listen(PORT, function () {
  console.log('\n========================================');
  console.log(' EDUQUEST LEARNING PLATFORM');
  console.log('========================================');
  console.log(` Server running: http://localhost:${PORT}`);
  console.log(` Serving from: frontend/`);
  
  console.log('\n 📊 STATISTICS ENDPOINTS:');
  console.log(`    Get Stats:           GET  http://localhost:${PORT}/api/statistics`);
  console.log(`    Update Stats:        PUT  http://localhost:${PORT}/api/statistics`);
  console.log(`    Dashboard Stats:     GET  http://localhost:${PORT}/api/statistics/dashboard`);
  console.log(`    Increment Quests:    POST http://localhost:${PORT}/api/statistics/increment-quests`);
  
  console.log('\n 👤 EDUCATOR ADMIN ENDPOINTS:');
  console.log(`    Get All Admins:      GET  http://localhost:${PORT}/api/educator-admins`);
  console.log(`    Search Admins:       GET  http://localhost:${PORT}/api/educator-admins/search?q=text`);
  console.log(`    Get Single Admin:    GET  http://localhost:${PORT}/api/educator-admins/:id`);
  console.log(`    Create Admin:        POST http://localhost:${PORT}/api/educator-admins`);
  console.log(`    Update Admin:        PUT  http://localhost:${PORT}/api/educator-admins/:id`);
  console.log(`    Update Status:       PATCH http://localhost:${PORT}/api/educator-admins/:id/status`);
  console.log(`    Delete Admin:        DELETE http://localhost:${PORT}/api/educator-admins/:id`);
  
  console.log('\n 🎓 STUDENT ENDPOINTS:');
  console.log(`    Get All Students:    GET  http://localhost:${PORT}/api/students`);
  console.log(`    Search Students:     GET  http://localhost:${PORT}/api/students/search?q=text`);
  console.log(`    Get Single Student:  GET  http://localhost:${PORT}/api/students/:id`);
  console.log(`    Create Student:      POST http://localhost:${PORT}/api/students`);
  console.log(`    Update Student:      PUT  http://localhost:${PORT}/api/students/:id`);
  console.log(`    Update Status:       PATCH http://localhost:${PORT}/api/students/:id/status`);
  console.log(`    Delete Student:      DELETE http://localhost:${PORT}/api/students/:id`);
  console.log(`    Bulk Delete:         POST http://localhost:${PORT}/api/students/bulk-delete`);
  console.log(`    Bulk Status Update:  POST http://localhost:${PORT}/api/students/bulk-status`);
  
  console.log('\n 📁 ROUTES FROM FIRST FILE:');
  console.log(`    / (unregRoutes)`);
  console.log(`    /edadmin`);
  console.log(`    /educator`);
  console.log(`    /student`);
  console.log(`    /admin`);
  console.log(`    /api/educators`);
  console.log(`    /api/feedbacks`);
  console.log(`    /api/quizzes (student view)`);
  console.log(`    /api/attemptquiz`);
  console.log(`    /api/attempt-challenges`);
  console.log(`    /api/pick-challenges`);
  console.log(`    /api/view-challenges`);
  console.log(`    /api/subscriptionplans`);
  console.log(`    /api/subscription`);
  console.log(`    /api/manage-subscription`);
  console.log(`    /api/invoice`);
  
  console.log('\n 📁 ADDITIONAL ENDPOINTS:');
  console.log(`    Save Quiz:           POST http://localhost:${PORT}/api/quizzes/save`);
  console.log(`    Get Quizzes:         GET  http://localhost:${PORT}/api/quizzes`);
  console.log(`    Create Class:        POST http://localhost:${PORT}/api/classes/create`);
  console.log(`    Get Classes:         GET  http://localhost:${PORT}/api/classes`);
  console.log(`    AI Assistant:        POST http://localhost:${PORT}/api/ai/assist`);
  console.log(`    Health Check:        GET  http://localhost:${PORT}/api/health`);
  
  console.log('\n 📁 TEST ENDPOINTS:');
  console.log(`    Test Stats:          GET  http://localhost:${PORT}/api/test/stats`);
  console.log(`    Test Update Stats:   POST http://localhost:${PORT}/api/test/update-stats`);
  console.log(`    Test Classrooms:     GET  http://localhost:${PORT}/api/test/update-classrooms-count`);
  console.log(`    Test Educator Admins: GET http://localhost:${PORT}/api/test/educator-admins`);
  console.log(`    Test Students:       GET  http://localhost:${PORT}/api/test/students`);
  console.log(`    Debug Educator Data: GET  http://localhost:${PORT}/api/debug/educator-data`);
  
  console.log('\n 📁 AVAILABLE PAGES:');
  console.log(`    Home:                http://localhost:${PORT}/`);
  console.log(`    Admin:               http://localhost:${PORT}/admin/admin-dashboard.html`);
  console.log(`    Educator:            http://localhost:${PORT}/educator/educator-dashboard.html`);
  console.log(`    Educator Admin:      http://localhost:${PORT}/educatoradmin/educatoradmin-dashboard.html`);
  console.log(`    Student:             http://localhost:${PORT}/student/student-dashboard.html`);
  
  console.log('\n ✅ FEATURES:');
  console.log(`    Database:            ${MONGODB_URI ? '✅ MongoDB' : '❌ Not configured'}`);
  console.log(`    AI Assistant:        ${process.env.GEMINI_API_KEY ? '✅ Gemini AI' : '❌ Not configured'}`);
  console.log(`    Statistics:          ✅ Live statistics tracking`);
  console.log(`    Educator Admin:      ✅ Full CRUD operations`);
  console.log(`    Student Mgmt:        ✅ Full CRUD + Bulk operations`);
  console.log(`    Challenge Scheduler: ✅ Cron job running every minute`);
  console.log('========================================\n');
});