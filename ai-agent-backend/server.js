require('dotenv').config(); // load env vars FIRST
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const express = require('express');
const cors = require('cors'); 
const verifyRoute = require('./routes/verify');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for both development and production
const allowedOrigins = [
  'http://localhost:3000',          // Local development
  'https://veripact.vercel.app',    // Production frontend
  'https://www.veripact.vercel.app', // Production frontend with www
  'https://veripact-the-squids-projects.vercel.app', // Staging frontend
  'https://www.veripact-the-squids-projects.vercel.app' // Staging frontend with www
];

app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Explicit OPTIONS handler for preflight requests
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// Parse JSON bodies
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AI Agent backend is running',
    timestamp: new Date().toISOString(),
    env_check: {
      supabase_url: !!process.env.SUPABASE_URL,
      supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      gemini_key: !!process.env.GEMINI_API_KEY
    }
  });
});

// Routes
app.use('/verify-transaction', require('./routes/verify')); // Seller flow - handles seller's document upload, AI analysis, blockchain recording, and rating
app.use('/validate', require('./routes/validate'));         // Client flow - handles client validation of transactions and rating
app.use('/verifications', require('./routes/verifications')); // Client flow - fetches verifications by link UUID
app.use('/submit_validation', require('./routes/submit_validation'));

// Export the app for Vercel serverless functions
module.exports = app;

// For Vercel serverless functions, also export a default handler
module.exports.default = app;
