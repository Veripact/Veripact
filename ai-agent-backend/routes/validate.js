// routes/validate.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const WEB3AUTH_JWKS_URI = 'https://api-auth.web3auth.io/.well-known/jwks.json';
const client = jwksClient({ jwksUri: WEB3AUTH_JWKS_URI });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const router = express.Router();

// Helper for JWT verification
function getKey(header, callback) {
    console.debug('[DEBUG] getKey called with header:', header);
    client.getSigningKey(header.kid, function (err, key) {
        if (err) {
            console.error('[DEBUG] Error getting signing key:', err);
            callback(err);
        } else {
            const signingKey = key.getPublicKey();
            console.debug('[DEBUG] Signing key obtained:', signingKey);
            callback(null, signingKey);
        }
    });
}

// 2a) GET: fetch a single verification by link_uuid
router.get('/:linkUuid', async (req, res) => {
    const { linkUuid } = req.params;
    console.log('[GET] /validate/:linkUuid', { linkUuid });
    console.debug('[DEBUG] Fetching verification for linkUuid:', linkUuid);
    const { data, error } = await supabaseAdmin
        .from('verifications')
        .select('*, image_urls, ai_result')
        .eq('link_uuid', linkUuid)
        .single();
    if (error) {
        console.error('[DEBUG] Supabase fetch error:', error);
        return res.status(404).json({ error: 'Not found' });
    }
    console.log('[DEBUG] Fetched verification:', data);
    res.json({ verification: data });
});

// 2b) POST: client submits their rating → update record, flip status, store on-chain

/**
 * Handles client validation of a transaction.
 * POST /validate/:linkUuid
 * 
 * Required headers:
 * - Authorization: Bearer <token>
 * 
 * Required body:
 * - rating_for_seller: number (1-5)
 * - decision: "approve" | "reject"
 */
router.post('/:linkUuid', async (req, res) => {
    console.log('[POST] /validate/:linkUuid', { linkUuid: req.params.linkUuid, body: req.body });
    const { linkUuid } = req.params;
    const clientRating = Number(req.body.rating_by_client);
    console.debug('[DEBUG] clientRating:', clientRating);
    const status = clientRating === 1 ? 'rejected' : clientRating >= 3 ? 'approved' : 'pending'; // Updated logic to handle rejection explicitly
    console.debug('[DEBUG] Computed status:', status);

    // Add validation to ensure linkUuid is provided
    if (!linkUuid) {
        return res.status(400).json({ success: false, error: 'Missing linkUuid parameter' });
    }

    // 1) Verify Web3Auth JWT and extract user id
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    console.debug('[DEBUG] Extracted token:', token);
    if (!token) {
        console.error('[DEBUG] Missing auth token');
        return res.status(401).json({ success: false, error: 'Missing auth token' });
    }
    let decoded;
    try {
        decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, { algorithms: ['RS256', 'ES256'] }, (err, decoded) => {
                if (err) {
                    console.error('[DEBUG] JWT verification error:', err);
                    reject(err);
                } else {
                    console.log('[DEBUG] JWT decoded:', decoded);
                    resolve(decoded);
                }
            });
        });
    } catch (err) {
        console.error('[DEBUG] ❌ Web3Auth JWT verification failed:', err);
        return res.status(401).json({ success: false, error: 'Invalid or expired Web3Auth token' });
    }
    const clientId = decoded.sub || decoded.userId || decoded.email || decoded.wallet || decoded.id;
    console.log('[DEBUG] Extracted clientId:', clientId);

    // 2) Update the Supabase row with client_id
    console.log('[DEBUG] Updating Supabase row for linkUuid:', linkUuid);
    const { data, error } = await supabaseAdmin
        .from('verifications')
        .update({ client_id: clientId, rating_by_client: clientRating, status })
        .eq('link_uuid', linkUuid)
        .select('*')
        .single();
    if (error) {
        console.error('[DEBUG] Supabase update error:', error);
        return res.status(500).json({ error: error.message });
    }
    console.log('[DEBUG] Supabase update result:', data);

    // If rejected, update Supabase and return immediately
    if (status === 'rejected') {
        console.debug('[DEBUG] Status is rejected, updating Supabase and returning.');
        return res.json({ success: true, message: 'Transaction rejected successfully.' });
    }

    // Simplify response for non-rejected cases
    res.json({ success: true, message: 'Transaction status updated successfully.' });
});

module.exports = router;
