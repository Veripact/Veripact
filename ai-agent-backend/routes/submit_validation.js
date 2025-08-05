const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { recordVerificationOnChain } = require('../services/blockchain');

const WEB3AUTH_JWKS_URI = 'https://api-auth.web3auth.io/.well-known/jwks.json';
const client = jwksClient({ jwksUri: WEB3AUTH_JWKS_URI });
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const router = express.Router();

// Helper for JWT verification
function getKey(header, callback) {
    client.getSigningKey(header.kid, function (err, key) {
        if (err) {
            console.error('Error getting signing key:', err);
            callback(err);
        } else {
            const signingKey = key.getPublicKey();
            callback(null, signingKey);
        }
    });
}

// POST: Submit validation data to Supabase
router.post('/:linkUuid', async (req, res) => {
    console.log('[POST] /submit_validation/:linkUuid', { linkUuid: req.params.linkUuid, body: req.body });
    const { linkUuid } = req.params;
    const clientRating = Number(req.body.rating_by_client);
    const status = clientRating >= 3 ? 'approved' : 'rejected';

    // Verify Web3Auth JWT and extract user id
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];
    if (!token) {
        console.error('Missing auth token');
        return res.status(401).json({ success: false, error: 'Missing auth token' });
    }
    let decoded;
    // Add detailed logging for JWT verification
    try {
        // Decode and log the token header to inspect the algorithm
        const tokenParts = token.split('.');
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
        console.log('Token header:', header);

        decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, { algorithms: ['RS256', 'ES256'] }, (err, decoded) => {
                if (err) {
                    console.error('JWT verification error:', err);
                    reject(err);
                } else {
                    console.log('JWT decoded successfully:', decoded);
                    resolve(decoded);
                }
            });
        });
    } catch (err) {
        console.error('❌ Web3Auth JWT verification failed:', err);
        return res.status(401).json({ success: false, error: 'Invalid or expired Web3Auth token' });
    }
    const clientId = decoded.sub || decoded.userId || decoded.email || decoded.wallet || decoded.id;
    console.log('Extracted clientId:', clientId);

    // Update the Supabase row with client_id
    console.log('Updating Supabase row for linkUuid:', linkUuid);
    const { data, error } = await supabaseAdmin
        .from('verifications')
        .update({ client_id: clientId, rating_by_client: clientRating, status })
        .eq('link_uuid', linkUuid)
        .select('*')
        .single();
    if (error) {
        console.error('Supabase update error:', error);
        return res.status(500).json({ success: false, error: error.message });
    }
    console.log('Supabase update result:', data);

    // Record the transaction on-chain if approved
    let onChainTx = null;
    if (status === 'approved') {
        // Declare and assign the amount variable
        const amount = data.ai_result.analysis.invoice.TotalAmount || data.ai_result.analysis.receipt.TotalAmount;

        console.log('[DEBUG] Attempting to record verification on-chain with data:', {
            hash: data.hash,
            transactionId: data.transaction_id,
            amount,
            buyer: clientId,
        });

        // Validate required fields
        if (!data.hash || !data.transaction_id || !amount) {
            console.error('[DEBUG] Missing required fields for on-chain transaction:', {
                hash: data.hash,
                transactionId: data.transaction_id,
                amount,
            });
            return res.status(400).json({
                success: false,
                error: 'Missing required fields for on-chain transaction',
            });
        }

        try {
            onChainTx = await recordVerificationOnChain({
                hash: data.hash,
                transactionId: data.transaction_id,
                amount,
                buyer: clientId, // Pass the client address
            });
            console.log('[DEBUG] On-chain transaction successful:', onChainTx);
        } catch (err) {
            console.error('[DEBUG] On-chain transaction error:', err);

            // Check for 'Transaction already verified' error
            if (err.reason === 'Veripact: Transaction already verified.') {
                return res.status(400).json({
                    success: false,
                    error: 'This transaction has already been verified.',
                });
            }

            return res.status(500).json({ success: false, error: 'Failed to record on-chain transaction' });
        }

        // Log the transaction hash returned by recordVerificationOnChain
        console.log('[DEBUG] Transaction hash returned by recordVerificationOnChain:', onChainTx);

        // Update Supabase with the on-chain transaction hash
        const { error: updateError } = await supabaseAdmin
            .from('verifications')
            .update({ on_chain_tx_hash: onChainTx })
            .eq('link_uuid', linkUuid);

        // Log the result of the Supabase update query
        if (updateError) {
            console.error('[DEBUG] Supabase update error for on-chain transaction:', updateError);
        } else {
            console.log('[DEBUG] Supabase update successful for on-chain transaction.');
        }
    } else {
        console.log('[DEBUG] Status is not approved, skipping on-chain transaction.');
    }

    res.json({ success: true, onChainClientTx: onChainTx });
});

module.exports = router;
