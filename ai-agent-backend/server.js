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

// Parse JSON bodies
app.use(express.json());

// Routes
app.use('/verify-transaction', require('./routes/verify')); // Seller flow - handles seller's document upload, AI analysis, blockchain recording, and rating
app.use('/validate', require('./routes/validate'));         // Client flow - handles client validation of transactions and rating
app.use('/verifications', require('./routes/verifications')); // Client flow - fetches verifications by link UUID
app.use('/submit_validation', require('./routes/submit_validation'));

// Start server
app.listen(PORT, () => {
  console.log(`AI Agent backend running on http://localhost:${PORT}`);
});
