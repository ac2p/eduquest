# EduQuest Learning Platform - Backend Setup Guide

## 📋 Table of Contents
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Running the Application](#running-the-application)
- [Common Errors & Solutions](#common-errors--solutions)

## 🔧 Prerequisites

Install these first:
- **Node.js** (v14 or higher) - https://nodejs.org/
- **MongoDB** - https://www.mongodb.com/try/download/community or use MongoDB Atlas

## 🚀 Installation

### 1. Navigate to backend folder
```bash
cd EduQuest/backend


npm install express mongoose dotenv cors bcrypt express-session hbs nodemailer crypto path express-rate-limit @google/generative-ai node-cron chart.js chartjs-node-canvas canvas



npm install express
npm install mongoose
npm install dotenv
npm install cors
npm install bcrypt
npm install express-session
npm install hbs
npm install nodemailer
npm install crypto
npm install path
npm install express-rate-limit
npm install @google/generative-ai
npm install node-cron
npm install chart.js
npm install chartjs-node-canvas
npm install canvas


Create a file called .env in the backend folder and copy this:

env
PORT=3000
MONGODB_URI=mongodb+srv://aungsithuphyoe_db_user:TestPass123@eduquest.oq3vfld.mongodb.net/eduquest
SESSION_SECRET=your-super-secret-session-key-change-this
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
GEMINI_API_KEY=your-gemini-api-key
CORS_ORIGIN=http://localhost:5500