const crypto = require('crypto');

/**
 * Generates a SHA256 hash from a given string.
 * Used to generate a unique id for all uploaded images.
 * @param {string} data The input data to hash.
 * @returns {string|null} The SHA256 hash of the input data, or null if the input is invalid.
 */
function createHashFromText(data) {
  if (typeof data !== 'string') {
    console.error('[createHashFromText] Invalid input:', data);
    return null; // or throw an error if preferred
  }

  return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
  createHashFromText,
};
