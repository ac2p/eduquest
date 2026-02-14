module.exports = {
  apps: [{
    name: 'eduquest-backend',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      MONGODB_URI: 'mongodb+srv://aungsithuphyoe_db_user:TestPass123@eduquest.oq3vfld.mongodb.net/eduquest',
      GEMINI_API_KEY: 'your-gemini-key'
    }
  }]
};