import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';

interface SessionCreatorProps {
  className?: string;
}

export const SessionCreator: React.FC<SessionCreatorProps> = ({ className }) => {
  const { createSession, joinSession, isLoading, userId: currentUserId } = useSession();
  const [sessionIdInput, setSessionIdInput] = useState<string>('');
  const [userIdForJoin, setUserIdForJoin] = useState<string>('');

  const handleCreateSession = async (): Promise<void> => {
    console.log('🎬 Creating session with user ID:', currentUserId?.substring(0, 8) + '...');
    await createSession(); // Artık parametre gerekmiyor
  };

  const handleJoinSession = async (): Promise<void> => {
    const trimmedSessionId = sessionIdInput.trim();
    const trimmedUserId = userIdForJoin.trim(); // Boş olabilir, context otomatik handle eder

    if (!trimmedSessionId) {
      alert('Lütfen geçerli bir Session ID girin.');
      return;
    }

    await joinSession(trimmedSessionId, trimmedUserId || undefined);
  };

  return (
    <div className={`session-creator ${className || ''}`}>
      <div className="session-controls">
        {/* Create Session Section */}
        <div className="create-session-section">
          <h2>🎬 Yeni Oturum Oluştur</h2>
          <p>Arkadaşlarınızla birlikte video izlemek için yeni bir oturum başlatın.</p>
          <div className="user-info">
            <small>Your ID: {currentUserId ? currentUserId.substring(0, 8) + '...' : 'Oluşturuluyor...'}</small>
          </div>
          <button
            onClick={handleCreateSession}
            disabled={isLoading}
            className="btn btn-primary create-btn"
            data-testid="create-session-btn"
          >
            {isLoading ? 'Oluşturuluyor...' : 'Oturum Oluştur'}
          </button>
        </div>

        {/* Divider */}
        <div className="divider">
          <span>VEYA</span>
        </div>

        {/* Join Session Section */}
        <div className="join-session-section">
          <h2>🔗 Mevcut Oturuma Katıl</h2>
          <p>Arkadaşınızın paylaştığı Session ID ile mevcut oturuma katılın.</p>
          
          <div className="form-group">
            <label htmlFor="sessionId">Session ID:</label>
            <input
              id="sessionId"
              type="text"
              placeholder="Session ID'yi buraya girin"
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              className="session-input"
              data-testid="session-id-input"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="userId">Your User ID (opsiyonel):</label>
            <input
              id="userId"
              type="text"
              placeholder="Varsayılan kullanıcı ID'si kullanılacak"
              value={userIdForJoin}
              onChange={(e) => setUserIdForJoin(e.target.value)}
              className="user-input"
              disabled={isLoading}
            />
            <small>Boş bırakılırsa mevcut kullanıcı ID'niz kullanılır: {currentUserId ? currentUserId.substring(0, 8) + '...' : 'Oluşturuluyor...'}</small>
          </div>

          <button
            onClick={handleJoinSession}
            disabled={isLoading || !sessionIdInput.trim()}
            className="btn btn-secondary join-btn"
            data-testid="join-session-btn"
          >
            {isLoading ? 'Katılıyor...' : 'Oturuma Katıl'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCreator; 