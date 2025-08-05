// routes/verify.js

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const geminiService               = require('../services/gemini');
const { createHashFromText }      = require('../utils/hash');
const { uploadFileToBucket }      = require('../services/supabase');

// Supabase Admin client (service key)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Web3Auth JWKS client setup
const client = jwksClient({
  jwksUri: 'https://api-auth.web3auth.io/.well-known/jwks.json' 
});

// Middleware to verify Web3Auth JWT
async function verifyWeb3AuthJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Missing auth token' });
  }

  function getKey(header, callback) {
    client.getSigningKey(header.kid, function(err, key) {
      if (err) return callback(err);
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    });
  }

  jwt.verify(token, getKey, { algorithms: ['RS256', 'ES256'] }, (err, decoded) => {
    if (err) {
      console.error('❌ Web3Auth token verification failed:', err);
      return res.status(401).json({ success: false, error: 'Invalid or expired Web3Auth token' });
    }
    req.web3authUser = decoded; // Contains wallet address, etc.
    next();
  });
}

const router = express.Router();
// Use memory storage for Vercel compatibility (no disk access)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

router.post('/', upload.array('documents'), verifyWeb3AuthJWT, async (req, res) => {
  try {
    // 1) Get seller wallet address from JWT
    const sellerId = req.web3authUser.userId ||
                      req.web3authUser.email ||
                      (req.web3authUser.wallets && req.web3authUser.wallets[0]?.public_key) ||
                      null;
    // 2) Read seller’s rating of the client
    const sellerRating = Number(req.body.rating_by_seller);
    if (!Number.isInteger(sellerRating) || sellerRating < 1 || sellerRating > 5) {
      return res.status(400).json({ success: false, error: 'rating_by_seller must be an integer 1–5' });
    }

    // 3) Run Gemini analysis on uploaded docs
    const files         = req.files;
    const extractedData = await geminiService.analyzeDocuments(files);
    if (!extractedData?.analysis) {
      throw new Error('AI analysis failed');
    }

    // 4) Reject if AI finds any mismatch
    if (!extractedData.analysis.overall_match) {
      return res.status(400).json({
        success: false,
        error: 'Invoice and receipt did not match — verification halted.'
      });
    }

    // 5) Pull out transactionId & totalAmount
    const rawTxId =
      extractedData.analysis.invoice?.TransactionID  ||
      extractedData.analysis.receipt?.TransactionID;
    if (!rawTxId) {
      return res.status(400).json({ success: false, error: 'Transaction ID missing from AI response' });
    }
    const txId = String(rawTxId);

    const rawAmount =
      extractedData.analysis.invoice?.TotalAmount  ||
      extractedData.analysis.receipt?.TotalAmount;
    if (rawAmount == null) {
      return res.status(400).json({ success: false, error: 'TotalAmount missing from AI response' });
    }
    const totalAmount = Number(rawAmount);

    // 6) Compute hash & upload images
    const hash = createHashFromText(txId);
    if (!hash) {
      return res.status(500).json({ success: false, error: 'Hash generation failed' });
    }
    const imageUrls = [];
    for (const file of files) {
      const ext = path.extname(file.originalname).toLowerCase();
      if (file.mimetype === 'application/pdf' || ext === '.pdf') {
        const imagePaths = await geminiService.convertPdfToPng(file.path);
        for (const img of imagePaths) {
          const url = await uploadFileToBucket(img, file.originalname, hash);
          imageUrls.push(url);
          await fs.unlink(img).catch(() => {});
        }
      } else {
        const url = await uploadFileToBucket(file.path, file.originalname, hash);
        imageUrls.push(url);
      }
      await fs.unlink(file.path).catch(() => {});
    }

    // 7) Store seller-proof in Supabase instead of recording on-chain
    const { data: inserted, error: insertErr } = await supabaseAdmin
      .from('verifications')
      .insert([{
        transaction_id:   txId,
        hash,
        ai_result:        extractedData,
        image_urls:       imageUrls,
        seller_id:        sellerId,
        rating_by_seller: sellerRating,
        status:           'pending',
        niche:            req.body.niche || 'General',
      }])
      .select('link_uuid')
      .single();

    if (insertErr) throw insertErr;
    if (!inserted?.link_uuid) {
      return res.status(500).json({ success: false, error: 'Verification link generation failed.' });
    }

    // 8) Build & return share-link
    const frontendUrl   = process.env.FRONTEND_URL || 'http://localhost:3000';
    const validationUrl = `${frontendUrl}/validate/${inserted.link_uuid}`;

    console.log('Verification data stored successfully!');
    return res.json({
      success: true,
      linkUuid: inserted.link_uuid,
      validationUrl,
      data: extractedData,
    });

  } catch (err) {
    console.error('❌ Verification error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: message });
  }
});

module.exports = router;
