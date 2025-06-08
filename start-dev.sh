#!/bin/bash

# SyncWatch Development Environment Startup Script

echo "🚀 SyncWatch Development Environment Starting..."

# Renklendirme
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if port is available
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo -e "${RED}❌ Port $1 is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $1 is available${NC}"
        return 0
    fi
}

# Function to wait for service
wait_for_service() {
    echo -e "${YELLOW}⏳ Waiting for $1 on port $2...${NC}"
    local count=0
    while [ $count -lt 60 ]; do
        if curl -s http://localhost:$2$3 > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $1 is ready!${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    echo -e "${RED}❌ $1 failed to start after 60 seconds${NC}"
    exit 1
}

# Clean up function
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    
    # Kill background processes
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    if [ ! -z "$WEB_PID" ]; then
        kill $WEB_PID 2>/dev/null
    fi
    
    # Stop Docker containers
    docker-compose -f docker-compose.dev.yml down
    
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    exit 0
}

# Trap cleanup on script exit
trap cleanup EXIT INT TERM

echo -e "\n${BLUE}📋 Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js $(node --version) found${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm --version) found${NC}"

# Check if ports are available
echo -e "\n${BLUE}🔍 Checking port availability...${NC}"
check_port 3000 || exit 1
check_port 3001 || exit 1
check_port 5432 || exit 1
check_port 6379 || exit 1

echo -e "\n${BLUE}🐳 Starting database containers...${NC}"
docker-compose -f docker-compose.dev.yml up -d

# Wait for databases to be ready
echo -e "\n${BLUE}⏳ Waiting for databases...${NC}"
sleep 10

# Check database health
echo -e "${YELLOW}Checking PostgreSQL...${NC}"
if docker-compose -f docker-compose.dev.yml exec -T postgres pg_isready -U postgres > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
else
    echo -e "${RED}❌ PostgreSQL failed to start${NC}"
    exit 1
fi

echo -e "${YELLOW}Checking Redis...${NC}"
if docker-compose -f docker-compose.dev.yml exec -T redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is ready${NC}"
else
    echo -e "${RED}❌ Redis failed to start${NC}"
    exit 1
fi

echo -e "\n${BLUE}🚀 Starting backend server...${NC}"
cd backend
export NODE_ENV=development
npm run dev > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
wait_for_service "Backend API" 3001 "/health"

echo -e "\n${BLUE}🌐 Starting web application...${NC}"
cd web
npm start > ../logs/web.log 2>&1 &
WEB_PID=$!
cd ..

# Wait for web app to start
echo -e "${YELLOW}⏳ Waiting for React app to start...${NC}"
sleep 20

# Check if web app is running
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Web app is ready!${NC}"
else
    echo -e "${YELLOW}⚠️  Web app might still be starting...${NC}"
fi

echo -e "\n${GREEN}🎉 SyncWatch Development Environment is ready!${NC}"
echo -e "\n${BLUE}📱 Services:${NC}"
echo -e "  🌐 Web App: ${YELLOW}http://localhost:3000${NC}"
echo -e "  🔌 Backend API: ${YELLOW}http://localhost:3001${NC}"
echo -e "  🐘 PostgreSQL: ${YELLOW}localhost:5432${NC}"
echo -e "  🔴 Redis: ${YELLOW}localhost:6379${NC}"

echo -e "\n${BLUE}📝 Logs:${NC}"
echo -e "  📊 Backend: ${YELLOW}tail -f logs/backend.log${NC}"
echo -e "  📊 Web: ${YELLOW}tail -f logs/web.log${NC}"
echo -e "  📊 Database: ${YELLOW}docker-compose -f docker-compose.dev.yml logs -f${NC}"

echo -e "\n${BLUE}🛠️  Quick Commands:${NC}"
echo -e "  📈 Health Check: ${YELLOW}curl http://localhost:3001/health${NC}"
echo -e "  📊 Container Status: ${YELLOW}docker-compose -f docker-compose.dev.yml ps${NC}"
echo -e "  🔄 Restart Backend: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "  🔄 Restart Web: ${YELLOW}cd web && npm start${NC}"

echo -e "\n${GREEN}Press Ctrl+C to stop all services${NC}"

# Keep script running
while true; do
    sleep 1
done 