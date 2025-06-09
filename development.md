# SyncWatch - Synchronized Video Watching Platform

## Proje Amacı

SyncWatch, uzaktan bulunan kullanıcıların video içeriklerini gerçek zamanlı ve senkronize bir şekilde izlemelerini sağlayan cross-platform bir portfolyo projesidir. Web platformunda çalışan uygulama (gelecekte React Native mobile desteği), kullanıcıların URL'den video paylaşarak aynı anda izleyip, oynatma kontrollerini (play/pause/seek) gerçek zamanlı olarak paylaşmalarını mümkün kılar.

## Mimari Yaklaşım: WebSocket-First Real-time Architecture

### 🎯 Proje Mimarisi
SyncWatch projesi **WebSocket-first architecture** prensibine dayalı olarak tasarlanmıştır:

- **Primary Communication**: WebSocket (Socket.IO) - Real-time senkronizasyon
- **Fallback Communication**: REST API - İlk bağlantı ve fallback operasyonları
- **Cross-platform Ready**: Web (React) + gelecekte Mobile (React Native)
- **Real-time Everything**: Katılımcı yönetimi, video senkronizasyonu, chat (gelecekte)

### 🏗️ Backend Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    SyncWatch Backend                        │
├─────────────────────────────────────────────────────────────┤
│  WebSocket-First Communication Layer (Socket.IO)           │
│  ├── Session Management (join/leave/participants)          │
│  ├── Video Synchronization (play/pause/seek)               │
│  ├── Video URL Updates (provider-specific)                 │
│  └── Real-time State Broadcasting                          │
├─────────────────────────────────────────────────────────────┤
│  REST API Layer (Fallback & Initial Operations)            │
│  ├── Session Creation/Info                                 │
│  ├── Video Provider Detection/Validation                   │
│  └── Fallback Video URL Updates                           │
├─────────────────────────────────────────────────────────────┤
│  Business Logic Layer (Clean Architecture)                 │
│  ├── SessionService (CRUD + Business Rules)                │
│  ├── VideoSyncService (Sync Logic + Conflict Resolution)   │
│  ├── VideoProviderService (Multi-provider Support)         │
│  └── WebSocketManager (Real-time Event Management)         │
├─────────────────────────────────────────────────────────────┤
│  Data Layer (Persistence + Cache)                          │
│  ├── PostgreSQL (Session + User Data)                      │
│  ├── Redis (Cache + Session State)                         │
│  └── Repository Pattern (Type-safe Data Access)            │
└─────────────────────────────────────────────────────────────┘
```

### 🌐 Frontend Architecture  
```
┌─────────────────────────────────────────────────────────────┐
│                    SyncWatch Web App                        │
├─────────────────────────────────────────────────────────────┤
│  Real-time UI Layer (React Components)                     │
│  ├── SessionDetails (Live Participant List)                │
│  ├── VideoPlayer (Multi-provider Support)                  │
│  ├── VideoProviderSelector (YouTube, HTML5, etc.)          │
│  └── Real-time Notifications (Toast + State Updates)       │
├─────────────────────────────────────────────────────────────┤
│  State Management (React Context + Reducers)               │
│  ├── SessionContext (Real-time Session State)              │
│  ├── WebSocket Event Handlers                              │
│  └── Automatic State Synchronization                       │
├─────────────────────────────────────────────────────────────┤
│  Communication Layer                                       │
│  ├── WebSocketService (Primary: Real-time Events)          │
│  ├── ApiService (Secondary: REST Fallback)                 │
│  └── Hybrid Strategy (WebSocket + REST)                    │
└─────────────────────────────────────────────────────────────┘
```

## Teknoloji Stack (Ücretsiz/Open Source)

### Backend
- **Node.js + Express.js** - REST API foundation
- **Socket.IO** - Real-time WebSocket communication
- **PostgreSQL** - Session ve kullanıcı verileri persistence
- **Redis** - Cache ve session state management
- **Winston** - Comprehensive logging
- **Jest + Supertest** - Backend testing (59/59 tests passing)

### Frontend  
- **React 18.2.0** - Web application (Sabit sürüm)
- **Socket.IO Client** - Real-time communication
- **React Context** - Real-time state management
- **@tanstack/react-query** - Server state management and caching
- **ShadCN UI** - Modern component library
- **Playwright** - E2E integration testing (4/4 tests passing)

### Cross-Platform Foundation
- **Shared TypeScript Types** - Cross-platform type safety
- **WebSocket-first Architecture** - Platform agnostic real-time
- **React Native Ready** - Future mobile implementation

## Development Kuralları

### 🔒 Paket Sürüm Yönetimi
1. **Core Framework Sürümleri Sabit:**
   - React: 18.2.0 (değişmez)
   - React Native: 0.72.x (gelecek - değişmez)  
   - Node.js: 18.x LTS (değişmez)
   - Express: 4.18.x (değişmez)

2. **Önem Hiyerarşisi:**
   - **Kritik:** React, Node.js (asla değiştirme)
   - **Önemli:** Express, Socket.IO, PostgreSQL (sadece security update)
   - **Esnek:** UI kütüphaneleri, dev dependencies (uyumlu kalarak update)

### 🔌 WebSocket-First Development Rules

1. **Real-time Operations:**
   ```typescript
   // ✅ Primary: WebSocket
   webSocketService.joinSession(sessionId, userId);
   webSocketService.updateVideoUrl(sessionId, videoUrl, userId);
   
   // ✅ Fallback: REST API
   await apiService.joinSession({ sessionId, userId });
   await apiService.updateVideoUrl({ sessionId, videoUrl });
   ```

2. **Event-Driven Architecture:**
   - Session operations: `join-session`, `leave-session`, `user-joined`, `user-left`
   - Video operations: `video-url-update`, `video-url-updated`, `video-event`, `video-sync`
   - State management: `session-refreshed`, `session-error`

3. **Cross-platform Consistency:**
   - Aynı WebSocket event'ları web ve mobile'da kullanılacak
   - Shared TypeScript types ile type safety
   - Platform-agnostic business logic

### 🎬 Video Provider Architecture

1. **Multi-Provider Support:**
   ```typescript
   // Supported providers
   type VideoProvider = 'youtube' | 'html5' | 'vimeo' | 'ownmedia';
   
   // Provider-specific handling
   - YouTube: Embed player + video ID extraction
   - HTML5: Direct video files (MP4, WebM, OGG)
   - Vimeo: Coming soon
   - OwnMedia: File upload (coming soon)
   ```

2. **Provider Detection:**
   - Automatic URL pattern matching
   - Manual provider selection
   - Validation + metadata extraction

### 📝 Code Quality Kuralları

1. **WebSocket Error Handling:**
   - Tüm WebSocket event'lar try-catch ile sarılmalı
   - Graceful fallback to REST API
   - User-friendly real-time error notifications

2. **Testing Requirements:**
   - Backend: %95+ coverage (59/59 tests passing)
   - WebSocket integration tests
   - Cross-browser real-time testing

3. **Real-time State Management:**
   - Event-driven state updates
   - Optimistic UI updates
   - Conflict resolution algorithms

## Proje Mimarisi

```
syncwatch/
├── backend/                     # Node.js + Socket.IO backend
│   ├── src/
│   │   ├── config/             # Database + Redis configuration
│   │   ├── controllers/        # REST API controllers
│   │   ├── services/           # Business logic (Session, VideoSync, VideoProvider)
│   │   ├── websocket/          # WebSocket event management
│   │   ├── models/             # Database models
│   │   ├── middleware/         # Express middleware
│   │   ├── utils/              # Utility functions + error handling
│   │   ├── validators/         # Request validation
│   │   └── app.ts              # Main application (WebSocket + REST)
│   ├── tests/                  # Comprehensive test suite (59/59 passing)
│   └── docker-compose.yml      # Development environment (PostgreSQL + Redis)
├── web/                        # React web application
│   ├── src/
│   │   ├── components/         # UI components (ShadCN-based)
│   │   ├── context/            # Real-time state management (SessionContext)
│   │   ├── services/           # WebSocket + API services
│   │   ├── hooks/              # Custom React hooks
│   │   ├── pages/              # Page components
│   │   └── types/              # TypeScript type definitions
│   └── public/
├── shared/                     # Cross-platform shared code
│   ├── types/                  # Shared TypeScript types
│   ├── constants/              # Cross-platform constants
│   └── utils/                  # Platform-agnostic utilities
├── docs/                       # Documentation
└── README.md
```

## Core Classes ve Servisler

### Backend Classes

#### 1. WebSocketManager (Real-time Communication Hub)
```javascript
class WebSocketManager {
  handleJoinSession(socket, { sessionId, userId })     // Real-time session join
  handleLeaveSession(socket, { sessionId, userId })    // Real-time session leave  
  handleVideoUrlUpdate(socket, { sessionId, videoUrl, userId }) // Real-time video URL
  handleVideoEvent(socket, videoEvent)                 // Real-time video sync (play/pause/seek)
  handleRefreshSession(socket, { sessionId })          // Real-time session refresh
  broadcastToSession(sessionId, event, data)           // Session-wide broadcasting
}
```

#### 2. SessionService (Business Logic)
```javascript
class SessionService {
  async createSession(userId)           // Create new session
  async joinSession(sessionId, userId)  // Join existing session
  async leaveSession(sessionId, userId) // Leave session
  async getSession(sessionId)           // Get session data
  async setVideoUrl(sessionId, url)     // Update video URL
  async updateVideoState(sessionId, state) // Update video state
}
```

#### 3. VideoSyncService (Synchronization Logic)
```javascript
class VideoSyncService {
  async handleVideoEvent(sessionId, event, userId)     // Process video events
  async syncVideoState(sessionId, state, excludeUserId) // Sync video state
  async validateVideoSync(currentState, newState)      // Validate sync operations
  async resolveConflict(sessionId, conflictingStates)  // Handle sync conflicts
}
```

#### 4. VideoProviderService (Multi-provider Support)
```javascript
class VideoProviderService {
  async validateUrl(url, provider)             // Validate provider-specific URLs
  detectProvider(url)                          // Auto-detect video provider
  extractVideoId(url, provider)                // Extract video ID (YouTube, Vimeo)
  async extractMetadata(url, provider)         // Get video metadata
  getProviderInfo(provider)                    // Get provider capabilities
}
```

### Frontend Classes

#### 1. WebSocketService (Real-time Communication)
```javascript
class WebSocketService {
  joinSession(sessionId, userId)               // Join session via WebSocket
  leaveSession()                               // Leave current session
  updateVideoUrl(sessionId, videoUrl, userId)  // Update video URL real-time
  sendVideoEvent(event)                        // Send video events (play/pause/seek)
  refreshSession(sessionId)                    // Refresh session data
  on(event, handler)                           // Event listener management
}
```

#### 2. SessionContext (State Management)
```javascript
// React Context for real-time session state
const SessionContext = {
  currentSession: SessionData | null,          // Current session state
  isLoading: boolean,                          // Loading state
  error: string | null,                        // Error state
  createSession: () => Promise<void>,          // Create new session
  joinSession: (sessionId) => Promise<void>,   // Join existing session
  updateVideoUrl: (url) => Promise<void>,      // Update video URL
  leaveSession: () => void,                    // Leave session
  refreshSession: (sessionId) => Promise<void> // Refresh session data
}
```

#### 3. VideoPlayer (Multi-provider Video Component)
```javascript
class VideoPlayer {
  // Supports multiple video providers
  - YouTubePlayer (embed iframe)
  - HTML5Player (video element)
  - VimeoPlayer (coming soon)
  
  // Real-time synchronization
  handlePlay(currentTime)    // Send play event via WebSocket
  handlePause(currentTime)   // Send pause event via WebSocket  
  handleSeek(currentTime)    // Send seek event via WebSocket
  syncWithRemote(remoteState) // Sync with remote video events
}
```

## Development Progress & Implementation Status

### ✅ Phase 1: Infrastructure Setup (Completed - December 2024)
Monorepo setup with React 18.2.0, Node.js + Socket.IO backend, PostgreSQL + Redis infrastructure. Docker development environment ready.

### ✅ Phase 2: Core Backend Implementation (Completed - January 2025)
Clean architecture with SessionService, VideoSyncService, Result pattern error handling. 59/59 tests passing with PostgreSQL + Redis integration.

### ✅ Phase 3: WebSocket Real-time Integration (Completed - January 2025) 
Complete Socket.IO implementation with real-time session management, participant sync, and live session state updates. Cross-browser verified.

### ✅ Phase 4: Multi-Provider Video System (Completed - January 2025)
VideoProviderService with YouTube, HTML5, Vimeo support. URL validation, provider detection, and metadata extraction fully implemented.

### ✅ Phase 5: Architecture Unification (Completed - January 2025)
WebSocket-first architecture with REST fallback. Production-ready backend with hybrid communication strategy.

### ✅ Phase 6: E2E Integration Testing & Video Sync Bug Fix (Completed - June 2025)
Playwright integration testing framework with 4 comprehensive test scenarios. Fixed critical video sync bug in WebSocketManager event handling.

### Current Status (June 2025)
**Production-Ready System**: 59/59 backend tests + 4/4 E2E tests passing. Real-time video synchronization working across browsers with WebSocket-first architecture.

**Next Phase**: Advanced video controls (seek, volume) + chat system + React Native mobile app

## Video Paylaşım Stratejisi

### URL Tabanlı Video Paylaşım
**Neden dosya upload'u değil URL paylaşımı?**
1. **Maliyet:** Dosya storage maliyeti yok
2. **Performans:** CDN'lerden direkt streaming
3. **Uyumluluk:** YouTube, Vimeo, Dailymotion gibi platformlar
4. **Basitlik:** Karmaşık upload/encoding pipeline'ı yok
5. **Real-time:** WebSocket ile anında URL paylaşımı

### Desteklenen Video Kaynakları
- **YouTube URLs** (embed player ile) - ✅ Fully implemented
- **Direct MP4/WebM URLs** (HTML5 video) - ✅ Fully implemented  
- **Vimeo URLs** (embed player ile) - 🚧 Coming soon
- **OwnMedia Upload** - 🚧 Coming soon

### Real-time Video URL Sharing
```typescript
// WebSocket-first video URL sharing
webSocketService.updateVideoUrl(sessionId, videoUrl, userId);

// Real-time event broadcasting
io.to(sessionId).emit('video-url-updated', {
  sessionId,
  videoUrl,
  updatedBy: userId,
  sessionData: updatedSession
});

// Provider detection and validation
const provider = videoProviderService.detectProvider(url);
const validation = await videoProviderService.validateUrl(url, provider);
```

## Best Practices

### WebSocket-First Communication
```typescript
// Primary: WebSocket for real-time operations
webSocketService.updateVideoUrl(sessionId, videoUrl, userId);

// Fallback: REST API for reliability
const fallbackResponse = await apiService.updateVideoUrl({ sessionId, videoUrl });
```

### Error Handling & Validation
- **WebSocket Events**: Structured error responses with fallback to REST
- **Input Validation**: Joi schemas for session data, video URLs
- **CORS Configuration**: Environment-specific allowed origins

## Testing Strategy

### Backend Testing (59/59 Tests Passing)
**Test Framework**: Jest + Supertest for API testing
**Database**: Isolated test database (syncwatch_test) with automatic cleanup
**Coverage**: 95%+ code coverage with comprehensive service layer testing

**Test Categories**:
- **SessionService**: 23 unit tests - CRUD operations, validation, error handling
- **VideoSyncService**: 16 unit tests - Real-time sync logic, conflict resolution  
- **VideoProviderService**: 20 integration tests - Multi-provider URL validation, metadata extraction
- **Integration Tests**: Real PostgreSQL + Redis operations with transaction rollback

**Test Commands**:
```bash
cd backend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

### E2E Integration Testing (4/4 Tests Passing)
**Test Framework**: Playwright for cross-browser testing
**Scope**: Full-stack integration including WebSocket real-time communication
**Environment**: Automated backend + frontend startup with Docker services

**Test Scenarios**:
- **Session Management**: Create/join sessions, participant tracking
- **Video Provider Selection**: YouTube URL validation, provider detection
- **Video URL Synchronization**: Real-time URL updates across browsers
- **Video Control Sync**: Play/pause synchronization between users

**Test Commands**:
```bash
cd web
npm run test:e2e          # Run E2E tests
npm run test:e2e:headed   # Visual mode
npm run test:e2e:debug    # Debug mode
```

### Frontend Unit Testing
**Test Framework**: React Testing Library + Jest
**Focus**: Component behavior, user interactions, context state management
**Mock Strategy**: WebSocket events, API responses, third-party services

```bash
cd web
npm test              # Run React tests
npm run test:coverage # Coverage report
```

## Monitoring ve Deployment

### Development Environment
**Docker Stack**: PostgreSQL 15 + Redis 7 containers
**Health Endpoints**: `/health` - System status, database connectivity, WebSocket metrics
**Hot Reload**: Nodemon backend + React dev server with live updates

**Start Commands**:
```bash
# Full stack startup
./start-dev.sh

# Individual services  
cd backend && npm run dev
cd web && npm start
```

### Production Readiness
**Architecture**: WebSocket-first with REST fallback for reliability
**Database**: PostgreSQL with proper indexing and Redis caching
**Error Handling**: Comprehensive logging with Winston, structured error responses
**Testing**: 63 total tests passing (59 backend + 4 E2E)

### Performance Monitoring
Real-time WebSocket connection tracking, session participation metrics, video sync accuracy measurement.

### Testing & Quality
- **Backend**: 59/59 tests passing (Jest + Supertest)
- **E2E Integration**: 4/4 tests passing (Playwright)
- **Coverage**: 95%+ backend code coverage
- **Real-time Testing**: Cross-browser WebSocket synchronization verified
