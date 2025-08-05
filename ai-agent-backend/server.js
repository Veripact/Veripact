require('dotenv').config(); // load env vars FIRST
console.log('✓ Environment variables loaded');

const { createClient } = require('@supabase/supabase-js');
console.log('✓ Supabase client imported');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
console.log('✓ Supabase admin client created');

const express = require('express');
console.log('✓ Express imported');

const cors = require('cors');
console.log('✓ CORS imported');

const app = express();
console.log('✓ Express app created');

const PORT = process.env.PORT || 3001;
console.log(`✓ Port configured: ${PORT}`);

// CORS configuration for both development and production
const allowedOrigins = [
  'http://localhost:3000',          // Local development
  'https://veripact.vercel.app',    // Production frontend
  'https://www.veripact.vercel.app', // Production frontend with www
  'https://veripact-the-squids-projects.vercel.app', // Staging frontend
  'https://www.veripact-the-squids-projects.vercel.app' // Staging frontend with www
];
console.log('✓ Allowed origins configured:', allowedOrigins);

console.log('⏳ Adding CORS middleware...');
app.use(cors({ 
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
console.log('✓ CORS middleware added');

// Parse JSON bodies
console.log('⏳ Adding JSON parser...');
app.use(express.json());
console.log('✓ JSON parser added');

// Add debugging middleware to log incoming requests
console.log('⏳ Adding debug middleware...');
app.use((req, res, next) => {
  console.log(`[DEBUG] Incoming request: ${req.method} ${req.path}`);
  next();
});
console.log('✓ Debug middleware added');

// Health check route
console.log('⏳ Adding health check route...');
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
console.log('✓ Health check route added');

// Routes
console.log('⏳ Loading route modules...');
try {
  console.log('⏳ Loading /verify-transaction route...');
  app.use('/verify-transaction', require('./routes/verify')); // Seller flow - handles seller's document upload, AI analysis, blockchain recording, and rating
  console.log('✓ /verify-transaction route loaded');

  console.log('⏳ Loading /validate route...');
  app.use('/validate', require('./routes/validate'));         // Client flow - handles client validation of transactions and rating
  console.log('✓ /validate route loaded');

  console.log('⏳ Loading /verifications route...');
  app.use('/verifications', require('./routes/verifications')); // Client flow - fetches verifications by link UUID
  console.log('✓ /verifications route loaded');

  console.log('⏳ Loading /submit_validation route...');
  app.use('/submit_validation', require('./routes/submit_validation'));
  console.log('✓ /submit_validation route loaded');

  console.log('✅ All routes loaded successfully');
} catch (error) {
  console.error('❌ Error loading routes:', error);
  throw error;
}

console.log('⏳ Preparing app export...');
// Export the app for Vercel serverless functions
module.exports = app;

// For Vercel serverless functions, also export a default handler
module.exports.default = app;
console.log('✅ Server setup completed successfully');

// If running directly (not imported), start the server
if (require.main === module) {
  console.log('🚀 Starting server...');
  app.listen(PORT, () => {
    console.log(`✅ Server is running on port ${PORT}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/`);
  });
}
