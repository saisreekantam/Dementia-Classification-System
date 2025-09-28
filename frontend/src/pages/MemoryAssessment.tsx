import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";

const WORD_LIST = [
  "APPLE", "SHIRT", "BOOK", "TELEPHONE", "GRASS",
  "FLOWER", "FIRE", "COFFEE", "MOVIE", "CLOCK"
];

type AssessmentPhase =
  | "intro"
  | "instructions"
  | "immediate-recall"
  | "distraction"
  | "delayed-recall"
  | "results";

const numberMap: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4,
  five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20
};

interface MemoryAssessmentProps {
  onComplete?: (results: any) => void;
  isSequential?: boolean;
}

export const MemoryAssessment: React.FC<MemoryAssessmentProps> = ({ onComplete, isSequential = false }) => {
  const [phase, setPhase] = useState<AssessmentPhase>(
   "intro"
  );
  const [currentStep, setCurrentStep] = useState(
     0
  );
  const [isListening, setIsListening] = useState(false);
  const [scores, setScores] = useState({
    immediateRecall: null as number | null,
    delayedRecall: null as number | null,
    distractionTask: null as number | null
  });
  const [wordsShown, setWordsShown] = useState(false);
  const [interimWords, setInterimWords] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [toast, setToast] = useState<{title: string; description: string; variant?: string} | null>(null);

  const [results, setResults] = useState({
    immediateRecall: [] as string[],
    distractionNumbers: [] as string[],
    delayedRecall: [] as string[],
  });

  const recognitionRef = useRef<any>(null);

  const phaseProgress = {
    intro: 10,
    instructions: 20,
    "immediate-recall": 40,
    distraction: 60,
    "delayed-recall": 80,
    results: 100,
  };

  const mayaDialogue = {
    intro:
      "Hi! I'm Maya, and I'm here to do some fun brain exercises with you today. This memory assessment will help us understand how your mind processes and recalls information. Are you ready to begin?",
    instructions:
      "Let's start with a memory game. I'm going to show you a list of 10 words, and I'd like you to repeat back as many as you can remember. Don't worry about the order - just tell me any words you remember. Take your time to read through them first.",
    "immediate-recall":
      "Great! Now, can you tell me which words you remember from the list? Speak clearly and take your time.",
    distraction:
      "Excellent work! Now let's do a quick counting exercise to give your mind a brief break. Can you count backwards from 20 to 1?",
    "delayed-recall":
      "Perfect! Now I'd like to go back to those words I showed you earlier. Without looking at them again, can you tell me any of those words you still remember?",
    results:
      "Wonderful job completing the assessment! Your responses have been recorded and analyzed to provide insights about your memory performance.",
  };

  useEffect(() => {
    if (phase === "immediate-recall" || phase === "delayed-recall" || phase === "distraction") {
      setStartTime(new Date());
      setHasRecorded(false);
    }
  }, [phase]);

  // Handle completion for sequential assessments
  useEffect(() => {
    if (phase === "results" && onComplete && isSequential) {
      const delayedRecallCount = results.delayedRecall?.filter(word => 
        WORD_LIST.some(w => w.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(w.toLowerCase()))
      ).length || 0;

      const assessmentResults = {
        delayedRecall: {
          correctWords: delayedRecallCount,
          totalWords: results.delayedRecall?.length || 0,
          wordList: results.delayedRecall || []
        },
        immediateRecall: {
          correctWords: results.immediateRecall?.filter(word => 
            WORD_LIST.some(w => w.toLowerCase().includes(word.toLowerCase()) || word.toLowerCase().includes(w.toLowerCase()))
          ).length || 0,
          totalWords: results.immediateRecall?.length || 0,
          wordList: results.immediateRecall || []
        },
        distractionTask: {
          numbers: results.distractionNumbers || [],
          accuracy: scores.distractionTask || 0
        },
        scores,
        completedAt: new Date()
      };
      
      onComplete(assessmentResults);
    }
  }, [phase]);
  useEffect(() => {
    localStorage.setItem("memoryPhase", phase);
    localStorage.setItem("memoryStep", String(currentStep));
  }, [phase, currentStep]);
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (title: string, description: string, variant: string = "default") => {
    setToast({ title, description, variant });
  };

  // ---- Speech-to-Text Logic ----
  const startSTT = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast(
        "Not Supported",
        "Speech Recognition only works in Chrome/Edge browsers.",
        "destructive"
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true; // Enable interim results for continuous listening
    recognition.continuous = true; // Keep listening until manually stopped
    recognition.maxAlternatives = 1;

    recognition.onstart = () => { console.log("Starting recording..."); setIsListening(true) };
    let finalTranscript = '';

    let finalResults = { immediateRecall: [], distractionNumbers: [], delayedRecall: [] };

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

    const fullText = (finalTranscript + interimTranscript).toLowerCase().trim();
    if (fullText) {
      if (phase === "immediate-recall") {
        const updatedWords = fullText.split(/\s+/);
        finalResults.immediateRecall = updatedWords;

        setInterimWords(updatedWords);
        setResults(prev => ({
          ...prev,
          immediateRecall: updatedWords
        }));

      } else if (phase === "distraction") {
        const nums = fullText
          .split(/\s+/)
          .map((w) => numberMap[w] ?? w)
          .filter(Boolean)
          .map(String);

        finalResults.distractionNumbers = nums;

        setInterimWords(nums);
        setResults(prev => ({
          ...prev,
          distractionNumbers: nums
        }));

      } else if (phase === "delayed-recall") {
        const updatedWords = fullText.split(/\s+/);
        finalResults.delayedRecall = updatedWords;

        setInterimWords(updatedWords);
        setResults(prev => ({
          ...prev,
          delayedRecall: updatedWords
        }));
      }
    }

  }

    recognition.onend = () => {
      setIsListening(false);
      setHasRecorded(true);

      const currentResults = phase === "immediate-recall" ? finalResults.immediateRecall.join(' ') :
                            phase === "distraction" ? finalResults.distractionNumbers.join(' ') :
                            finalResults.delayedRecall.join(' ');
      if (currentResults.trim()) {
        evaluateRecall(currentResults);
      }
    };


    recognition.start();
    recognitionRef.current = recognition;
  };

  const evaluateRecall = (spokenText: string, phaseType?: string) => {
    const currentPhase = phaseType || phase;
    console.log(currentPhase);
    if (currentPhase === "immediate-recall" || currentPhase === "delayed-recall") {
      const spokenWords = spokenText
        .split(/\s+/)
        .map((w) => w.replace(/[^A-Z]/gi, "").toUpperCase());

      let correct = 0;
      WORD_LIST.forEach((word) => {
        if (spokenWords.includes(word)) correct++;
      });

      const scorePercent = Math.round((correct / WORD_LIST.length) * 100);
      console.log("Score percent 197",scorePercent)
      setScores(prev => ({
        ...prev,
        [currentPhase === "immediate-recall" ? "immediateRecall" : "delayedRecall"]: scorePercent
      }));

      showToast(
        "Recall Results",
        `You remembered ${correct}/${WORD_LIST.length} words (${scorePercent}%).`
      );
    } else if (currentPhase === "distraction") {
      // Enhanced number parsing for counting backwards from 20 to 1
      console.log("Raw spoken text:", spokenText);
      
      const words = spokenText.split(/\s+/);
      const spokenNumbers: number[] = [];
      
      // Enhanced number parsing to handle various speech patterns
      for (const word of words) {
        const cleanWord = word.toLowerCase().replace(/[^\w]/g, '');
        
        // Case 1: Map word to number (like "nineteen")
        if (numberMap[cleanWord] !== undefined) {
          spokenNumbers.push(numberMap[cleanWord]);
        }
        // Case 2: Handle digits (like "19" or "191817")
        else if (/^\d+$/.test(cleanWord)) {
          if (cleanWord.length > 2) {
            // Split into individual digits for concatenated sequences
            cleanWord.split('').forEach(d => spokenNumbers.push(parseInt(d)));
          } else {
            // Normal 1–2 digit number
            spokenNumbers.push(parseInt(cleanWord));
          }
        }
      }
      
      // Filter to only include numbers in valid range (1-20)
      const filteredNumbers = spokenNumbers.filter(n => n >= 1 && n <= 20);
      
      console.log("Parsed numbers:", filteredNumbers);

      // Expected sequence: 20, 19, 18, ..., 1
      const expectedSequence = Array.from({length: 20}, (_, i) => 20 - i);
      
      // Count unique numbers present (avoid duplicates inflating score)
      const uniqueNumbers = [...new Set(filteredNumbers)];
      const numbersPresent = uniqueNumbers.filter(num => expectedSequence.includes(num)).length;
      
      // Score based only on presence of correct numbers, capped at 100%
      const totalScore = Math.min(100, Math.round((numbersPresent / 20) * 100));
      console.log("Total Score 248",totalScore);
      setScores(prev => ({
        ...prev,
        distractionTask: totalScore
      }));
      console.log(scores);
      showToast(
        "Counting Results",
        `Found ${numbersPresent}/20 numbers (${totalScore}%).`
      );
    }
  };

  const nextPhase = () => {
    const phases: AssessmentPhase[] = [
      "intro",
      "instructions",
      "immediate-recall",
      "distraction",
      "delayed-recall",
      "results",
    ];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
      setCurrentStep(currentStep + 1);
    }
  };

  const restartAssessment = () => {
    setPhase("intro");
    setCurrentStep(0);
    setWordsShown(false);
    setResults({
      immediateRecall: [],
      distractionNumbers: [],
      delayedRecall: [],
    });
    setScores({
      immediateRecall: null,
      delayedRecall: null,
      distractionTask: null
    });
    setIsListening(false);
    setStartTime(null);
    setHasRecorded(false);
  };

  // Helper function to check if current phase has any recorded data
  const hasRecordedData = () => {
    if (phase === "immediate-recall") {
      return results.immediateRecall.length > 0;
    } else if (phase === "distraction") {
      return results.distractionNumbers.length > 0;
    } else if (phase === "delayed-recall") {
      return results.delayedRecall.length > 0;
    }
    return false;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <div className={`p-4 rounded-lg shadow-lg ${
            toast.variant === 'destructive' 
              ? 'bg-red-100 border border-red-300 text-red-800' 
              : 'bg-blue-100 border border-blue-300 text-blue-800'
          }`}>
            <h4 className="font-semibold">{toast.title}</h4>
            <p className="text-sm">{toast.description}</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
            <button
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={() => window.location.assign("/")}
            >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
            </button>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium">
            Memory Recall Test
          </span>
        </div>

        {/* Progress */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">
              Assessment Progress
            </span>
            <span className="text-sm text-gray-600">
              {phaseProgress[phase]}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${phaseProgress[phase]}%` }}
            ></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Maya Interaction Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-lg">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-lg">M</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Maya's Instructions</h3>
                    <p className="text-sm text-gray-600">Your AI cognitive health assistant</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-gray-800 leading-relaxed">
                    {mayaDialogue[phase]}
                  </p>
                </div>

                {/* Instructions Phase */}
                {phase === "instructions" && (
                  <div className="space-y-4">
                    {!wordsShown ? (
                      <button
                        onClick={() => setWordsShown(true)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                      >
                        Show Word List
                      </button>
                    ) : (
                      <div>
                        <div className="grid grid-cols-2 gap-3 mb-4 p-4 bg-blue-50 rounded-lg">
                          {WORD_LIST.map((word, index) => (
                            <div
                              key={index}
                              className="text-center text-blue-700 font-medium py-2"
                            >
                              {word}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={nextPhase}
                          className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                        >
                          I've Read the Words
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Recall / Distraction Phase */}
                {(phase === "immediate-recall" ||
                  phase === "delayed-recall" ||
                  phase === "distraction") && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={startSTT}
                        disabled={isListening}
                        className={`font-medium py-3 px-4 rounded-lg transition-colors ${
                          isListening 
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        }`}
                      >
                        Start Speaking
                      </button>
                      <button
                        onClick={() => recognitionRef.current?.stop()}
                        disabled={!isListening}
                        className={`font-medium py-3 px-4 rounded-lg transition-colors ${
                          !isListening 
                            ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700 text-white'
                        }`}
                      >
                        Stop Recording
                      </button>
                    </div>

                    {/* Scrollable boxes for each test */}
                    {phase === "immediate-recall" && results.immediateRecall.length > 0 && (
                      <div className="p-3 bg-gray-100 rounded-md max-h-40 overflow-y-auto mt-2">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Your words:</h4>
                        {results.immediateRecall.map((item, idx) => (
                          <div key={idx} className="text-gray-800">{item.toUpperCase()}</div>
                        ))}
                      </div>
                    )}

                    {phase === "distraction" && results.distractionNumbers.length > 0 && (
                      <div className="p-3 bg-gray-100 rounded-md max-h-40 overflow-y-auto mt-2">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Numbers spoken:</h4>
                        {results.distractionNumbers.map((item, idx) => (
                          <div key={idx} className="text-gray-800">{item}</div>
                        ))}
                      </div>
                    )}

                    {phase === "delayed-recall" && results.delayedRecall.length > 0 && (
                      <div className="p-3 bg-gray-100 rounded-md max-h-40 overflow-y-auto mt-2">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Your words:</h4>
                        {results.delayedRecall.map((item, idx) => (
                          <div key={idx} className="text-gray-800">{item.toUpperCase()}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Intro Phase */}
                {phase === "intro" && (
                  <button
                    onClick={nextPhase}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                  >
                    Begin Assessment
                  </button>
                )}

                {/* Redo button for current phase */}
                {(phase === "immediate-recall" ||
                  phase === "delayed-recall" ||
                  phase === "distraction") && hasRecordedData() && (
                    <button
                      onClick={() => {
                        // Clear current phase data
                        setResults(prev => ({
                          ...prev,
                          [phase === "immediate-recall" ? "immediateRecall" : 
                           phase === "distraction" ? "distractionNumbers" : "delayedRecall"]: []
                        }));
                        setHasRecorded(false);
                        // Clear score for current phase
                        setScores(prev => ({
                          ...prev,
                          [phase === "immediate-recall" ? "immediateRecall" : 
                           phase === "distraction" ? "distractionTask" : "delayedRecall"]: null
                        }));
                      }}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Redo This Task
                    </button>
                  )}

                {/* Continue/Skip button after speaking phases */}
                {(phase === "immediate-recall" ||
                  phase === "delayed-recall" ||
                  phase === "distraction") && (
                    <button
                      onClick={nextPhase}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors mt-4 flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      {hasRecordedData() ? "Continue" : "Skip"}
                    </button>
                  )}
                  {isListening && interimWords.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-md max-h-32 overflow-y-auto mt-2 border border-blue-200">
                      <h4 className="font-medium text-sm text-blue-700 mb-2">Heard so far:</h4>
                      <div className="flex flex-wrap gap-2">
                        {interimWords.map((word, idx) => (
                          <span key={idx} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs">{word.toUpperCase()}</span>
                        ))}
                      </div>
                    </div>
                  )}
                {/* Results Phase */}
                {phase === "results" && (
                  <div className="space-y-4">
                    {/* Overall Scores Summary */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Assessment Scores</h3>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Immediate Recall:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {scores.immediateRecall !== null ? `${scores.immediateRecall}%` : 'Skipped'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Counting Task:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {scores.distractionTask !== null ? `${scores.distractionTask}%` : 'Skipped'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Delayed Recall:</span>
                          <span className="text-lg font-bold text-blue-600">
                            {scores.delayedRecall !== null ? `${scores.delayedRecall}%` : 'Skipped'}
                          </span>
                        </div>
                        <hr className="my-2" />
                        <div className="flex justify-between items-center">
                          <span className="font-semibold">Overall Memory Score:</span>
                          <span className="text-xl font-bold text-green-600">
                            {(() => {
                              const validScores = [scores.immediateRecall, scores.delayedRecall].filter(s => s !== null);
                              return validScores.length > 0 
                                ? `${Math.round(validScores.reduce((a, b) => (a || 0) + (b || 0), 0) / validScores.length)}%`
                                : 'N/A';
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white p-3 border border-gray-300 rounded-lg">
                      <h4 className="font-semibold mb-2">Immediate Recall:</h4>
                      {results.immediateRecall.length > 0 ? (
                        <div className="space-y-1">
                          {results.immediateRecall.map((w, i) => (
                            <div key={i} className="text-gray-700">{w.toUpperCase()}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No response recorded</div>
                      )}
                    </div>

                    <div className="bg-white p-3 border border-gray-300 rounded-lg">
                      <h4 className="font-semibold mb-2">Backward Counting:</h4>
                      {results.distractionNumbers.length > 0 ? (
                        <div className="space-y-1">
                          {results.distractionNumbers.map((n, i) => (
                            <div key={i} className="text-gray-700">{n}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No response recorded</div>
                      )}
                    </div>

                    <div className="bg-white p-3 border border-gray-300 rounded-lg">
                      <h4 className="font-semibold mb-2">Delayed Recall:</h4>
                      {results.delayedRecall.length > 0 ? (
                        <div className="space-y-1">
                          {results.delayedRecall.map((w, i) => (
                            <div key={i} className="text-gray-700">{w.toUpperCase()}</div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No response recorded</div>
                      )}
                    </div>

                    {!isSequential && (
                      <button
                        onClick={restartAssessment}
                        className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors mt-3 flex items-center justify-center gap-2 border border-gray-300"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restart Assessment
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Information Panel */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">About This Test</h3>
                <p className="text-sm text-gray-600">Memory Recall Assessment Details</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    What we're measuring:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Short-term memory capacity</li>
                    <li>• Memory retention over time</li>
                    <li>• Speech patterns and fluency</li>
                    <li>• Cognitive processing speed</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Tips for best performance:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Take your time to read carefully</li>
                    <li>• Don't worry about perfect recall</li>
                    <li>• Speak clearly and naturally</li>
                    <li>• Say any words you remember</li>
                    <li>• You can skip any section if needed</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Current Phase</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <span className="text-gray-900 font-medium capitalize">
                    {phase.replace("-", " ")}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded border border-gray-300">
                    Step {currentStep + 1} of 6
                  </span>
                </div>
                {startTime && (
                  <p className="text-sm text-gray-600 mt-2">
                    Started: {startTime.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}