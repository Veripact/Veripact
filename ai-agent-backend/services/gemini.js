// services/gemini.js
const fs      = require('fs');
const path    = require('path');
const axios   = require('axios');
const { fromPath } = require('pdf2pic');
require('dotenv').config();

const API_KEY  = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
// the exact two model names to try, in order:
const MODELS   = ['gemini-1.5-flash'];

/**
 * Converts a PDF file to one or more PNG images.
 */
async function convertPdfToPng(pdfPath) {
  const outputDir = path.resolve(__dirname, '../uploads');
  const baseName  = path.basename(pdfPath, '.pdf');
  const converter = fromPath(pdfPath, {
    density:     200,
    saveFilename: baseName,
    savePath:     outputDir,
    format:      'png',
    width:       1024,
    height:      1024,
  });

  // for now we only render page 1; bump this if you want more pages
  const images = [];
  const pageCount = 1;
  for (let i = 1; i <= pageCount; i++) {
    const { path: imgPath } = await converter(i);
    images.push(imgPath);
  }
  return images;
}

/**
 * Converts a buffer to generative part for Gemini API
 */
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      mimeType,
      data: buffer.toString('base64'),
    },
  };
}

/**
 * Reads a file from disk and wraps it as an inlineData part.
 */
function fileToGenerativePart(filePath, mimeType) {
  const buffer = fs.readFileSync(filePath);
  return {
    inlineData: {
      mimeType,
      data: buffer.toString('base64'),
    },
  };
}

/**
 * Analyze a set of invoice/receipt files using Gemini.
 * Falls back on a 503, but surface friendly errors otherwise.
 */
async function analyzeDocuments(files) {
  // 1) Build the image parts array
  const imageParts = [];
  for (const file of files) {
    const ext   = path.extname(file.originalname).toLowerCase();
    const isPdf = file.mimetype === 'application/pdf' || ext === '.pdf';

    if (isPdf) {
      // For PDF files, we need to convert buffer to image
      // For now, we'll skip PDF conversion in Vercel and ask users to upload images
      throw new Error('PDF files are not supported in this deployment. Please upload image files (PNG, JPG, JPEG) instead.');
    } else {
      // Use buffer directly for image files
      imageParts.push(bufferToGenerativePart(file.buffer, file.mimetype));
    }
  }

  // 2) The forensic prompt
  const prompt = `
You are a forensic transaction analyst for a P2P trust protocol called Veripact.

You will be given two images:
- Image 1 is an **invoice**.
- Image 2 is a **payment receipt**.

Your tasks:
1. Extract VendorName, TotalAmount, Date, TransactionID from each.
2. Compare them: exact matches → true/false.
3. List any mismatches under "discrepancies".
4. Add "overall_match": true only if all fields match.

Respond ONLY with this JSON structure:
{
  "analysis": {
    "invoice": { "VendorName": "...", "TotalAmount": ..., "Date": "...", "TransactionID": "..." },
    "receipt": { "VendorName": "...", "TotalAmount": ..., "Date": "...", "TransactionID": "..." },
    "consistency": { "VendorName": true, "TotalAmount": true, "Date": true, "TransactionID": true },
    "discrepancies": [ { "field": "...", "invoice": "...", "receipt": "..." } ],
    "overall_match": true
  }
}
  `.trim();

  const body = {
    contents: [
      {
        role:  'user',
        parts: [{ text: prompt }, ...imageParts],
      },
    ],
  };

  let lastError = null;
  for (const model of MODELS) {
    const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
    try {
      const res = await axios.post(url, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      const raw = res.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const clean = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);
    } catch (err) {
      lastError = err;
      // if the first model is 503, silently retry
      if (err.response?.status === 503 && model === MODELS[0]) {
        console.warn(`${model} overloaded, falling back to ${MODELS[1]}`);
        continue;
      }
      // otherwise break immediately (bad key, 404, parse error, etc.)
      break;
    }
  }

  // All retries exhausted
  if (lastError?.response?.status === 503) {
    throw new Error('AI service overloaded – please try again in a few seconds.');
  } else {
    throw new Error(`AI analysis failed: ${lastError?.message || 'unknown error'}`);
  }
}

module.exports = {
  analyzeDocuments,
  convertPdfToPng,
};
