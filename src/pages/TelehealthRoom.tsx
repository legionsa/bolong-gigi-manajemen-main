import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTelehealth } from '@/hooks/useTelehealth';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PreCallCheck } from '@/components/telehealth/PreCallCheck';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Clock, User, ArrowLeft, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type CallState = 'pre_call' | 'waiting' | 'in_call' | 'ending';

export default function TelehealthRoom() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { userProfile } = useUserProfile();
  const {
    sessionById,
    startSession,
    endSession,
    isStartingSession,
    isEndingSession,
  } = useTelehealth();

  const { data: session, isLoading } = sessionById(sessionId || '');
  const [callState, setCallState] = useState<CallState>('pre_call');
  const [isHost, setIsHost] = useState(false);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [endCallNotes, setEndCallNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);

  // Determine if current user is the host
  useEffect(() => {
    if (session && userProfile) {
      const hostMatch = session.host_name?.toLowerCase() === userProfile.full_name?.toLowerCase();
      setIsHost(hostMatch || session.host_name === user?.email);
    }
  }, [session, userProfile, user]);

  // Timer for call duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (callState === 'in_call' && session?.started_at) {
      interval = setInterval(() => {
        const start = new Date(session.started_at).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callState, session?.started_at]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePreCallReady = async (deviceIds: { videoDeviceId: string; audioDeviceId: string }) => {
    if (!sessionId) return;

    try {
      // Start the session
      await startSession(sessionId);
      setCallState('in_call');
    } catch (error) {
      console.error('Error starting session:', error);
    }
  };

  const handlePreCallCancel = () => {
    navigate(-1);
  };

  const handleEndCall = async () => {
    if (!sessionId) return;

    try {
      await endSession({ id: sessionId, notes: endCallNotes });
      setShowEndDialog(false);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending session:', error);
    }
  };

  const handleJoinCall = () => {
    setCallState('waiting');
  };

  const getJitsiUrl = () => {
    if (!session?.room_name) return '';
    const displayName = isHost ? session.host_name : session.patient_name;
    const userInfo = `userInfo.displayName="${displayName || 'Participant'}"`;
    return `https://meet.jit.si/${session.room_name}#${userInfo}&config.startWithAudioMuted=false&config.startWithVideoMuted=false`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-on-surface-variant">Memuat sesi telehealth...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="bg-surface-container-lowest w-full max-w-md mx-4">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <VideoOff className="w-12 h-12 text-on-surface-variant mb-4" />
            <h2 className="text-xl font-bold text-on-surface mb-2">Sesi Tidak Ditemukan</h2>
            <p className="text-on-surface-variant text-center mb-4">
              Sesi telehealth yang Anda cari tidak ditemukan atau telah berakhir.
            </p>
            <Button onClick={() => navigate('/dashboard')}>
              Kembali ke Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pre-call check screen
  if (callState === 'pre_call') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="mb-4 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>

          <PreCallCheck
            onReady={handlePreCallReady}
            onCancel={handlePreCallCancel}
            displayName={isHost ? session.host_name || 'Host' : session.patient_name || 'Pasien'}
            isHost={isHost}
          />
        </div>
      </div>
    );
  }

  // Waiting room screen
  if (callState === 'waiting') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Card className="bg-surface-container-lowest w-full max-w-md mx-4">
          <CardHeader>
            <CardTitle className="text-on-surface flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Menunggu {isHost ? 'Pasien' : 'Dokter'}
            </CardTitle>
            <CardDescription>
              {isHost ? 'Pasien belum bergabung ke sesi ini.' : 'Dokter belum memulai panggilan.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-8">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <User className="w-8 h-8 text-primary" />
            </div>

            {/* Animated pulse */}
            <div className="relative mb-6">
              <div className="w-20 h-20 rounded-full bg-primary/20 animate-ping absolute inset-0" />
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center relative">
                <Video className="w-8 h-8 text-primary" />
              </div>
            </div>

            <p className="text-on-surface-variant text-center mb-6">
              {isHost
                ? 'Tunggu pasien bergabung, lalu mulai panggilan.'
                : 'Dokter akan segera memulai panggilan.'}
            </p>

            {isHost && (
              <Button
                variant="medical"
                onClick={handleJoinCall}
                disabled={isStartingSession}
                className="gap-2"
              >
                {isStartingSession ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memulai...
                  </>
                ) : (
                  <>
                    <Video className="w-4 h-4" />
                    Mulai Panggilan
                  </>
                )}
              </Button>
            )}

            <Button
              variant="outline"
              onClick={() => navigate('/dashboard')}
              className="mt-4"
            >
              Keluar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // In-call screen
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="bg-[#1a1a1a] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowEndDialog(true)}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-white font-semibold">Telehealth Call</h1>
            <p className="text-white/60 text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              {isHost ? session.patient_name : session.host_name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-white/80 text-sm font-mono">
            <Clock className="w-4 h-4 inline mr-1" />
            {formatDuration(elapsedTime)}
          </div>
        </div>
      </header>

      {/* Jitsi iframe */}
      <div className="flex-1 relative">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a] z-10">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <p className="text-white/60">Memuat panggilan...</p>
            </div>
          </div>
        )}
        <iframe
          src={getJitsiUrl()}
          allow="camera; microphone; fullscreen; display-capture; autoplay; picture-in-picture"
          className={cn(
            'w-full h-full border-0',
            !iframeLoaded && 'invisible'
          )}
          onLoad={() => setIframeLoaded(true)}
        />
      </div>

      {/* Bottom controls */}
      <div className="bg-[#1a1a1a] px-4 py-4 flex items-center justify-center gap-4">
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-12 h-12"
        >
          <Mic className="w-5 h-5" />
        </Button>
        <Button
          variant="secondary"
          size="icon"
          className="rounded-full w-12 h-12"
        >
          <Video className="w-5 h-5" />
        </Button>
        <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="rounded-full w-12 h-12"
            >
              <PhoneOff className="w-5 h-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="bg-surface-container-lowest">
            <AlertDialogHeader>
              <AlertDialogTitle>Akhiri Panggilan</AlertDialogTitle>
              <AlertDialogDescription>
                Panggilan berlangsung selama {formatDuration(elapsedTime)}.
                {isHost ? ' Tambahkan catatan jika diperlukan.' : ''}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {isHost && (
              <div className="py-4">
                <Label htmlFor="notes">Catatan Sesi (Opsional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Tambahkan catatan tentang sesi telehealth ini..."
                  value={endCallNotes}
                  onChange={(e) => setEndCallNotes(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleEndCall}
                disabled={isEndingSession}
                className="bg-error text-on-error hover:bg-error/90"
              >
                {isEndingSession ? 'Mengakhiri...' : 'Akhiri Panggilan'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}