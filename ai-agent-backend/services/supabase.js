// services/supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Generates a unique filename by appending a random UUID to the original
 * file extension. If the original file has no extension, .png is used.
 *
 * @param {string} originalName - The original file name.
 * @returns {string} The randomized filename.
 */
function generateRandomFilename(originalName) {
  const ext = path.extname(originalName) || '.png';
  const id = crypto.randomUUID();
  return `${id}${ext}`;
}

/**
 * Stores a new verification record in the Supabase 'verifications' table.
 *
 * @param {Object} params
 * @param {string} params.transactionId - The extracted transaction ID.
 * @param {string} params.hash - Deterministic hash of the transaction ID.
 * @param {Object} params.aiResult - Full Gemini analysis result.
 * @param {string[]} params.imageUrls - Array of public image URLs.
 * @param {string} [params.userId] - (Optional) UUID of the authenticated user.
 * @param {string} params.onChainTxHash - The on-chain transaction hash.
 * @returns {Promise<Object[]>} The inserted row(s) data.
 * @throws If the insert operation fails.
 */
async function storeVerification({
  transactionId,
  hash,
  aiResult,
  imageUrls,
  userId,
  onChainTxHash,
}) {
  const { data, error } = await supabase
    .from('verifications')
    .insert([
      {
        transaction_id:     transactionId,
        hash,
        ai_result:          aiResult,
        image_urls:         imageUrls,
        user_id:            userId,
        on_chain_tx_hash:   onChainTxHash,
      },
    ]);

  if (error) throw error;
  return data;
}

/**
 * Uploads a local file buffer to the Supabase Storage bucket under
 * `documents/<hash>/<random-filename>` and returns its public URL.
 *
 * @param {string} localFilePath - Path to the file on disk.
 * @param {string} originalName - Original filename (to preserve extension).
 * @param {string} hash - The transaction hash (used as top-level folder).
 * @returns {Promise<string>} Publicly accessible URL of the uploaded file.
 * @throws If the upload or URL fetch fails.
 */
async function uploadFileToBucket(localFilePath, originalName, hash) {
  const buffer = fs.readFileSync(localFilePath);
  const filename = generateRandomFilename(originalName);
  const storagePath = `documents/${hash}/${filename}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType: 'image/png',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from('documents').getPublicUrl(storagePath);

  return publicUrl;
}

module.exports = {
  storeVerification,
  uploadFileToBucket,
};
