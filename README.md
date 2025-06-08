# 🎬 SyncWatch

A real-time synchronized video watching platform that allows users to watch videos together from different locations.

## ✨ Features

- 🔄 **Real-time Video Synchronization** - All users watch videos simultaneously
- 🌐 **Web-based Platform** - No downloads required, runs in browser
- 🎮 **Shared Controls** - Play/pause/seek controls are synchronized across all users
- 🔗 **URL-based Video Sharing** - Support for YouTube, Vimeo, and direct video links
- 💬 **Real-time Communication** - WebSocket-powered instant synchronization

## 🛠️ Tech Stack

- **Backend**: Node.js 18.x + Express.js + Socket.IO + TypeScript
- **Frontend**: React 18.2.0 + Socket.IO Client + TypeScript  
- **Database**: PostgreSQL 15 + Redis 7
- **DevOps**: Docker Compose + Hot Reload

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker Desktop

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/baranaytass/syncwatch-platform.git
   cd syncwatch-platform
   ```

2. **Start databases**
   ```bash
   docker compose up -d
   ```

3. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Web app
   cd ../web && npm install
   ```

4. **Start development servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Web app  
   cd web && npm start
   ```

5. **Access the application**
   - Web App: http://localhost:3000
   - Backend API: http://localhost:3001

## 📁 Project Structure

```
syncwatch-platform/
├── backend/          # Node.js API server
├── web/             # React web application  
├── shared/          # Shared TypeScript types
├── docker-compose.yml # Database containers
└── README.md
```

## 🔧 Development

### NPM Scripts

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start databases |
| `npm run backend` | Start backend server |
| `npm run web` | Start web application |
| `npm run status` | Check service status |

### API Endpoints

- `GET /health` - Health check
- `POST /api/sessions` - Create new session
- `POST /api/sessions/:id/join` - Join existing session

### WebSocket Events

- `join-session` - Join a video session
- `video-event` - Send video control events
- `video-sync` - Receive synchronization updates

## 🧪 Testing

```bash
# Backend tests
cd backend && npm test

# Web tests  
cd web && npm test
```

## 🚀 Deployment

The application is designed to be deployed on modern cloud platforms with Docker support.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is a portfolio demonstration.

## 📧 Contact

- GitHub: [@baranaytass](https://github.com/baranaytass)
- Project Link: [https://github.com/baranaytass/syncwatch-platform](https://github.com/baranaytass/syncwatch-platform) 