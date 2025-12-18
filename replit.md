# Évidencia - Digital Proof Certification

## Overview
Évidencia is a digital proof certification system that creates verifiable certificates for photos, videos, or PDF documents using SHA-256 hashing and blockchain (Polygon) integration.

## Project Structure
```
/evidencia
├── backend/              # Node.js Express API with SQLite
│   ├── db/               # Database connection and storage
│   ├── models/           # Data models (proofs)
│   ├── utils/            # Blockchain and QR code utilities
│   ├── server.js         # Main Express server
│   └── package.json      # Node dependencies
├── app_flutter/          # Flutter mobile/web client (not configured for Replit)
├── contracts/            # Solidity smart contract
├── public/               # Static assets including verify.html page
└── README.md             # Original project documentation
```

## Running the Application
The backend server runs on port 5000 via the "Backend Server" workflow.

## API Endpoints
- `GET /health` - Health check
- `POST /api/certify` - Upload and certify a file (max 10MB)
- `POST /api/partner/certify` - Partner certification endpoint (requires API key)
- `GET /api/verify/:id` - Verify a proof by ID
- `GET /api/history` - List all proofs (requires API key if configured)

## Environment Variables (Optional)
- `API_KEY` - Optional API key for protected endpoints
- `POLYGON_RPC_URL` - Polygon RPC endpoint for blockchain integration
- `WALLET_PRIVATE_KEY` - Wallet private key for signing transactions
- `PROOF_CONTRACT_ADDRESS` - Deployed smart contract address
- `PUBLIC_BASE_URL` - Base URL for verification links

Without blockchain credentials, the system operates in demo mode storing proofs locally in SQLite.

## Database
Uses SQLite stored at `backend/db/evidencia.db`.

## Recent Changes
- 2025-12-17: Configured for Replit environment
  - Updated server to bind to 0.0.0.0:5000
  - Added trust proxy setting for rate limiting
  - Created workflow configuration
