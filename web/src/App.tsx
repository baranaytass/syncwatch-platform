import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { SessionProvider, useSession } from './context/SessionContext';
import SessionCreator from './components/SessionCreator';
import SessionDetails from './components/SessionDetails';
import ApiTestComponent from './components/ApiTestComponent';
import './App.css';
import 'react-toastify/dist/ReactToastify.css';

// React Query client configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Main App Content Component
const AppContent: React.FC = () => {
  const { currentSession, isLoading, error } = useSession();

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-content">
          <h1 className="app-title">🎬 SyncWatch</h1>
          <p className="app-subtitle">Watch videos together in perfect sync</p>
          
          {error && (
            <div className="error-banner" role="alert">
              <span>❌ {error}</span>
            </div>
          )}
        </div>
      </header>

      <main className="App-main">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Yükleniyor...</p>
            </div>
          </div>
        )}

        <div className="content-container">
          {!currentSession ? (
            // Session creation/join screen
            <div className="welcome-screen">
              <div className="welcome-content">
                <h2>Hoş Geldiniz! 👋</h2>
                <p>
                  Arkadaşlarınızla birlikte video izlemek için yeni bir oturum oluşturun 
                  veya mevcut bir oturuma katılın.
                </p>
                <SessionCreator className="session-creator-main" />
              </div>
            </div>
          ) : (
            // Active session screen
            <div className="session-screen">
              <SessionDetails className="session-details-main" />
              
              {currentSession.status === 'ACTIVE' && currentSession.videoUrl && (
                <div className="video-player-section">
                  <h3>🎥 Video Player</h3>
                  <div className="video-placeholder">
                    <p>Video player component buraya gelecek...</p>
                    <div className="video-info">
                      <p><strong>Video URL:</strong> {currentSession.videoUrl}</p>
                      <p><strong>Durum:</strong> {currentSession.isPlaying ? 'Oynatılıyor' : 'Durduruldu'}</p>
                      {currentSession.currentVideoTime !== undefined && (
                        <p><strong>Zaman:</strong> {Math.floor(currentSession.currentVideoTime)} saniye</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="App-footer">
        <p>SyncWatch v1.0.0 - Built with React + TypeScript</p>
      </footer>

      {/* Toast Notifications */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      {/* Development API Test Panel */}
      {process.env.NODE_ENV === 'development' && <ApiTestComponent />}
    </div>
  );
};

// Main App Component with Providers
const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <AppContent />
      </SessionProvider>
    </QueryClientProvider>
  );
};

export default App; 