import React, { useState } from 'react';
import { useSession } from '../context/SessionContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Video, Users } from 'lucide-react';

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
    <div className={`w-full max-w-4xl mx-auto ${className || ''}`}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Session Section */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-bl-full opacity-10" />
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Video className="h-5 w-5 text-blue-600" />
              Yeni Oturum Oluştur
            </CardTitle>
            <CardDescription>
              Arkadaşlarınızla birlikte video izlemek için yeni bir oturum başlatın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-3 rounded-lg">
              <Label className="text-xs text-muted-foreground">Your ID</Label>
              <p className="text-sm font-mono">
                {currentUserId ? currentUserId.substring(0, 8) + '...' : 'Oluşturuluyor...'}
              </p>
            </div>
            <Button
              onClick={handleCreateSession}
              disabled={isLoading}
              className="w-full"
              size="lg"
              data-testid="create-session-btn"
            >
              {isLoading ? 'Oluşturuluyor...' : 'Oturum Oluştur'}
            </Button>
          </CardContent>
        </Card>

        {/* Join Session Section */}
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500 to-teal-600 rounded-bl-full opacity-10" />
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-5 w-5 text-green-600" />
              Mevcut Oturuma Katıl
            </CardTitle>
            <CardDescription>
              Arkadaşınızın paylaştığı Session ID ile mevcut oturuma katılın.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sessionId">Session ID</Label>
              <Input
                id="sessionId"
                type="text"
                placeholder="Session ID'yi buraya girin"
                value={sessionIdInput}
                onChange={(e) => setSessionIdInput(e.target.value)}
                data-testid="session-id-input"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userId">Your User ID (opsiyonel)</Label>
              <Input
                id="userId"
                type="text"
                placeholder="Varsayılan kullanıcı ID'si kullanılacak"
                value={userIdForJoin}
                onChange={(e) => setUserIdForJoin(e.target.value)}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                Boş bırakılırsa mevcut kullanıcı ID'niz kullanılır: {currentUserId ? currentUserId.substring(0, 8) + '...' : 'Oluşturuluyor...'}
              </p>
            </div>

            <Button
              onClick={handleJoinSession}
              disabled={isLoading || !sessionIdInput.trim()}
              variant="secondary"
              className="w-full"
              size="lg"
              data-testid="join-session-btn"
            >
              {isLoading ? 'Katılıyor...' : 'Oturuma Katıl'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SessionCreator; 