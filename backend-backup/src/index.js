const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// Serve ALL static files from frontend folder
app.use(express.static(path.join(__dirname, '../../frontend')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'EduQuest backend is running!',
    timestamp: new Date().toISOString()
  });
});

// Root route - serve index.html directly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n========================================');
  console.log('🎓 EDUQUEST LEARNING PLATFORM');
  console.log('========================================');
  console.log(`✅ Server running: http://localhost:${PORT}`);
  console.log(`📁 Serving from: frontend/`);
  console.log('\n📄 Available Pages:');
  console.log(`  🏠  Home:       http://localhost:${PORT}/`);
  console.log(`  👑  Admin:      http://localhost:${PORT}/admin/admin-dashboard.html`);
  console.log(`  👨‍🏫 Educator:   http://localhost:${PORT}/educator/educator-dashboard.html`);
  console.log(`  🎓 Student:    http://localhost:${PORT}/student/student-dashboard.html`);
  console.log(`  🔍 API Health: http://localhost:${PORT}/api/health`);
  console.log('========================================\n');
});