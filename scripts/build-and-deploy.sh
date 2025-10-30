#!/bin/bash
set -e

echo "🧹 Cleaning previous build..."
rm -rf .next

echo "🏗️ Building for production..."
npm run build

echo ""
echo "🔄 Restarting production..."
./scripts/pm2-prod-stop.sh
sleep 2
./scripts/pm2-prod-start.sh

echo ""
echo "✅ Production deployed successfully!"
