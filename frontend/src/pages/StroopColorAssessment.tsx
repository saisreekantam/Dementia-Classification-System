import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Clock, Play, Pause, CheckCircle, XCircle } from "lucide-react";
import { MayaAvatar } from "@/components/MayaAvatar";

type TestPhase = "intro" | "instructions" | "practice" | "congruent" | "incongruent" | "results";

interface ColorStimulus {
  word: string;
  color: string;
  isCongruent: boolean;
}

interface TrialResult {
  stimulus: ColorStimulus;
  responseTime: number;
  userResponse: string;
  correctResponse: string;
  isCorrect: boolean;
  timestamp: number;
}

interface TestResults {
  congruent: {
    trials: TrialResult[];
    averageTime: number;
    accuracy: number;
    errors: number;
  };
  incongruent: {
    trials: TrialResult[];
    averageTime: number;
    accuracy: number;
    errors: number;
  };
  stroopEffect: number; // Interference score (incongruent avg - congruent avg)
}

const COLORS = ['RED', 'BLUE', 'GREEN', 'YELLOW', 'PURPLE', 'ORANGE'];
const COLOR_CODES = {
  'RED': '#EF4444',
  'BLUE': '#3B82F6', 
  'GREEN': '#10B981',
  'YELLOW': '#F59E0B',
  'PURPLE': '#8B5CF6',
  'ORANGE': '#F97316'
};

const PRACTICE_TRIALS = 6;
const TEST_TRIALS = 20; // 20 trials per condition

interface StroopColorAssessmentProps {
  onComplete?: (results: any) => void;
  isSequential?: boolean;
}

export const StroopColorAssessment: React.FC<StroopColorAssessmentProps> = ({ onComplete, isSequential = false }) => {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [currentStep, setCurrentStep] = useState(0);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [currentStimulus, setCurrentStimulus] = useState<ColorStimulus | null>(null);
  const [stimulusStartTime, setStimulusStartTime] = useState<number>(0);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [isCorrectResponse, setIsCorrectResponse] = useState(false);
  const [toast, setToast] = useState<{title: string; description: string; variant?: string} | null>(null);

  const [results, setResults] = useState<TestResults>({
    congruent: { trials: [], averageTime: 0, accuracy: 0, errors: 0 },
    incongruent: { trials: [], averageTime: 0, accuracy: 0, errors: 0 },
    stroopEffect: 0
  });

  const [practiceTrials, setPracticeTrials] = useState<TrialResult[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const phaseProgress = {
    intro: 10,
    instructions: 25,
    practice: 40,
    congruent: 60,
    incongruent: 80,
    results: 100,
  };

  const mayaDialogue = {
    intro: "Hello! I'm Maya, and today we'll be doing the Stroop Color Test. This assessment measures your ability to focus attention and control automatic responses - important skills for filtering distractions and staying focused on tasks.",
    instructions: "Here's how it works: You'll see color words displayed on the screen. Your job is to identify the COLOR of the text, not the word itself. For example, if you see the word 'RED' written in blue text, you should click 'BLUE'. Sometimes the word and color match, sometimes they don't!",
    practice: "Let's start with some practice trials to get you comfortable. Remember, always respond with the COLOR of the text, not what the word says. Take your time to understand the task.",
    congruent: "Great! Now for the first part of the test. The word and color will match - this should feel easier. Respond as quickly and accurately as possible!",
    incongruent: "Excellent! Now for the challenging part. The word and color will NOT match. Focus on the COLOR of the text and ignore what the word says. This requires concentration!",
    results: "Fantastic! You've completed the Stroop Color Test. Your performance has been analyzed to measure your selective attention, processing speed, and inhibitory control. Let's review your results!"
  };

  // Generate stimulus trials
  const generateStimulus = useCallback((isCongruent: boolean): ColorStimulus => {
    const word = COLORS[Math.floor(Math.random() * COLORS.length)];
    let color: string;
    
    if (isCongruent) {
      color = word; // Word and color match
    } else {
      // Choose a different color than the word
      const availableColors = COLORS.filter(c => c !== word);
      color = availableColors[Math.floor(Math.random() * availableColors.length)];
    }
    
    return { word, color, isCongruent };
  }, []);

  const showToast = (title: string, description: string, variant: string = "default") => {
    setToast({ title, description, variant });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Handle completion for sequential assessments
  useEffect(() => {
    if (phase === "results" && onComplete && isSequential) {
      const interferenceScore = results.incongruent.averageTime - results.congruent.averageTime;
      
      const assessmentResults = {
        interferenceScore, // Primary metric per finalscore.txt
        stroopEffect: results.stroopEffect,
        congruent: results.congruent,
        incongruent: results.incongruent,
        completedAt: new Date()
      };
      
      onComplete(assessmentResults);
    }
  }, [phase, onComplete, isSequential, results]);

  const startTrials = (trialType: 'practice' | 'congruent' | 'incongruent') => {
    setCurrentTrial(0);
    presentNextStimulus(trialType, 0);
  };

  const presentNextStimulus = (trialType: 'practice' | 'congruent' | 'incongruent', trialIndex: number) => {
    const maxTrials = trialType === 'practice' ? PRACTICE_TRIALS : TEST_TRIALS;
    
    if (trialIndex >= maxTrials) {
      // Completed all trials for this condition
      if (trialType === 'practice') {
        showToast("Practice Complete", "Great! Now let's start the real test.");
        setTimeout(() => nextPhase(), 2000);
      } else if (trialType === 'congruent') {
        showToast("Part 1 Complete", "Excellent! Moving to the challenging part.");
        setTimeout(() => nextPhase(), 2000);
      } else {
        // Calculate final results
        calculateResults();
        setTimeout(() => nextPhase(), 2000);
      }
      return;
    }

    // Generate new stimulus
    const isCongruent = trialType === 'congruent' || (trialType === 'practice' && trialIndex % 2 === 0);
    const stimulus = generateStimulus(isCongruent);
    
    setCurrentStimulus(stimulus);
    setCurrentTrial(trialIndex);
    setIsWaitingForResponse(true);
    setShowFeedback(false);
    setStimulusStartTime(Date.now());
  };

  const handleColorResponse = (selectedColor: string) => {
    if (!isWaitingForResponse || !currentStimulus) return;

    const responseTime = Date.now() - stimulusStartTime;
    const correctResponse = currentStimulus.color;
    const isCorrect = selectedColor === correctResponse;

    const trialResult: TrialResult = {
      stimulus: currentStimulus,
      responseTime,
      userResponse: selectedColor,
      correctResponse,
      isCorrect,
      timestamp: Date.now()
    };

    // Store result based on current phase
    if (phase === 'practice') {
      setPracticeTrials(prev => [...prev, trialResult]);
    } else if (phase === 'congruent') {
      setResults(prev => ({
        ...prev,
        congruent: {
          ...prev.congruent,
          trials: [...prev.congruent.trials, trialResult]
        }
      }));
    } else if (phase === 'incongruent') {
      setResults(prev => ({
        ...prev,
        incongruent: {
          ...prev.incongruent,
          trials: [...prev.incongruent.trials, trialResult]
        }
      }));
    }

    // Show feedback
    setIsWaitingForResponse(false);
    setShowFeedback(true);
    setIsCorrectResponse(isCorrect);
    setFeedbackMessage(isCorrect ? 'Correct!' : `Incorrect. The color was ${correctResponse}.`);

    // Continue to next trial after feedback
    setTimeout(() => {
      const nextTrialIndex = currentTrial + 1;
      if (phase === 'practice') {
        presentNextStimulus('practice', nextTrialIndex);
      } else if (phase === 'congruent') {
        presentNextStimulus('congruent', nextTrialIndex);
      } else if (phase === 'incongruent') {
        presentNextStimulus('incongruent', nextTrialIndex);
      }
    }, 1500);
  };

  const calculateResults = () => {
    // Calculate congruent results
    const congruentTrials = results.congruent.trials;
    const congruentCorrect = congruentTrials.filter(t => t.isCorrect);
    const congruentAvgTime = congruentCorrect.length > 0 
      ? congruentCorrect.reduce((sum, t) => sum + t.responseTime, 0) / congruentCorrect.length 
      : 0;

    // Calculate incongruent results
    const incongruentTrials = results.incongruent.trials;
    const incongruentCorrect = incongruentTrials.filter(t => t.isCorrect);
    const incongruentAvgTime = incongruentCorrect.length > 0 
      ? incongruentCorrect.reduce((sum, t) => sum + t.responseTime, 0) / incongruentCorrect.length 
      : 0;

    // Calculate Stroop Effect (interference score)
    const stroopEffect = incongruentAvgTime - congruentAvgTime;

    setResults(prev => ({
      ...prev,
      congruent: {
        ...prev.congruent,
        averageTime: congruentAvgTime,
        accuracy: (congruentCorrect.length / congruentTrials.length) * 100,
        errors: congruentTrials.length - congruentCorrect.length
      },
      incongruent: {
        ...prev.incongruent,
        averageTime: incongruentAvgTime,
        accuracy: (incongruentCorrect.length / incongruentTrials.length) * 100,
        errors: incongruentTrials.length - incongruentCorrect.length
      },
      stroopEffect
    }));

    showToast("Test Complete", `Stroop Effect: ${stroopEffect.toFixed(0)}ms`);
  };

  const getPerformanceCategory = (stroopEffect: number, congruentAccuracy: number, incongruentAccuracy: number) => {
    // Check for severe accuracy issues first
    if (congruentAccuracy < 70 || incongruentAccuracy < 50) {
      return { category: "Needs Assessment", color: "text-red-600", description: "Severe accuracy deficits indicate significant cognitive impairment" };
    }
    
    // Check for moderate accuracy issues
    if (congruentAccuracy < 85 || incongruentAccuracy < 70) {
      return { category: "Significant Concern", color: "text-red-600", description: "Poor accuracy suggests cognitive difficulties" };
    }
    
    // Now check interference effect with good accuracy
    if (stroopEffect <= 900 && congruentAccuracy >= 90 && incongruentAccuracy >= 80) {
      return { category: "Excellent", color: "text-green-600", description: "Normal inhibitory control and accuracy" };
    }
    
    if (stroopEffect <= 1200 && congruentAccuracy >= 85 && incongruentAccuracy >= 75) {
      return { category: "Good", color: "text-blue-600", description: "Adequate inhibitory control with minor difficulties" };
    }
    
    if (stroopEffect <= 1500) {
      return { category: "Mild Concern", color: "text-yellow-600", description: "Noticeable interference with some accuracy issues" };
    }
    
    return { category: "Needs Assessment", color: "text-red-600", description: "Significant inhibitory control deficit" };
  };

  const nextPhase = () => {
    const phases: TestPhase[] = ["intro", "instructions", "practice", "congruent", "incongruent", "results"];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
      setCurrentStep(currentStep + 1);
      
      // Start trials automatically for test phases
      if (phases[currentIndex + 1] === 'practice') {
        setTimeout(() => startTrials('practice'), 1000);
      } else if (phases[currentIndex + 1] === 'congruent') {
        setTimeout(() => startTrials('congruent'), 1000);
      } else if (phases[currentIndex + 1] === 'incongruent') {
        setTimeout(() => startTrials('incongruent'), 1000);
      }
    }
  };

  const restartAssessment = () => {
    setPhase("intro");
    setCurrentStep(0);
    setCurrentTrial(0);
    setCurrentStimulus(null);
    setIsWaitingForResponse(false);
    setShowFeedback(false);
    setResults({
      congruent: { trials: [], averageTime: 0, accuracy: 0, errors: 0 },
      incongruent: { trials: [], averageTime: 0, accuracy: 0, errors: 0 },
      stroopEffect: 0
    });
    setPracticeTrials([]);
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
            Stroop Color Test
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
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
              {/* Maya Avatar */}
              <div className="flex items-start gap-4 mb-6">
                <MayaAvatar size="md" />
                <div className="bg-blue-50 rounded-lg p-4 flex-1">
                  <p className="text-gray-800 leading-relaxed">
                    {mayaDialogue[phase]}
                  </p>
                </div>
              </div>

              {/* Test Interface */}
              {(phase === "practice" || phase === "congruent" || phase === "incongruent") && (
                <div className="space-y-6">
                  {/* Trial Progress */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {phase === 'practice' ? 'Practice Trials' : 
                         phase === 'congruent' ? 'Part 1: Matching Colors' : 'Part 2: Conflicting Colors'}
                      </h3>
                      <div className="text-sm text-gray-600">
                        Trial {currentTrial + 1} of {phase === 'practice' ? PRACTICE_TRIALS : TEST_TRIALS}
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ 
                          width: `${((currentTrial + 1) / (phase === 'practice' ? PRACTICE_TRIALS : TEST_TRIALS)) * 100}%` 
                        }}
                      />
                    </div>
                  </div>

                  {/* Stimulus Display */}
                  <div className="flex flex-col items-center space-y-8">
                    {currentStimulus && !showFeedback && (
                      <div className="text-center">
                        <div className="mb-4 text-sm text-gray-600">
                          Click the COLOR of this text:
                        </div>
                        <div 
                          className="text-8xl font-bold mb-8 transition-all duration-200"
                          style={{ color: COLOR_CODES[currentStimulus.color as keyof typeof COLOR_CODES] }}
                        >
                          {currentStimulus.word}
                        </div>
                      </div>
                    )}

                    {/* Feedback Display */}
                    {showFeedback && (
                      <div className="text-center space-y-4">
                        <div className={`text-2xl font-bold ${isCorrectResponse ? 'text-green-600' : 'text-red-600'}`}>
                          {isCorrectResponse ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle className="w-8 h-8" />
                              Correct!
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2">
                              <XCircle className="w-8 h-8" />
                              Incorrect
                            </div>
                          )}
                        </div>
                        <div className="text-gray-600">
                          {feedbackMessage}
                        </div>
                      </div>
                    )}

                    {/* Color Response Buttons */}
                    {isWaitingForResponse && (
                      <div className="grid grid-cols-3 gap-4 max-w-2xl">
                        {COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorResponse(color)}
                            className="px-6 py-4 rounded-lg font-semibold text-white transition-transform hover:scale-105 active:scale-95 shadow-lg"
                            style={{ 
                              backgroundColor: COLOR_CODES[color as keyof typeof COLOR_CODES],
                              minWidth: '120px'
                            }}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Intro/Instructions */}
              {(phase === "intro" || phase === "instructions") && (
                <button
                  onClick={nextPhase}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {phase === "intro" ? "Begin Assessment" : "Start Practice"}
                </button>
              )}

              {/* Results Phase */}
              {phase === "results" && (
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Stroop Color Test Results</h3>
                    
                    {/* Performance Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">Congruent Condition (Easy)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Time:</span>
                            <span className="font-semibold">{results.congruent.averageTime.toFixed(0)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Accuracy:</span>
                            <span className="font-semibold">{results.congruent.accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Errors:</span>
                            <span className="font-semibold">{results.congruent.errors}</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">Incongruent Condition (Hard)</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Average Time:</span>
                            <span className="font-semibold">{results.incongruent.averageTime.toFixed(0)}ms</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Accuracy:</span>
                            <span className="font-semibold">{results.incongruent.accuracy.toFixed(1)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Errors:</span>
                            <span className="font-semibold">{results.incongruent.errors}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stroop Effect Analysis */}
                    <div className="bg-white p-4 rounded border">
                      <h4 className="font-medium text-gray-800 mb-3">Cognitive Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Stroop Effect (Interference):</span>
                          <div className="font-bold text-2xl text-blue-600">
                            {results.stroopEffect.toFixed(0)}ms
                          </div>
                          <div className="text-xs text-gray-500">
                            Cost of inhibitory control
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Performance Category:</span>
                          <div className={`font-bold text-lg ${getPerformanceCategory(results.stroopEffect, results.congruent.accuracy, results.incongruent.accuracy).color}`}>
                            {getPerformanceCategory(results.stroopEffect, results.congruent.accuracy, results.incongruent.accuracy).category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {getPerformanceCategory(results.stroopEffect, results.congruent.accuracy, results.incongruent.accuracy).description}
                          </div>
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

          {/* Information Panel */}
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
                    Step {currentStep + 1} of 6
                  </span>
                </div>
                {(phase === "practice" || phase === "congruent" || phase === "incongruent") && (
                  <div className="mt-3 text-sm text-gray-600">
                    <div>Trial: {currentTrial + 1} of {phase === 'practice' ? PRACTICE_TRIALS : TEST_TRIALS}</div>
                    {currentStimulus && (
                      <div className="mt-1">
                        Task: Name the COLOR (not the word)
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">About This Test</h3>
                <p className="text-sm text-gray-600">Stroop Color Test Details</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    What we're measuring:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Selective attention</li>
                    <li>• Processing speed</li>
                    <li>• Inhibitory control</li>
                    <li>• Executive function</li>
                    <li>• Cognitive flexibility</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Instructions:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Identify the COLOR of the text</li>
                    <li>• Ignore what the word says</li>
                    <li>• Respond as quickly as possible</li>
                    <li>• Stay focused and accurate</li>
                    <li>• Don't read the word!</li>
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