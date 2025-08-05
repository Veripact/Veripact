const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// GET /verifications?user_id=...
router.get('/', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) {
    return res.status(400).json({ error: 'Missing user_id' });
  }
  try {
    // Fetch all verifications where the user is either the seller or the client
    const { data, error } = await supabaseAdmin
      .from('verifications')
      .select('*')
      .or(`seller_id.eq.${user_id},client_id.eq.${user_id}`)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.json({ verifications: data || [] });
  } catch (err) {
    console.error('❌ Error fetching verifications:', err);
    return res.status(500).json({ error: 'Failed to fetch verifications' });
  }
});

module.exports = router;
