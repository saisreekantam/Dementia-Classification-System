import { useState, useEffect, useRef } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Clock, Play, Pause } from "lucide-react";
import { MayaAvatar } from "@/components/MayaAvatar";

// Test configurations based on verbal.txt specifications
const SEMANTIC_CATEGORIES = [
  { name: "Animals", instruction: "Name as many animals as you can think of", examples: ["dog", "cat", "elephant"] },
  { name: "Fruits", instruction: "Name as many fruits as you can think of", examples: ["apple", "banana", "orange"] }
];

const PHONEMIC_LETTERS = [
  { letter: "F", instruction: "Say words that begin with the letter F", examples: ["fish", "forest", "friend"] },
  { letter: "A", instruction: "Say words that begin with the letter A", examples: ["apple", "animal", "army"] },
  { letter: "S", instruction: "Say words that begin with the letter S", examples: ["sun", "story", "street"] }
];

type TestPhase =
  | "intro"
  | "instructions"
  | "semantic-animals"
  | "semantic-fruits"
  | "phonemic-f"
  | "phonemic-a"
  | "phonemic-s"
  | "results";

interface WordEntry {
  word: string;
  timestamp: number;
  timeFromStart: number;
}

interface TestResults {
  semanticAnimals: WordEntry[];
  semanticFruits: WordEntry[];
  phonemicF: WordEntry[];
  phonemicA: WordEntry[];
  phonemicS: WordEntry[];
}

interface AnalysisResults {
  totalWords: number;
  validWords: number;
  repetitions: number;
  errors: number;
  clustering: number;
  switching: number;
  averageResponseTime: number;
  temporalDistribution: number[];
}

interface VerbalFluencyAssessmentProps {
  onComplete?: (results: any) => void;
  isSequential?: boolean;
}

export const VerbalFluencyAssessment: React.FC<VerbalFluencyAssessmentProps> = ({ onComplete, isSequential = false }) => {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [currentStep, setCurrentStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(60);
  const [isTestActive, setIsTestActive] = useState(false);
  const [testStartTime, setTestStartTime] = useState<Date | null>(null);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [toast, setToast] = useState<{title: string; description: string; variant?: string} | null>(null);

  const [results, setResults] = useState<TestResults>({
    semanticAnimals: [],
    semanticFruits: [],
    phonemicF: [],
    phonemicA: [],
    phonemicS: []
  });

  const [analysis, setAnalysis] = useState<{[key: string]: AnalysisResults}>({});

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const phaseProgress = {
    intro: 5,
    instructions: 15,
    "semantic-animals": 30,
    "semantic-fruits": 45,
    "phonemic-f": 60,
    "phonemic-a": 75,
    "phonemic-s": 90,
    results: 100,
  };

  const mayaDialogue = {
    intro: "Hi! I'm Maya, and today we'll be doing a Verbal Fluency Test. This assessment helps us understand your language abilities and cognitive flexibility. It's like a word game where you'll name words from different categories and starting letters!",
    instructions: "Here's how it works: I'll give you a category or a letter, and you'll have 60 seconds to say as many words as you can think of. Speak clearly, and don't worry about repeating words - just say whatever comes to mind!",
    "semantic-animals": "Great! Let's start with animals. You have 60 seconds to name as many animals as you can think of. Ready? The timer will begin when you press start.",
    "semantic-fruits": "Excellent work! Now let's try fruits. Name as many fruits as you can think of in the next 60 seconds.",
    "phonemic-f": "Perfect! Now we'll switch to letter sounds. Say as many words as you can that begin with the letter F. Remember, no proper names or repeated words with different endings.",
    "phonemic-a": "Great job! Now words that begin with the letter A. You have another 60 seconds.",
    "phonemic-s": "Almost done! Last one - words that begin with the letter S. Give me as many as you can!",
    results: "Fantastic! You've completed all the verbal fluency tasks. Your responses have been analyzed for fluency patterns, word variety, and cognitive flexibility. Let's look at your results!"
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (isTestActive && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isTestActive) {
      stopTest();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, isTestActive]);

  // Handle completion for sequential assessments
  useEffect(() => {
    if (phase === "results" && onComplete && isSequential) {
      // Calculate total correct words from all categories (semantic animals is primary)
      const semanticAnimalsCount = analysis.semanticAnimals?.validWords || 0;
      const totalWords = Object.values(analysis).reduce((sum, result) => sum + (result?.validWords || 0), 0);
      
      const assessmentResults = {
        correctWords: semanticAnimalsCount, // Primary metric per finalscore.txt
        totalWords,
        semanticAnimals: analysis.semanticAnimals,
        semanticFruits: analysis.semanticFruits,
        phonemicF: analysis.phonemicF,
        phonemicA: analysis.phonemicA,
        phonemicS: analysis.phonemicS,
        completedAt: new Date()
      };
      
      onComplete(assessmentResults);
    }
  }, [phase, onComplete, isSequential, analysis]);

  const showToast = (title: string, description: string, variant: string = "default") => {
    setToast({ title, description, variant });
  };

  const getCurrentPhaseKey = (): keyof TestResults => {
    switch (phase) {
      case "semantic-animals": return "semanticAnimals";
      case "semantic-fruits": return "semanticFruits";
      case "phonemic-f": return "phonemicF";
      case "phonemic-a": return "phonemicA";
      case "phonemic-s": return "phonemicS";
      default: return "semanticAnimals"; // Default fallback
    }
  };

  const startTest = () => {
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
    recognition.interimResults = false; // Set to false for cleaner final results
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    let testStart: Date;

    recognition.onstart = () => {
      setIsListening(true);
      setIsTestActive(true);
      setTimeRemaining(60);
      testStart = new Date();
      setTestStartTime(testStart);

      // Clear existing words for this phase
      const phaseKey = getCurrentPhaseKey();
      setResults(prev => ({
        ...prev,
        [phaseKey]: []
      }));
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      const words = transcript.trim().toLowerCase().split(/\s+/);
      const currentTime = new Date();
      const timeFromStart = currentTime.getTime() - testStart.getTime();
      
      const newWordEntries: WordEntry[] = [];

      words.forEach(word => {
        const cleanWord = word.replace(/[^\w]/g, '');
        if (cleanWord.length > 1) {
          newWordEntries.push({
            word: cleanWord,
            timestamp: currentTime.getTime(),
            timeFromStart: timeFromStart
          });
        }
      });
      
      if (newWordEntries.length > 0) {
        const phaseKey = getCurrentPhaseKey();
        setResults(prev => ({
          ...prev,
          [phaseKey]: [...prev[phaseKey], ...newWordEntries]
        }));
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      showToast(
        "Recognition Error",
        "There was an issue with speech recognition.",
        "destructive"
      );
    };

    // onend now only handles cleanup if the mic stops unexpectedly
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };
  
  const stopTest = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    
    const currentPhaseKey = getCurrentPhaseKey();
    const wordsForPhase = results[currentPhaseKey];

    console.log(`Stopping test for ${currentPhaseKey}. Found ${wordsForPhase.length} words to analyze.`);

    if (wordsForPhase.length > 0) {
      const analysisResult = analyzeWords(wordsForPhase, phase);
      
      setAnalysis(prev => ({
        ...prev,
        [currentPhaseKey]: analysisResult
      }));
      
      showToast(
        "Test Complete",
        `Recorded ${analysisResult.validWords} valid words for this phase.`
      );
    }

    setIsTestActive(false);
    setIsListening(false);
    setHasRecorded(true);
  };

  const analyzeWords = (words: WordEntry[], testPhase: TestPhase): AnalysisResults => {
    if (words.length === 0) {
      return {
        totalWords: 0,
        validWords: 0,
        repetitions: 0,
        errors: 0,
        clustering: 0,
        switching: 0,
        averageResponseTime: 0,
        temporalDistribution: [0, 0, 0, 0]
      };
    }

    const totalWords = words.length;
    const wordCounts = new Map<string, number>();
    let repetitions = 0;

    words.forEach(entry => {
      const count = wordCounts.get(entry.word) || 0;
      wordCounts.set(entry.word, count + 1);
      if (count > 0) repetitions++;
    });

    const validWords = wordCounts.size;

    let errors = 0;
    if (testPhase.startsWith("phonemic-")) {
        const targetLetter = testPhase.split("-")[1].toLowerCase();
        words.forEach(entry => {
            if (!entry.word.toLowerCase().startsWith(targetLetter)) {
                errors++;
            }
        });
    }

    const clustering = calculateClustering(words, testPhase);
    const switching = calculateSwitching(words, testPhase);

    const averageResponseTime = words.length > 1 
      ? words.slice(1).reduce((sum, word, idx) => sum + (word.timeFromStart - words[idx].timeFromStart), 0) / (words.length - 1)
      : 0;

    const temporalDistribution = [0, 0, 0, 0];
    words.forEach(word => {
      const quarter = Math.floor(word.timeFromStart / 15000);
      if (quarter < 4) temporalDistribution[quarter]++;
    });

    return {
      totalWords,
      validWords,
      repetitions,
      errors,
      clustering,
      switching,
      averageResponseTime,
      temporalDistribution
    };
  };

  const calculateClustering = (words: WordEntry[], testPhase: TestPhase): number => {
    if (words.length < 2) return 0;
    let clusterCount = 0;
    let currentClusterSize = 1;
    for (let i = 1; i < words.length; i++) {
      const prevWord = words[i - 1].word.toLowerCase();
      const currWord = words[i].word.toLowerCase();
      let isRelated = false;
      if (testPhase.includes("semantic")) {
        isRelated = areSemanticallySimilar(prevWord, currWord, testPhase);
      } else {
        isRelated = prevWord.substring(0, 2) === currWord.substring(0, 2);
      }
      if (isRelated) {
        currentClusterSize++;
      } else {
        if (currentClusterSize >= 2) {
          clusterCount++;
        }
        currentClusterSize = 1;
      }
    }
    if (currentClusterSize >= 2) {
      clusterCount++;
    }
    return clusterCount;
  };

  const areSemanticallySimilar = (word1: string, word2: string, testPhase: TestPhase): boolean => {
    const animalCategories = {
      pets: ["dog", "cat", "bird", "fish", "rabbit", "hamster"],
      wild: ["lion", "tiger", "elephant", "giraffe", "zebra", "rhino"],
      farm: ["cow", "pig", "chicken", "horse", "sheep", "goat"],
      marine: ["whale", "dolphin", "shark", "octopus", "seal", "fish"]
    };
    const fruitCategories = {
      citrus: ["orange", "lemon", "lime", "grapefruit", "tangerine"],
      berries: ["strawberry", "blueberry", "raspberry", "blackberry", "cranberry"],
      tropical: ["banana", "pineapple", "mango", "papaya", "coconut"],
      stone: ["peach", "plum", "cherry", "apricot", "nectarine"]
    };
    const categories = testPhase.includes("animals") ? animalCategories : fruitCategories;
    for (const category of Object.values(categories)) {
      if (category.includes(word1) && category.includes(word2)) {
        return true;
      }
    }
    return false;
  };

  const calculateSwitching = (words: WordEntry[], testPhase: TestPhase): number => {
    if (words.length < 2) return 0;
    let switches = 0;
    let currentCategory = getCategoryForWord(words[0].word, testPhase);
    for (let i = 1; i < words.length; i++) {
      const newCategory = getCategoryForWord(words[i].word, testPhase);
      if (newCategory !== currentCategory) {
        switches++;
        currentCategory = newCategory;
      }
    }
    return switches;
  };

  const getCategoryForWord = (word: string, testPhase: TestPhase): string => {
    if (testPhase.includes("phonemic")) {
      return word.substring(0, 2);
    }
    const lowerWord = word.toLowerCase();
    if (["dog", "cat", "bird", "fish"].includes(lowerWord)) return "pets";
    if (["lion", "tiger", "elephant"].includes(lowerWord)) return "wild";
    if (["orange", "lemon", "lime"].includes(lowerWord)) return "citrus";
    if (["strawberry", "blueberry", "raspberry"].includes(lowerWord)) return "berries";
    return "other";
  };

  const nextPhase = () => {
    const phases: TestPhase[] = [
      "intro",
      "instructions", 
      "semantic-animals",
      "semantic-fruits",
      "phonemic-f",
      "phonemic-a",
      "phonemic-s",
      "results"
    ];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
      setCurrentStep(currentStep + 1);
      setHasRecorded(false);
      setTimeRemaining(60);
    }
  };

  const restartAssessment = () => {
    setPhase("intro");
    setCurrentStep(0);
    setResults({
      semanticAnimals: [],
      semanticFruits: [],
      phonemicF: [],
      phonemicA: [],
      phonemicS: []
    });
    setAnalysis({});
    setIsListening(false);
    setIsTestActive(false);
    setTimeRemaining(60);
    setTestStartTime(null);
    setHasRecorded(false);
  };

  const getCurrentTestInfo = () => {
    switch (phase) {
      case "semantic-animals":
        return SEMANTIC_CATEGORIES[0];
      case "semantic-fruits":
        return SEMANTIC_CATEGORIES[1];
      case "phonemic-f":
        return PHONEMIC_LETTERS[0];
      case "phonemic-a":
        return PHONEMIC_LETTERS[1];
      case "phonemic-s":
        return PHONEMIC_LETTERS[2];
      default:
        return null;
    }
  };

  const isTestPhase = () => {
    return ["semantic-animals", "semantic-fruits", "phonemic-f", "phonemic-a", "phonemic-s"].includes(phase);
  };

  const hasCurrentPhaseData = () => {
    const phaseKey = getCurrentPhaseKey();
    return results[phaseKey] && results[phaseKey].length > 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
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
        <div className="flex items-center justify-between mb-6">
          <button
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            onClick={() => window.location.assign("/")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-sm font-medium">
            Verbal Fluency Test
          </span>
        </div>

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
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              <div className="flex items-start gap-4 mb-6">
                <MayaAvatar size="md" />
                <div className="bg-blue-50 rounded-lg p-4 flex-1">
                  <p className="text-gray-800 leading-relaxed">
                    {mayaDialogue[phase]}
                  </p>
                </div>
              </div>

              {isTestPhase() && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {(() => {
                          const testInfo = getCurrentTestInfo();
                          if (!testInfo) return '';
                          return 'name' in testInfo ? testInfo.name : `Letter: ${testInfo.letter}`;
                        })()}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className={`text-lg font-bold ${
                          timeRemaining <= 10 ? 'text-red-600' : 
                          timeRemaining <= 30 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {timeRemaining}s
                        </span>
                      </div>
                    </div>
                    <p className="text-gray-600 mb-2">
                      {getCurrentTestInfo()?.instruction}
                    </p>
                    <div className="text-sm text-gray-500">
                      Examples: {getCurrentTestInfo()?.examples.join(", ")}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {!isTestActive ? (
                      <button
                        onClick={startTest}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        Start 60-Second Test
                      </button>
                    ) : (
                      <button
                        onClick={stopTest}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <Pause className="w-4 h-4" />
                        Stop Test
                      </button>
                    )}

                    {isTestActive && hasCurrentPhaseData() && (
                      <div className="p-3 bg-gray-100 rounded-md max-h-40 overflow-y-auto">
                        <h4 className="font-medium text-sm text-gray-700 mb-2">Words captured:</h4>
                        <div className="flex flex-wrap gap-1">
                          {results[getCurrentPhaseKey()].map((entry, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                              {entry.word}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Total: {results[getCurrentPhaseKey()].length} words
                        </div>
                      </div>
                    )}

                    {hasRecorded && (
                      <button
                        onClick={() => {
                          const phaseKey = getCurrentPhaseKey();
                          setResults(prev => ({ ...prev, [phaseKey]: [] }));
                          setAnalysis(prev => ({ ...prev, [phaseKey]: undefined! }));
                          setHasRecorded(false);
                          setTimeRemaining(60);
                          showToast("Ready", "You can now redo this test.", "default");
                        }}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Redo This Test
                      </button>
                    )}

                    {!isTestActive && (
                      <button
                        onClick={nextPhase}
                        disabled={isTestActive}
                        className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400"
                      >
                        <ArrowRight className="w-4 h-4" />
                        {hasCurrentPhaseData() ? "Continue to Next Test" : "Skip This Test"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {(phase === "intro" || phase === "instructions") && (
                <button
                  onClick={nextPhase}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {phase === "intro" ? "Begin Assessment" : "Start First Test"}
                </button>
              )}

              {phase === "results" && (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Verbal Fluency Results</h3>
                    
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Semantic Fluency (Categories)</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm text-gray-600">Animals</div>
                          <div className="text-lg font-bold text-blue-600">
                            {analysis.semanticAnimals?.validWords || 0} words
                          </div>
                          {analysis.semanticAnimals && (
                            <div className="text-xs text-gray-500">
                              {analysis.semanticAnimals.repetitions} reps, {analysis.semanticAnimals.errors} errors
                            </div>
                          )}
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <div className="text-sm text-gray-600">Fruits</div>
                          <div className="text-lg font-bold text-blue-600">
                            {analysis.semanticFruits?.validWords || 0} words
                          </div>
                          {analysis.semanticFruits && (
                            <div className="text-xs text-gray-500">
                              {analysis.semanticFruits.repetitions} reps, {analysis.semanticFruits.errors} errors
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-medium text-gray-800 mb-2">Phonemic Fluency (Letters)</h4>
                      <div className="grid grid-cols-3 gap-4">
                        {["F", "A", "S"].map((letter) => {
                          const analysisKey = `phonemic${letter}` as keyof typeof analysis;
                          return (
                            <div key={letter} className="bg-white p-3 rounded border">
                              <div className="text-sm text-gray-600">Letter {letter}</div>
                              <div className="text-lg font-bold text-blue-600">
                                {analysis[analysisKey]?.validWords || 0} words
                              </div>
                              {analysis[analysisKey] && (
                                <div className="text-xs text-gray-500">
                                  {analysis[analysisKey]!.repetitions} reps, {analysis[analysisKey]!.errors} errors
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded border mt-4">
                      <h4 className="font-medium text-gray-800 mb-3">Cognitive Analysis</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Valid Words:</span>
                          <span className="ml-2 font-semibold">
                            {Object.values(analysis).reduce((sum, a) => sum + (a?.validWords || 0), 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Clusters:</span>
                          <span className="ml-2 font-semibold">
                            {Object.values(analysis).reduce((sum, a) => sum + (a?.clustering || 0), 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Category Switches:</span>
                          <span className="ml-2 font-semibold">
                            {Object.values(analysis).reduce((sum, a) => sum + (a?.switching || 0), 0)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Total Repetitions:</span>
                          <span className="ml-2 font-semibold">
                            {Object.values(analysis).reduce((sum, a) => sum + (a?.repetitions || 0), 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={restartAssessment}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors mt-3 flex items-center justify-center gap-2 border border-gray-300"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Restart Assessment
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
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
                    Step {currentStep + 1} of 8
                  </span>
                </div>
                {isTestActive && (
                  <div className="mt-3 flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Recording in progress...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">About This Test</h3>
                <p className="text-sm text-gray-600">Verbal Fluency Assessment Details</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    What we're measuring:
                  </h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>Language production speed</li>
                    <li>Cognitive flexibility</li>
                    <li>Executive function</li>
                    <li>Semantic memory access</li>
                    <li>Phonemic processing</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Test Guidelines:
                  </h4>
                  <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                    <li>No proper names allowed</li>
                    <li>Avoid repetitions</li>
                    <li>Speak clearly and steadily</li>
                    <li>Don't use word variations (run/running)</li>
                    <li>You have 60 seconds per category</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};