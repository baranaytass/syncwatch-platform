import React, { useState } from 'react';
import './App.css';

function App() {
  const [sessionId, setSessionId] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  return (
    <div className="App">
      <header className="App-header">
        <h1>🎬 SyncWatch</h1>
        <p>Watch videos together in sync</p>
        
        {!isConnected ? (
          <div className="session-controls">
            <div className="create-session">
              <h2>Create a New Session</h2>
              <button className="btn btn-primary">
                Create Session
              </button>
            </div>
            
            <div className="join-session">
              <h2>Join Existing Session</h2>
              <input
                type="text"
                placeholder="Enter Session ID"
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="session-input"
              />
              <button 
                className="btn btn-secondary"
                disabled={!sessionId.trim()}
              >
                Join Session
              </button>
            </div>
          </div>
        ) : (
          <div className="video-session">
            <h2>Session: {sessionId}</h2>
            <div className="video-container">
              <p>Video player will be here...</p>
            </div>
          </div>
        )}
      </header>
    </div>
  );
}

export default App; 