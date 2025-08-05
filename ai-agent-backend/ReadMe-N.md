# 🚀 Veripact Hackathon Plan (7-Day MVP Build)

**Goal:** Build the MVP for the "Reputation Booster" flow  
**Your Focus Areas:**  
1. AI Agent Backend  
2. Frontend Web App  
3. Product/GTM Support

---

## ✅ Day-by-Day Breakdown

### 🟢 Day 1: Planning & Setup
- [ ] Create Privy developer account + test app
- [x] Get access to Google Gemini Vision API
- [ ] Decide on backend service host (e.g., Vercel, Railway, Supabase functions, etc.)

---

### 🟡 Day 2: AI Agent Backend (v1)
- [ ] Set up backend API route `/verify-transaction`
- [ ] Integrate Gemini Vision API -----------------------------> need the key
- [ ] Test with mock docs (invoice, receipt)
- [ ] Extract:
  - Transaction ID
  - Amount / date
  - Inconsistencies
- [ ] Return response with `success/fail + extracted hash`

---

### 🟠 Day 3: Finalize AI + Email/Signature Flow
- [ ] Add transaction hash deduplication logic
- [ ] Implement off-chain confirmation system:
  - Email with confirmation link
  - Optional: one-click signature capture
- [ ] Add logging / basic error handling
- [ ] Store verification status in DB (if needed for UI)

---

### 🔵 Day 4: Build Frontend UI (Next.js + Tailwind)
- [ ] Set up Next.js app with Tailwind + shadcn/ui
- [ ] Pages:
  - [ ] Login/signup with Privy
  - [ ] Dashboard: Submit verification (file upload + dropdown + form)
  - [ ] Profile page: Display badges per niche
- [ ] Connect frontend to backend API
- [ ] Show basic success/failure UI

---

### 🟣 Day 5: Smart Contract Integration
- [ ] Connect frontend/backend to `VeripactReputation.sol` using ethers.js
- [ ] Call contract to write "Verified Transaction" badge
- [ ] Read from chain and display badges on profile
- [ ] Test with testnet (e.g., Base Goerli or Polygon Mumbai)

---

### ⚪ Day 6: Polish + GTM Drafting
- [ ] UI polish (responsive, loading states, edge cases)
- [ ] Add animations or transitions for clean UX
- [ ] Support teammate with GTM deck (value prop, use cases, first user segment)
- [ ] Draft demo script + test full flow

---

### 🔴 Day 7: Final QA + Submission
- [ ] Full end-to-end test: login → upload → verify → confirm → badge
- [ ] Record demo video or prep live walkthrough
- [ ] Finalize and submit:
  - [ ] GitHub repo (clean README)
  - [ ] Demo link (Vercel or Netlify)
  - [ ] Slide deck
  - [ ] Optional: short video demo

---

## 🧩 Bonus (Parallel Tracks)
- [ ] GTM strategy draft (freelancers? P2P sellers?)
- [ ] Trust Badge visuals or brand assets
- [ ] Submission copy / explanation text

---

**Let's go!**

