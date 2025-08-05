// services/blockchain.js

const { ethers } = require("ethers");
const path = require("path");
require("dotenv").config();

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const abi = require(path.resolve(__dirname, "../VeripactReputation.json")).abi;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contract = new ethers.Contract(contractAddress, abi, wallet);

/**
 * Safely encodes a UTF-8 string into bytes32 (padded/truncated).
 * @param {string} str
 * @returns {string} 0x-prefixed bytes32 hex string
 */
function stringToBytes32(str) {
  // ethers.encodeBytes32String will throw if > 32 bytes
  return ethers.encodeBytes32String(str);
}

/**
 * Records a verified off-chain transaction to the blockchain.
 *
 * @param {object} params
 * @param {string} params.hash       Hex or hexless string (must represent 32 bytes)
 * @param {string} params.transactionId  The original transaction identifier
 * @param {number|string} params.amount  Amount in USDC (6 decimals)
 * @returns {Promise<string>}  The on-chain transaction hash
 */
async function recordVerificationOnChain({ hash, transactionId, amount }) {
  if (!hash || !transactionId || amount == null) {
    throw new Error("Missing required fields: hash, transactionId, amount");
  }

  // Seller is your own wallet; buyer is placeholder
  const seller = wallet.address;
  const buyer  = "0x000000000000000000000000000000000000dEaD";

  // A fixed “niche” for MVP
  const nicheIdBytes32 = stringToBytes32("General");

  // Normalize amount (USDC → 6 decimals)
  const numeric = Number(amount);
  if (Number.isNaN(numeric)) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  const volume = ethers.parseUnits(numeric.toFixed(6), 6);

  // Ensure 0x prefix
  const hexHash = hash.startsWith("0x") ? hash : `0x${hash}`;
  // Convert hex string → Uint8Array (bytes32)
  const txHashBytes32 = ethers.getBytes(hexHash);

  // Call your contract
  const tx = await contract.addVerifiedOffchainTransaction(
    seller,
    buyer,
    nicheIdBytes32,
    volume,
    txHashBytes32
  );

  console.log("🔗 Transaction sent:", tx.hash);
  await tx.wait();
  console.log("✅ On-chain verification stored");

  return tx.hash;
}

module.exports = { recordVerificationOnChain };
