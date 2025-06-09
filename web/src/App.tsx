import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import { SessionProvider, useSession } from './context/SessionContext';
import SessionCreator from './components/SessionCreator';
import SessionDetails from './components/SessionDetails';
import VideoPlayer from './components/VideoPlayer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { AlertCircle, Video } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🎬 SyncWatch
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Watch videos together in perfect sync
            </p>
            
            {error && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
        {/* Loading Overlay */}
        {isLoading && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Yükleniyor...</p>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto">
          {!currentSession ? (
            // Welcome/Session Creation Screen
            <div className="max-w-4xl mx-auto">
              <Card className="mb-8">
                <CardHeader className="text-center">
                  <CardTitle className="text-3xl">Hoş Geldiniz! 👋</CardTitle>
                  <CardDescription className="text-lg">
                    Arkadaşlarınızla birlikte video izlemek için yeni bir oturum oluşturun 
                    veya mevcut bir oturuma katılın.
                  </CardDescription>
                </CardHeader>
              </Card>
              <SessionCreator />
            </div>
          ) : (
            // Active Session Screen
            <div className="space-y-8">
              <SessionDetails />
              
              {currentSession.status === 'ACTIVE' && currentSession.videoUrl && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Video Player
                    </CardTitle>
                    <CardDescription>
                      Synchronized video playback for all participants
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <VideoPlayer />
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white/50 backdrop-blur-sm border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-muted-foreground">
            SyncWatch v1.0.0 - Built with React + TypeScript
          </p>
        </div>
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
        className="mt-16"
      />
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