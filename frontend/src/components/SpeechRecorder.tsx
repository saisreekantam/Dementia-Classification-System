import { useState, useRef, useEffect } from "react";
import { Mic, MicOff, Square, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MayaAvatar } from "@/components/MayaAvatar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SpeechRecorderProps {
  isListening: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  audioBlob?: Blob | null;
  className?: string;
}

export const SpeechRecorder = ({
  isListening,
  onStartRecording,
  onStopRecording,
  audioBlob,
  className
}: SpeechRecorderProps) => {
  const [audioURL, setAudioURL] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioURL(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [audioBlob]);

  const handlePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          toast({
            title: "Playback Error",
            description: "Unable to play the recorded audio.",
            variant: "destructive"
          });
        });
    }
  };

  return (
    <Card className={cn("border-border/50", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-6">
          <MayaAvatar size="lg" isListening={isListening} />
          
          <div className="text-center">
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {isListening ? "Listening..." : "Ready to Record"}
            </h3>
            <p className="text-muted-foreground">
              {isListening 
                ? "Maya is listening to your response" 
                : "Click the microphone to start recording"
              }
            </p>
          </div>

          {isListening && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-soft" />
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-soft" style={{ animationDelay: "0.1s" }} />
              <div className="w-2 h-2 bg-success rounded-full animate-pulse-soft" style={{ animationDelay: "0.2s" }} />
            </div>
          )}

          <div className="flex gap-4">
            {!isListening ? (
              <Button
                onClick={onStartRecording}
                variant="medical"
                size="lg"
                className="rounded-full"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Recording
              </Button>
            ) : (
              <Button
                onClick={onStopRecording}
                variant="destructive"
                size="lg"
                className="rounded-full"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Recording
              </Button>
            )}

            {audioURL && (
              <Button
                onClick={handlePlayback}
                variant="outline"
                size="lg"
                className="rounded-full"
              >
                {isPlaying ? <MicOff className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            )}
          </div>

          {audioURL && (
            <audio
              ref={audioRef}
              src={audioURL}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};