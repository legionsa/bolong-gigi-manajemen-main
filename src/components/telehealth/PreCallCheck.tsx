import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Video, VideoOff, Mic, MicOff, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type DeviceInfo = {
  deviceId: string;
  label: string;
};

type PreCallCheckProps = {
  onReady: (deviceIds: { videoDeviceId: string; audioDeviceId: string }) => void;
  onCancel: () => void;
  displayName: string;
  isHost?: boolean;
};

export const PreCallCheck = ({ onReady, onCancel, displayName, isHost = false }: PreCallCheckProps) => {
  const [videoDevices, setVideoDevices] = useState<DeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<DeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string>('');
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string>('');
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoPreview, setVideoPreview] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionsGranted, setPermissionsGranted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getDevices = async () => {
      try {
        // First request permissions
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setPermissionsGranted(true);
        stream.getTracks().forEach(track => track.stop());

        // Then enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();

        const videoDevs: DeviceInfo[] = [];
        const audioDevs: DeviceInfo[] = [];

        devices.forEach(device => {
          if (device.kind === 'videoinput') {
            videoDevs.push({ deviceId: device.deviceId, label: device.label || `Kamera ${videoDevs.length + 1}` });
          } else if (device.kind === 'audioinput') {
            audioDevs.push({ deviceId: device.deviceId, label: device.label || `Mikrofon ${audioDevs.length + 1}` });
          }
        });

        setVideoDevices(videoDevs);
        setAudioDevices(audioDevs);

        if (videoDevs.length > 0) {
          setSelectedVideoDevice(videoDevs[0].deviceId);
        }
        if (audioDevs.length > 0) {
          setSelectedAudioDevice(audioDevs[0].deviceId);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error accessing media devices:', err);
        setError('Tidak dapat mengakses kamera atau mikrofon. Pastikan izin telah diberikan.');
        setIsLoading(false);
      }
    };

    getDevices();

    return () => {
      if (videoPreview) {
        videoPreview.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const startPreview = async () => {
      if (videoPreview) {
        videoPreview.getTracks().forEach(track => track.stop());
      }

      if (!selectedVideoDevice || !permissionsGranted) return;

      try {
        const constraints: MediaStreamConstraints = {
          video: { deviceId: { exact: selectedVideoDevice } },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setVideoPreview(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error starting video preview:', err);
      }
    };

    startPreview();
  }, [selectedVideoDevice, permissionsGranted]);

  const handleToggleVideo = () => {
    if (videoPreview) {
      videoPreview.getTracks().forEach(track => {
        if (track.kind === 'video') {
          track.enabled = !videoEnabled;
        }
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const handleToggleAudio = () => {
    setAudioEnabled(!audioEnabled);
  };

  const handleReady = () => {
    onReady({
      videoDeviceId: selectedVideoDevice,
      audioDeviceId: selectedAudioDevice,
    });
  };

  if (isLoading) {
    return (
      <Card className="bg-surface-container-lowest w-full max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-primary animate-spin mb-4" />
          <p className="text-on-surface-variant">Memeriksa perangkat...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-surface-container-lowest w-full max-w-lg mx-auto">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-error mb-4" />
          <p className="text-on-surface text-center mb-4">{error}</p>
          <Button variant="outline" onClick={onCancel}>
            Kembali
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface-container-lowest w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="text-on-surface flex items-center gap-2">
          <Video className="w-5 h-5" />
          Persiapan Telehealth
        </CardTitle>
        <CardDescription>
          {isHost ? 'Host' : 'Pasien'}: {displayName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              'w-full h-full object-cover',
              !videoEnabled && 'hidden'
            )}
          />
          {!videoEnabled && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface-container-high">
              <VideoOff className="w-12 h-12 text-on-surface-variant" />
            </div>
          )}

          {/* Video toggle button */}
          <Button
            size="icon"
            variant={videoEnabled ? 'secondary' : 'destructive'}
            className="absolute bottom-3 right-3 rounded-full"
            onClick={handleToggleVideo}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </Button>
        </div>

        {/* Device Selectors */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-device">Kamera</Label>
            <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
              <SelectTrigger id="video-device">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {videoDevices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-device">Mikrofon</Label>
            <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
              <SelectTrigger id="audio-device">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {audioDevices.map(device => (
                  <SelectItem key={device.deviceId} value={device.deviceId}>
                    {device.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Audio Test */}
        <div className="flex items-center gap-3 p-3 bg-surface-container-low rounded-xl">
          <Button
            size="icon"
            variant={audioEnabled ? 'secondary' : 'destructive'}
            className="rounded-full"
            onClick={handleToggleAudio}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </Button>
          <div>
            <p className="text-sm font-medium text-on-surface">Mikrofon {audioEnabled ? 'Aktif' : 'Nonaktif'}</p>
            <p className="text-xs text-on-surface-variant">
              {audioEnabled ? 'Suara Anda akan terdengar dalam panggilan' : 'Suara Anda tidak akan terdengar'}
            </p>
          </div>
          {audioEnabled && <Check className="w-4 h-4 text-primary ml-auto" />}
        </div>

        {/* Permission status */}
        {permissionsGranted && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Check className="w-4 h-4" />
            <span>Izin kamera dan mikrofon telah diberikan</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onCancel} className="flex-1">
            Batal
          </Button>
          <Button variant="medical" onClick={handleReady} className="flex-1 gap-2">
            <Video className="w-4 h-4" />
            {isHost ? 'Mulai Panggilan' : 'Gabung Panggilan'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};