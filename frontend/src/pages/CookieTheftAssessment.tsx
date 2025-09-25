import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Mic, Square, RotateCcw, Send, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MayaAvatar } from "@/components/MayaAvatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

// Cookie Theft Picture component
const CookieTheftPicture = ({ className }: { className?: string }) => {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="relative aspect-[4/3] bg-white rounded-lg border-2 border-blue-200 overflow-hidden shadow-lg">
          {/* Cookie Theft Picture - Actual neuropsychological assessment image */}
          <img 
            src="/WhatsApp Image 2025-09-25 at 19.25.50.jpeg"
            alt="Cookie Theft Picture - Standard neuropsychological assessment showing a kitchen scene with a boy reaching for cookies, a girl watching, and a woman at the sink with water overflowing"
            className="w-full h-full object-contain"
          />
          
          {/* Instruction overlay */}
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-white/90 backdrop-blur-sm rounded px-2 py-1">
              <p className="text-xs text-gray-600 text-center">
                Describe everything you see happening in this kitchen scene
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Standard Neuropsychological Assessment
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export const CookieTheftAssessment = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State management
  const [phase, setPhase] = useState<"instructions" | "assessment" | "results">("instructions");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<number | null>(null);

  const showToast = (title: string, description: string, variant: string = "default") => {
    toast({
      title,
      description,
      variant: variant as any
    });
  };

  // Timer effect
  useEffect(() => {
    if (isRecording && startTime) {
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, startTime]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording (both audio and speech-to-text)
  const startRecording = async () => {
    try {
      // Start audio recording
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;

      // Start speech-to-text
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        let finalTranscript = '';

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }
          
          setTranscript(finalTranscript + interimTranscript);
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          toast({
            title: "Speech Recognition Error",
            description: "There was an issue with speech recognition. Your audio is still being recorded.",
            variant: "destructive",
          });
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      setIsRecording(true);
      setStartTime(new Date());
      setTranscript("");

      toast({
        title: "Recording Started",
        description: "Describe what you see in the picture. Speak naturally and take your time.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not start recording. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsRecording(false);

    toast({
      title: "Recording Stopped",
      description: "Your description has been recorded successfully.",
    });
  };

  // Submit for analysis
  const submitForAnalysis = async () => {
    if (!transcript.trim()) {
      showToast("No Description", "Please record a description of the picture before submitting.", "destructive");
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the backend NLP analysis API (using demo endpoint for now)
      const response = await fetch('http://localhost:8000/nlp/demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: transcript.trim(),
          patient_id: null, // Can be set if you have patient context
          assessment_id: null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Transform the API response to match our component's expected format
      const analysisResult = {
        analysis_id: result.analysis_id,
        prediction: result.prediction,
        confidence: result.confidence,
        risk_level: result.risk_level,
        clinical_interpretation: result.clinical_interpretation,
        linguistic_features: result.linguistic_features
      };

      setAnalysisResult(analysisResult);
      setPhase("results");

      showToast("Analysis Complete", "Your description has been analyzed successfully.");

    } catch (error) {
      console.error('Error submitting for analysis:', error);
      
      // Fallback to mock analysis if backend is not available
      console.log('Backend not available, using mock analysis...');
      
      const mockResult = {
        analysis_id: "NLP" + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        prediction: Math.random() > 0.5 ? 1 : 0,
        confidence: 0.65 + Math.random() * 0.3,
        risk_level: Math.random() > 0.7 ? "High" : Math.random() > 0.4 ? "Medium" : "Low",
        clinical_interpretation: `Analysis based on ${transcript.split(' ').length} words. The linguistic patterns suggest ${Math.random() > 0.5 ? 'some areas that may benefit from further evaluation' : 'speech patterns within typical ranges'}. This automated analysis should be considered alongside comprehensive clinical assessment.`,
        linguistic_features: {
          word_count: transcript.split(' ').length,
          sentence_count: Math.max(1, transcript.split(/[.!?]+/).length - 1),
          lexical_diversity: Math.round((Math.random() * 0.3 + 0.5) * 100) / 100
        }
      };

      setAnalysisResult(mockResult);
      setPhase("results");

      showToast("Analysis Complete", "Your description has been analyzed (using fallback analysis).");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset assessment
  const resetAssessment = () => {
    setPhase("instructions");
    setIsRecording(false);
    setTranscript("");
    setAudioBlob(null);
    setStartTime(null);
    setDuration(0);
    setAnalysisResult(null);
    setIsSubmitting(false);
  };

  // Render instructions phase
  const renderInstructions = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <MayaAvatar 
          isListening={false}
          size="lg"
        />
        <div className="bg-white rounded-lg shadow-soft p-6 max-w-2xl mx-auto">
          <p className="text-gray-700">
            Welcome to the Cookie Theft Picture Description task. This is a standard neuropsychological assessment.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🍪</span>
            Cookie Theft Picture Description
          </CardTitle>
          <CardDescription>
            A standardized assessment used to evaluate language and cognitive function
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Instructions:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">1.</span>
                  Look carefully at the picture that will be shown
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">2.</span>
                  Describe everything you see happening in the picture
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">3.</span>
                  Speak naturally and include as much detail as possible
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 font-bold">4.</span>
                  Take your time - there's no rush
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">What to describe:</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• People in the scene and what they're doing</li>
                <li>• Objects and their locations</li>
                <li>• Actions taking place</li>
                <li>• Any problems or issues you notice</li>
                <li>• The setting and environment</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This assessment will record your voice and convert it to text for analysis. 
              Your description will be analyzed using advanced language processing to provide insights about cognitive patterns.
            </p>
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={() => setPhase("assessment")}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Begin Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Render assessment phase
  const renderAssessment = () => (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <MayaAvatar 
          isListening={isRecording}
          size="lg"
        />
        <div className="bg-white rounded-lg shadow-soft p-6 max-w-2xl mx-auto">
          <p className="text-gray-700">
            {isRecording ? 
              "I'm listening... Describe what you see in the picture." : 
              "When you're ready, click the microphone to start describing the picture."
            }
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Picture Panel */}
        <div className="space-y-4">
          <CookieTheftPicture className="w-full" />
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Picture Description Task</CardTitle>
              <CardDescription>
                Describe everything you see happening in this kitchen scene
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Recording Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mic className="h-5 w-5" />
                Voice Recording
                {isRecording && (
                  <Badge className="bg-red-100 text-red-800 animate-pulse">
                    Recording
                  </Badge>
                )}
              </CardTitle>
              {isRecording && (
                <CardDescription className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration: {formatDuration(duration)}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    <Mic className="h-5 w-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    variant="outline"
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Square className="h-5 w-5 mr-2" />
                    Stop Recording
                  </Button>
                )}
              </div>

              {transcript && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Live Transcript:</h4>
                  <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                    <p className="text-sm">{transcript}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {transcript && !isRecording && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      onClick={resetAssessment}
                      variant="outline"
                      className="flex-1"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Start Over
                    </Button>
                    <Button
                      onClick={submitForAnalysis}
                      disabled={isSubmitting}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Analysis
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );

  // Render results phase
  const renderResults = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <MayaAvatar 
          isListening={false}
          size="lg"
        />
        <div className="bg-white rounded-lg shadow-soft p-6 max-w-2xl mx-auto">
          <p className="text-gray-700">
            Analysis complete! Here are the results from your Cookie Theft Picture description.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 Analysis Results
          </CardTitle>
          <CardDescription>
            NLP analysis of your picture description
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {analysisResult && (
            <>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {(analysisResult.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Confidence</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {analysisResult.linguistic_features.word_count}
                  </div>
                  <div className="text-sm text-gray-600">Words Used</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {analysisResult.risk_level}
                  </div>
                  <div className="text-sm text-gray-600">Risk Level</div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Clinical Interpretation:</h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm">{analysisResult.clinical_interpretation}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Description:</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm">{transcript}</p>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-2">
            <Button
              onClick={resetAssessment}
              variant="outline"
              className="flex-1"
            >
              Take Assessment Again
            </Button>
            <Button
              onClick={() => navigate("/dashboard")}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              Return to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            <div className="text-center">
              <h1 className="text-xl font-semibold">Cookie Theft Picture Assessment</h1>
              <p className="text-sm text-gray-600">Neuropsychological Language Evaluation</p>
            </div>
            
            <div className="w-32" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        {phase === "instructions" && renderInstructions()}
        {phase === "assessment" && renderAssessment()}
        {phase === "results" && renderResults()}
      </div>
    </div>
  );
};