const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  studentId: {
    type: String,
    required: true,
    unique: true,
  },
  grade: {
    type: String,
    required: true,
  },
  teacher: {
    type: String,
    required: true,
  },
  institution: {
    type: String,
    required: true,
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
  dateOfBirth: {
    type: Date,
  },
  parentName: {
    type: String,
  },
  parentEmail: {
    type: String,
  },
  parentPhone: {
    type: String,
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
  },
  // Reference to educator admin who manages this student
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
  grades: [{
    subject: String,
    score: Number,
    date: Date,
  }],
}, {
  timestamps: true,
  collection: 'students'
});

// Index for search functionality
studentSchema.index({ name: 'text', email: 'text', studentId: 'text' });

module.exports = mongoose.model('Student', studentSchema);