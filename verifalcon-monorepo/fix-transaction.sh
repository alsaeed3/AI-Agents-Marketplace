#!/bin/bash

# Quick Fix Script for VeriFalcon Transaction Error
# This script sets up listings and authorizes wallets

echo "🔧 VeriFalcon Complete Setup"
echo "============================================="
echo ""

cd contracts

# Get serial number from user or use default
SERIAL="${1:-8286E72}"
AI_SCORE="${2:-85}"

echo "Setting up listing for serial: $SERIAL with AI score: $AI_SCORE"
echo ""

echo "Step 1: Running diagnostic..."
npx hardhat run scripts/debug-transaction.js --network bscTestnet

echo ""
echo "Step 2: Setting up the listing and AI score..."
npx hardhat run scripts/setup-listing.js --network bscTestnet

echo ""
echo "✅ Done! Your listing is now ready for finalization in the frontend."
