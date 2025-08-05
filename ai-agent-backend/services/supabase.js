// services/supabase.js
const { createClient } = require('@supabase/supabase-js');
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
 * Uploads a file (buffer or file path) to Supabase Storage.
 *
 * @param {Buffer|string} fileInput - File buffer or local file path.
 * @param {string} originalName - The original file name.
 * @param {string} hash - The transaction hash (used as top-level folder).
 * @returns {Promise<string>} Publicly accessible URL of the uploaded file.
 * @throws If the upload or URL fetch fails.
 */
async function uploadFileToBucket(fileInput, originalName, hash) {
  let buffer;
  
  // Handle both Buffer and file path inputs
  if (Buffer.isBuffer(fileInput)) {
    buffer = fileInput;
  } else if (typeof fileInput === 'string') {
    // Legacy support for file paths (local development only)
    try {
      const fs = require('fs');
      buffer = fs.readFileSync(fileInput);
    } catch (error) {
      throw new Error(`Failed to read file: ${error.message}. Note: file path support is only available in local development.`);
    }
  } else {
    throw new Error('Invalid file input: must be Buffer or file path string');
  }

  const filename = generateRandomFilename(originalName);
  const storagePath = `documents/${hash}/${filename}`;

  // Determine content type based on file extension
  const ext = path.extname(originalName).toLowerCase();
  let contentType = 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') {
    contentType = 'image/jpeg';
  } else if (ext === '.pdf') {
    contentType = 'application/pdf';
  }

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, buffer, {
      contentType,
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
