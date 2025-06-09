import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import VideoProviderSelector from './VideoProviderSelector';
import { VideoProvider } from '../../../shared/src/types/video.types';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  LogOut, 
  Copy, 
  Users, 
  Calendar, 
  Hash, 
  Video, 
  Plus, 
  Edit,
  ExternalLink,
  Crown
} from 'lucide-react';
import { toast } from 'react-toastify';

interface SessionDetailsProps {
  className?: string;
}

export const SessionDetails: React.FC<SessionDetailsProps> = ({ className }) => {
  const { currentSession, updateVideoUrl, leaveSession, isLoading } = useSession();
  const [showProviderSelector, setShowProviderSelector] = useState<boolean>(false);

  if (!currentSession) {
    return null;
  }

  // Safe access to session properties
  const sessionId = currentSession.id || '';
  const sessionStatus = currentSession.status || 'WAITING';
  const sessionParticipants = currentSession.participants || [];
  const sessionCreatedAt = currentSession.createdAt || new Date();
  const sessionVideoUrl = currentSession.videoUrl || '';

  const handleVideoSubmit = async (provider: VideoProvider, url: string): Promise<void> => {
    try {
      console.log('📺 Setting video:', { provider, url });
      // URL zaten provider prefix ile geliyor (VideoProviderSelector'dan)
      await updateVideoUrl(url);
      setShowProviderSelector(false);
    } catch (error) {
      console.error('❌ Error setting video:', error);
      toast.error('Video ayarlanırken hata oluştu');
    }
  };

  const handleLeaveSession = (): void => {
    if (window.confirm('Oturumdan ayrılmak istediğinizden emin misiniz?')) {
      leaveSession();
    }
  };

  const copySessionId = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sessionId);
      toast.success('Session ID kopyalandı!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success('Session ID kopyalandı!');
    }
  };

  const formatDate = (date: Date | string): string => {
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      return d.toLocaleString('tr-TR');
    } catch (error) {
      return 'Bilinmiyor';
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "warning" => {
    switch (status) {
      case 'WAITING': return 'warning';
      case 'ACTIVE': return 'success';
      case 'ENDED': return 'destructive';
      default: return 'secondary';
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
    <div className={`w-full max-w-4xl mx-auto space-y-6 ${className || ''}`}>
      {/* Session Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Video className="h-6 w-6 text-primary" />
              <div>
                <CardTitle className="text-2xl">Aktif Oturum</CardTitle>
                <CardDescription>
                  Session bilgileri ve katılımcı yönetimi
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={handleLeaveSession}
              variant="destructive"
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Oturumdan Ayrıl
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Oturum Bilgileri</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session ID */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Hash className="h-4 w-4" />
                Session ID
              </div>
              <div className="flex items-center gap-2">
                <code 
                  className="flex-1 px-3 py-2 bg-muted rounded-md font-mono text-sm"
                  data-testid="session-id"
                >
                  {sessionId}
                </code>
                <Button
                  onClick={copySessionId}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                  title="Session ID'yi kopyala"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Durum
              </div>
              <Badge 
                variant={getStatusVariant(sessionStatus)}
                data-testid="session-status"
                className="w-fit"
              >
                {getStatusText(sessionStatus)}
              </Badge>
            </div>

            {/* Created At */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Oluşturulma
              </div>
              <p className="text-sm">{formatDate(sessionCreatedAt)}</p>
            </div>

            {/* Participants Count */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Users className="h-4 w-4" />
                Katılımcılar
              </div>
              <p className="text-sm" data-testid="user-count">
                {sessionParticipants.length || 1} kişi
              </p>
            </div>
          </div>

          {/* Participants List */}
          {sessionParticipants && sessionParticipants.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 font-medium">
                  <Users className="h-4 w-4" />
                  Katılımcı Listesi
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {sessionParticipants.map((participantId, index) => (
                    <div 
                      key={participantId} 
                      className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1 font-mono text-sm">
                        {participantId.substring(0, 8)}...
                      </div>
                      {index === 0 && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Crown className="h-3 w-3" />
                          HOST
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Video Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Ayarları
          </CardTitle>
          <CardDescription>
            İzlemek istediğiniz video kaynağını yönetin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionVideoUrl ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Mevcut Video
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                    <a 
                      href={sessionVideoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline break-all"
                    >
                      <ExternalLink className="h-4 w-4 flex-shrink-0" />
                      {sessionVideoUrl}
                    </a>
                  </div>
                  <Button
                    onClick={() => setShowProviderSelector(true)}
                    variant="outline"
                    disabled={isLoading}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Değiştir
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                <Video className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Henüz video ayarlanmamış
                </p>
                <p className="text-xs text-muted-foreground">
                  İzlemek istediğiniz video kaynağını seçin
                </p>
              </div>
              <Button
                onClick={() => setShowProviderSelector(true)}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Video Ekle
              </Button>
            </div>
          )}

          {showProviderSelector && (
            <div className="space-y-4 pt-4 border-t">
              <VideoProviderSelector
                onVideoSubmit={handleVideoSubmit}
                isLoading={isLoading}
                className="provider-selector"
              />
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowProviderSelector(false)}
                  variant="outline"
                  disabled={isLoading}
                >
                  İptal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionDetails; 