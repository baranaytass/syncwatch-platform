#!/bin/bash

# Simple SyncWatch Development Script

echo "🚀 Starting SyncWatch Development Environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Start databases
echo "🐳 Starting databases..."
docker compose up -d

# Wait a bit for databases
echo "⏳ Waiting for databases (10 seconds)..."
sleep 10

# Show status
echo "📊 Database Status:"
docker compose ps

echo ""
echo "✅ Databases are ready!"
echo ""
echo "🚀 Now run these commands in separate terminals:"
echo ""
echo "  📦 Backend:  cd backend && npm run dev"
echo "  🌐 Web App:  cd web && npm start"
echo ""
echo "🔗 URLs:"
echo "  • Web:   http://localhost:3000"
echo "  • API:   http://localhost:3001"
echo "  • DB:    localhost:5432"
echo ""
echo "🛑 To stop: docker compose down" 