import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';

interface SessionDetailsProps {
  className?: string;
}

export const SessionDetails: React.FC<SessionDetailsProps> = ({ className }) => {
  const { currentSession, updateVideoUrl, leaveSession, isLoading } = useSession();
  const [videoUrlInput, setVideoUrlInput] = useState<string>('');
  const [showUrlForm, setShowUrlForm] = useState<boolean>(false);

  if (!currentSession) {
    return null;
  }

  const handleVideoUrlSubmit = async (): Promise<void> => {
    const trimmedUrl = videoUrlInput.trim();
    
    if (!trimmedUrl) {
      alert('Lütfen geçerli bir video URL girin.');
      return;
    }

    // Basic URL validation
    try {
      new URL(trimmedUrl);
    } catch {
      alert('Geçersiz URL formatı. Lütfen doğru bir URL girin.');
      return;
    }

    await updateVideoUrl(trimmedUrl);
    setVideoUrlInput('');
    setShowUrlForm(false);
  };

  const handleLeaveSession = (): void => {
    if (window.confirm('Oturumdan ayrılmak istediğinizden emin misiniz?')) {
      leaveSession();
    }
  };

  const copySessionId = (): void => {
    navigator.clipboard.writeText(currentSession.id).then(() => {
      alert('Session ID kopyalandı!');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = currentSession.id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Session ID kopyalandı!');
    });
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('tr-TR');
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'WAITING': return '#f39c12';
      case 'ACTIVE': return '#2ecc71';
      case 'ENDED': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'WAITING': return 'Bekliyor';
      case 'ACTIVE': return 'Aktif';
      case 'ENDED': return 'Sonlandı';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <div className={`session-details ${className || ''}`}>
      <div className="session-header">
        <h2>🎬 Aktif Oturum</h2>
        <div className="session-actions">
          <button
            onClick={handleLeaveSession}
            className="btn btn-danger leave-btn"
            disabled={isLoading}
          >
            Oturumdan Ayrıl
          </button>
        </div>
      </div>

      <div className="session-info">
        <div className="info-grid">
          <div className="info-item">
            <label>Session ID:</label>
            <div className="session-id-display">
              <code className="session-id" data-testid="session-id">
                {currentSession.id}
              </code>
              <button 
                onClick={copySessionId}
                className="btn btn-sm btn-outline copy-btn"
                title="Session ID'yi kopyala"
              >
                📋
              </button>
            </div>
          </div>

          <div className="info-item">
            <label>Durum:</label>
            <span 
              className="status-badge" 
              style={{ color: getStatusColor(currentSession.status) }}
              data-testid="session-status"
            >
              {getStatusText(currentSession.status)}
            </span>
          </div>

          <div className="info-item">
            <label>Oluşturulma:</label>
            <span>{formatDate(currentSession.createdAt)}</span>
          </div>

          <div className="info-item">
            <label>Katılımcılar:</label>
            <span data-testid="user-count">
              {currentSession.participants?.length || 1} kişi
            </span>
          </div>
        </div>

        {currentSession.participants && currentSession.participants.length > 0 && (
          <div className="participants-section">
            <h4>Katılımcılar:</h4>
            <div className="participants-list">
              {currentSession.participants.map((participantId, index) => (
                <div key={participantId} className="participant-item">
                  <span className="participant-id">
                    {participantId.substring(0, 8)}...
                  </span>
                  {index === 0 && <span className="host-badge">HOST</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="video-section">
        <h3>📺 Video Ayarları</h3>
        
        {currentSession.videoUrl ? (
          <div className="current-video">
            <div className="video-info">
              <label>Mevcut Video:</label>
              <div className="video-url">
                <a 
                  href={currentSession.videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-link"
                >
                  {currentSession.videoUrl}
                </a>
              </div>
            </div>
            <button
              onClick={() => setShowUrlForm(true)}
              className="btn btn-outline change-video-btn"
              disabled={isLoading}
            >
              Video Değiştir
            </button>
          </div>
        ) : (
          <div className="no-video">
            <p>Henüz video ayarlanmamış. İzlemek istediğiniz video URL'ini girin:</p>
            <button
              onClick={() => setShowUrlForm(true)}
              className="btn btn-primary add-video-btn"
              disabled={isLoading}
            >
              Video Ekle
            </button>
          </div>
        )}

        {showUrlForm && (
          <div className="video-url-form">
            <div className="form-group">
              <label htmlFor="videoUrl">Video URL:</label>
              <input
                id="videoUrl"
                type="url"
                placeholder="https://example.com/video.mp4"
                value={videoUrlInput}
                onChange={(e) => setVideoUrlInput(e.target.value)}
                className="video-url-input"
                data-testid="video-url-input"
                disabled={isLoading}
              />
              <small>
                Desteklenen formatlar: MP4, WebM, YouTube, Vimeo, Dailymotion
              </small>
            </div>
            
            <div className="form-actions">
              <button
                onClick={handleVideoUrlSubmit}
                disabled={isLoading || !videoUrlInput.trim()}
                className="btn btn-primary"
              >
                {isLoading ? 'Kaydediliyor...' : 'Video URL Kaydet'}
              </button>
              <button
                onClick={() => {
                  setShowUrlForm(false);
                  setVideoUrlInput('');
                }}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                İptal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionDetails; 