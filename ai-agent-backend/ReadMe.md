# 📁 Project Structure

```
├── package.json                   # Project dependencies
├── package-lock.json              # Dependency lock file
├── ReadMe-N.md                    # (Legacy/internal notes)
├── routes/
│   └── verify.js                  # Main route to upload and verify documents
├── server.js                      # Express server entry point
├── services/
│   └── gemini.js                  # Gemini API interaction and document analysis logic
├── uploads/
│   ├── *.pdf / *.png              # Uploaded and converted user files
└── utils/
    └── hash.js                    # Hashing logic for transaction verification
```

# 🚀 Features

Upload one invoice and one receipt (PDF or image)

Convert PDFs to PNGs for analysis

Analyze files using Google Gemini (API key version)

Extract key fields: VendorName, Amount, Date, Transaction ID

Detect discrepancies and generate forensic report

Create a unique hash of the transaction for future reference


# ⚙️ Requirements

- Node.js v18+
- .env file with your Gemini API key

```
GEMINI_API_KEY=your_google_generative_ai_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

# 🧪 Running the Server

Install dependencies:

```
npm install
```

Start the development server:

```
node server.js
```

Server will run at: `http://localhost:3001`

# 🔁 API: POST /verify-transaction

Description: Upload two documents (invoice and receipt) and receive AI-based verification.

Request Format:

- `multipart/form-data`
- Field: `documents[]` (array of files)

Curl Example:

```
curl -X POST http://localhost:3001/verify-transaction \
  -F "documents=@./uploads/invoice_2.pdf" \
  -F "documents=@./uploads/receipt.jpeg"
  ```

Successful Response:

```
{
  "success": true,
  "data": {
    "analysis": {
      "invoice": {
        "VendorName": "Your Company Name",
        "TotalAmount": 6000,
        "Date": "25-July-2025",
        "TransactionID": "456001200"
      },
      "receipt": {
        "VendorName": "Marketing Genius",
        "TotalAmount": 10831.2,
        "Date": "25-July-2025",
        "TransactionID": "456001200"
      },
      "consistency": {
        "VendorName": false,
        "TotalAmount": false,
        "Date": true,
        "TransactionID": true
      },
      "discrepancies": [...],
      "overall_match": false
    }
  },
  "hash": "d8f2c431f66e..."
}
```

# 🧠 How It Works

`server.js`

- Initializes the Express server and routes, sets up CORS and JSON parsing.

`routes/verify.js`

- Accepts uploaded files via multer
- Calls analyzeDocuments() from gemini.js
- Extracts TransactionID, hashes it, and returns full analysis + hash

`services/gemini.js`

- Converts PDFs to PNG using pdf2pic
- Encodes all files to base64
- Sends them with a forensic prompt to Gemini (gemini-1.5-flash)
- Parses structured JSON response

`utils/hash.js`

- Generates SHA-256 hashes of transaction IDs for unique referencing.

---

## 📦 Supabase Integration

The backend integrates with **Supabase** for both data storage (PostgreSQL) and file hosting (Supabase Storage).

### ✅ What Supabase is used for:

| Feature         | Purpose                                                                 |
|-----------------|-------------------------------------------------------------------------|
| **Database**     | Stores verification metadata: transaction ID, AI results, image URLs, etc. |
| **Storage Bucket** | Hosts uploaded and processed document images (e.g. PNGs from PDFs)       |

---

### 🔧 Supabase Setup

#### 📄 Tables

**verifications**

| Column          | Type     | Description                                                   |
|------------------|----------|---------------------------------------------------------------|
| `id`             | UUID     | Primary key                                                   |
| `transaction_id` | TEXT     | Extracted transaction identifier                              |
| `hash`           | TEXT     | Deterministic hash of the transaction ID                      |
| `ai_result`      | JSON     | Full Gemini analysis result                                   |
| `image_urls`     | TEXT[]   | List of public image URLs in Supabase Storage                |
| `user_id` *(optional)* | UUID     | Foreign key to users table, for multi-user support             |

---

#### 🗃️ Storage Bucket

- **Bucket Name:** `documents`

- **Upload Path Format:** `documents/<transaction_hash>/<random_uuid>.png`

- This structure groups images by transaction hash for clean organization.

---

### 📤 Image Upload Flow

1. All incoming documents (JPG/PNG/PDF) are stored temporarily in `/uploads/`
2. If PDF, each page is converted to PNG using `pdf2pic`
3. Each image is uploaded to Supabase Storage:
 - Path: `documents/<transaction_hash>/<random_uuid>.png`
4. Public URLs of these images are saved in the `verifications.image_urls` column
5. Local temp files are deleted after upload

---

### 📦 Dependencies

- **express** – Web server for handling API requests
- **multer** – Middleware for handling file uploads (PDF, images)
- **pdf2pic** – Converts PDF pages into PNG images for Gemini input
- **axios** – Sends HTTP requests (used for Gemini API calls)
- **dotenv** – Loads environment variables from `.env` file
- **crypto** – Generates SHA-256 hashes for transaction IDs
- **@google/generative-ai** – Official Gemini SDK using API key (`gemini-1.5-flash`, etc.)
- **@supabase/supabase-js** – Supabase client for database + storage integration
- **fs** *(Node built-in)* – Reads and writes local files (e.g., PDFs, images)
- **path** *(Node built-in)* – Handles file system paths and extensions


## Blockchain Integration

We record each verification on-chain by emitting a `TransactionVerified` event in the deployed VeripactReputation contract.

### Environment Variables

Make sure these are set in your `.env`:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/…            # or other Sepolia RPC
PRIVATE_KEY=0x…                                           # wallet with ETH on Sepolia
CONTRACT_ADDRESS=0x....                                   # deployed proxy address
```
### How It Works

1. Generate a hash from the AI-extracted transactionId in `utils/hash.js`
2. Record on-chain

- In `services/blockchain.js`, we use `ethers` to call

```
contract.addVerifiedOffchainTransaction(
  seller,         // dev wallet
  buyer,          // dummy or real counterparty
  nicheId,        // bytes32 “General” or dynamic category
  volume,         // parsed USDC amount (6 decimals)
  txHashBytes32   // 32-byte hash of transactionId
);
```

- We wait for the tx to be mined and return the tx hash.

3. Persist in **Supabase**

- In `routes/verify.js`, after calling the blockchain, we insert the same hash and the returned `onChainTxHash` into our `verifications` table along with AI results & image URLs.

4. Verify on Etherscan

- The API response now includes:

```
{
  "onChainTxHash": "0x…",
  "onChainLink": "https://sepolia.etherscan.io/tx/0x…"
}
```

- Click the link to view the `TransactionVerified` event under Logs.