import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, Clock, Play, Pause, CheckCircle, XCircle } from "lucide-react";
import { MayaAvatar } from "@/components/MayaAvatar";

type TestPhase = "intro" | "instructions-a" | "part-a" | "instructions-b" | "part-b" | "results";

interface CirclePosition {
  id: string;
  x: number;
  y: number;
  label: string;
  isConnected: boolean;
  isNext: boolean;
  isError: boolean;
}

interface Connection {
  from: string;
  to: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface TestResults {
  partA: {
    timeToComplete: number;
    errors: number;
    completed: boolean;
    connections: Connection[];
  };
  partB: {
    timeToComplete: number;
    errors: number;
    completed: boolean;
    connections: Connection[];
  };
  derivedScore: number; // B - A time difference
}

export const TrailMakingAssessment = () => {
  const [phase, setPhase] = useState<TestPhase>("intro");
  const [currentStep, setCurrentStep] = useState(0);
  const [isTestActive, setIsTestActive] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentTarget, setCurrentTarget] = useState<string>("1");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [circles, setCircles] = useState<CirclePosition[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{title: string; description: string; variant?: string} | null>(null);

  const [results, setResults] = useState<TestResults>({
    partA: { timeToComplete: 0, errors: 0, completed: false, connections: [] },
    partB: { timeToComplete: 0, errors: 0, completed: false, connections: [] },
    derivedScore: 0
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const phaseProgress = {
    intro: 10,
    "instructions-a": 20,
    "part-a": 40,
    "instructions-b": 60,
    "part-b": 80,
    results: 100,
  };

  const mayaDialogue = {
    intro: "Hello! I'm Maya, and today we'll be doing the Trail Making Test. This assessment evaluates your visual attention, processing speed, and cognitive flexibility - important skills for everyday tasks like following directions or multitasking.",
    "instructions-a": "We'll start with Part A. You'll see numbered circles from 1 to 25 scattered on the screen. Your task is to connect them in order as quickly as possible - from 1 to 2 to 3, and so on. Click on circle 1 first, then drag to circle 2, and continue until you reach 25.",
    "part-a": "Great! Now connect the circles from 1 to 25 in numerical order. Click and drag from one circle to the next as quickly as you can. I'll time you, so work as fast as possible while being accurate!",
    "instructions-b": "Excellent work on Part A! Part B is more challenging. You'll see both numbers (1-13) and letters (A-L). Connect them by alternating: start with 1, then A, then 2, then B, then 3, then C, and so on. This tests your ability to switch between different sequences.",
    "part-b": "Now for Part B! Remember to alternate between numbers and letters: 1-A-2-B-3-C and so on. This is more challenging, but take your time to be accurate while still working quickly.",
    results: "Fantastic! You've completed both parts of the Trail Making Test. Your performance has been analyzed to assess your processing speed, attention, and cognitive flexibility. Let's review your results!"
  };

  // Generate random positions for circles, ensuring no overlap
  const generateCirclePositions = useCallback((labels: string[]) => {
    const positions: CirclePosition[] = [];
    const canvasWidth = 800;
    const canvasHeight = 500;
    const circleRadius = 25;
    const minDistance = 80;

    labels.forEach((label) => {
      let attempts = 0;
      let validPosition = false;
      let x, y;

      while (!validPosition && attempts < 100) {
        x = circleRadius + Math.random() * (canvasWidth - 2 * circleRadius);
        y = circleRadius + Math.random() * (canvasHeight - 2 * circleRadius);

        validPosition = positions.every(pos => {
          const distance = Math.sqrt((x! - pos.x) ** 2 + (y! - pos.y) ** 2);
          return distance >= minDistance;
        });

        attempts++;
      }

      if (validPosition) {
        positions.push({
          id: label,
          x: x!,
          y: y!,
          label: label,
          isConnected: false,
          isNext: label === "1",
          isError: false
        });
      }
    });

    return positions;
  }, []);

  // Initialize circles for each part
  useEffect(() => {
    if (phase === "part-a") {
      const partALabels = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
      setCircles(generateCirclePositions(partALabels));
      setCurrentTarget("1");
      setConnections([]);
    } else if (phase === "part-b") {
      const partBLabels = [];
      for (let i = 1; i <= 13; i++) {
        partBLabels.push(i.toString());
        if (i <= 12) {
          partBLabels.push(String.fromCharCode(64 + i)); // A, B, C, etc.
        }
      }
      setCircles(generateCirclePositions(partBLabels));
      setCurrentTarget("1");
      setConnections([]);
    }
  }, [phase, generateCirclePositions]);

  // Generate the expected sequence for Part B
  const getPartBSequence = () => {
    const sequence = [];
    for (let i = 1; i <= 13; i++) {
      sequence.push(i.toString());
      if (i <= 12) {
        sequence.push(String.fromCharCode(64 + i)); // A, B, C, etc.
      }
    }
    return sequence;
  };

  const getNextTarget = (current: string) => {
    if (phase === "part-a") {
      const currentNum = parseInt(current);
      return currentNum < 25 ? (currentNum + 1).toString() : null;
    } else if (phase === "part-b") {
      const sequence = getPartBSequence();
      const currentIndex = sequence.indexOf(current);
      return currentIndex < sequence.length - 1 ? sequence[currentIndex + 1] : null;
    }
    return null;
  };

  const showToast = (title: string, description: string, variant: string = "default") => {
    setToast({ title, description, variant });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const startTest = () => {
    setIsTestActive(true);
    setStartTime(new Date());
    showToast("Test Started", "Connect the circles as quickly and accurately as possible!");
  };

  const completeTest = () => {
    if (!startTime) return;

    const endTime = new Date();
    const timeToComplete = (endTime.getTime() - startTime.getTime()) / 1000;
    const currentPart = phase === "part-a" ? "partA" : "partB";

    setResults(prev => {
      const updatedResults = {
        ...prev,
        [currentPart]: {
          ...prev[currentPart],
          timeToComplete,
          completed: true,
          connections: [...connections]
        }
      };

      // Calculate derived score if both parts are completed
      if (currentPart === "partB" || prev.partA.completed) {
        updatedResults.derivedScore = updatedResults.partB.timeToComplete - updatedResults.partA.timeToComplete;
      }

      return updatedResults;
    });

    setIsTestActive(false);
    showToast("Test Complete", `Completed in ${timeToComplete.toFixed(1)} seconds!`);
  };

  const handleCircleClick = (clickedCircle: CirclePosition) => {
    if (!isTestActive) {
      showToast("Start Required", "Please start the test first!", "destructive");
      return;
    }

    if (clickedCircle.id === currentTarget) {
      // Correct circle clicked
      const updatedCircles = circles.map(circle => {
        if (circle.id === clickedCircle.id) {
          return { ...circle, isConnected: true, isNext: false };
        }
        return { ...circle, isError: false };
      });

      // Add connection if there's a previous circle
      const lastConnected = connections.length > 0 
        ? circles.find(c => c.id === connections[connections.length - 1].to)
        : null;

      if (lastConnected || connections.length === 0) {
        const newConnection: Connection = {
          from: lastConnected?.id || clickedCircle.id,
          to: clickedCircle.id,
          x1: lastConnected?.x || clickedCircle.x,
          y1: lastConnected?.y || clickedCircle.y,
          x2: clickedCircle.x,
          y2: clickedCircle.y
        };

        if (lastConnected) {
          setConnections(prev => [...prev, newConnection]);
        }
      }

      const nextTarget = getNextTarget(clickedCircle.id);
      if (nextTarget) {
        setCurrentTarget(nextTarget);
        // Update next circle indicator
        const finalCircles = updatedCircles.map(circle => ({
          ...circle,
          isNext: circle.id === nextTarget
        }));
        setCircles(finalCircles);
      } else {
        // Test completed
        setCircles(updatedCircles);
        completeTest();
      }

    } else {
      // Wrong circle clicked - show error
      const updatedCircles = circles.map(circle => ({
        ...circle,
        isError: circle.id === clickedCircle.id
      }));
      setCircles(updatedCircles);

      // Increment error count
      const currentPart = phase === "part-a" ? "partA" : "partB";
      setResults(prev => ({
        ...prev,
        [currentPart]: {
          ...prev[currentPart],
          errors: prev[currentPart].errors + 1
        }
      }));

      showToast("Incorrect", `Click circle ${currentTarget} next`, "destructive");

      // Clear error after 1 second
      setTimeout(() => {
        setCircles(prev => prev.map(circle => ({ ...circle, isError: false })));
      }, 1000);
    }
  };

  const nextPhase = () => {
    const phases: TestPhase[] = ["intro", "instructions-a", "part-a", "instructions-b", "part-b", "results"];
    const currentIndex = phases.indexOf(phase);
    if (currentIndex < phases.length - 1) {
      setPhase(phases[currentIndex + 1]);
      setCurrentStep(currentStep + 1);
      setIsTestActive(false);
    }
  };

  const restartAssessment = () => {
    setPhase("intro");
    setCurrentStep(0);
    setResults({
      partA: { timeToComplete: 0, errors: 0, completed: false, connections: [] },
      partB: { timeToComplete: 0, errors: 0, completed: false, connections: [] },
      derivedScore: 0
    });
    setConnections([]);
    setCircles([]);
    setIsTestActive(false);
    setCurrentTarget("1");
    setStartTime(null);
  };

  const restartCurrentPart = () => {
    if (phase === "part-a") {
      const partALabels = Array.from({ length: 25 }, (_, i) => (i + 1).toString());
      setCircles(generateCirclePositions(partALabels));
    } else if (phase === "part-b") {
      const partBLabels = [];
      for (let i = 1; i <= 13; i++) {
        partBLabels.push(i.toString());
        if (i <= 12) {
          partBLabels.push(String.fromCharCode(64 + i));
        }
      }
      setCircles(generateCirclePositions(partBLabels));
    }
    
    setCurrentTarget("1");
    setConnections([]);
    setIsTestActive(false);
    setStartTime(null);
    
    const currentPart = phase === "part-a" ? "partA" : "partB";
    setResults(prev => ({
      ...prev,
      [currentPart]: { timeToComplete: 0, errors: 0, completed: false, connections: [] }
    }));
  };

  const getPerformanceCategory = (timeB: number) => {
    if (timeB <= 80) return { category: "Excellent", color: "text-green-600" };
    if (timeB <= 90) return { category: "Good", color: "text-blue-600" };
    if (timeB <= 120) return { category: "Mild Concern", color: "text-yellow-600" };
    return { category: "Needs Assessment", color: "text-red-600" };
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
            Trail Making Test
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

              {/* Test Canvas */}
              {(phase === "part-a" || phase === "part-b") && (
                <div className="space-y-4">
                  {/* Test Controls */}
                  <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium">
                          {isTestActive ? "In Progress" : "Ready to Start"}
                        </span>
                      </div>
                      {isTestActive && (
                        <div className="text-sm text-gray-600">
                          Next: <span className="font-bold text-blue-600">{currentTarget}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      {!isTestActive ? (
                        <button
                          onClick={startTest}
                          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Start Test
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 text-green-600">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium">Testing...</span>
                        </div>
                      )}
                      
                      <button
                        onClick={restartCurrentPart}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restart
                      </button>
                    </div>
                  </div>

                  {/* Canvas */}
                  <div 
                    ref={containerRef}
                    className="relative bg-gray-50 border border-gray-300 rounded-lg overflow-hidden"
                    style={{ height: "500px" }}
                  >
                    <svg
                      width="100%"
                      height="100%"
                      className="absolute inset-0"
                    >
                      {/* Draw connections */}
                      {connections.map((connection, index) => (
                        <line
                          key={index}
                          x1={connection.x1}
                          y1={connection.y1}
                          x2={connection.x2}
                          y2={connection.y2}
                          stroke="#3B82F6"
                          strokeWidth="3"
                          className="drop-shadow-sm"
                        />
                      ))}
                      
                      {/* Draw circles */}
                      {circles.map((circle) => (
                        <g key={circle.id}>
                          <circle
                            cx={circle.x}
                            cy={circle.y}
                            r="25"
                            fill={
                              circle.isError ? "#EF4444" :
                              circle.isConnected ? "#10B981" :
                              circle.isNext ? "#F59E0B" : "#E5E7EB"
                            }
                            stroke={
                              circle.isNext ? "#D97706" : 
                              circle.isConnected ? "#059669" : "#9CA3AF"
                            }
                            strokeWidth="2"
                            className="cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => handleCircleClick(circle)}
                          />
                          <text
                            x={circle.x}
                            y={circle.y + 5}
                            textAnchor="middle"
                            className="text-sm font-bold pointer-events-none select-none"
                            fill={
                              circle.isError ? "white" :
                              circle.isConnected ? "white" :
                              circle.isNext ? "white" : "#374151"
                            }
                          >
                            {circle.label}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>

                  {/* Continue Button */}
                  {!isTestActive && (
                    <button
                      onClick={nextPhase}
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowRight className="w-4 h-4" />
                      Continue to Next Part
                    </button>
                  )}
                </div>
              )}

              {/* Intro/Instructions */}
              {(phase === "intro" || phase === "instructions-a" || phase === "instructions-b") && (
                <button
                  onClick={nextPhase}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {phase === "intro" ? "Begin Assessment" : 
                   phase === "instructions-a" ? "Start Part A" : "Start Part B"}
                </button>
              )}

              {/* Results Phase */}
              {phase === "results" && (
                <div className="space-y-6">
                  {/* Overall Summary */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Trail Making Test Results</h3>
                    
                    {/* Part A & B Results */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">Part A (Numbers)</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Time:</span>
                            <span className="font-semibold">{results.partA.timeToComplete.toFixed(1)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Errors:</span>
                            <span className="font-semibold">{results.partA.errors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`font-semibold ${results.partA.completed ? 'text-green-600' : 'text-gray-500'}`}>
                              {results.partA.completed ? 'Completed' : 'Not Completed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-4 rounded border">
                        <h4 className="font-medium text-gray-800 mb-2">Part B (Numbers & Letters)</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Time:</span>
                            <span className="font-semibold">{results.partB.timeToComplete.toFixed(1)}s</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Errors:</span>
                            <span className="font-semibold">{results.partB.errors}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">Status:</span>
                            <span className={`font-semibold ${results.partB.completed ? 'text-green-600' : 'text-gray-500'}`}>
                              {results.partB.completed ? 'Completed' : 'Not Completed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Derived Scores & Analysis */}
                    <div className="bg-white p-4 rounded border">
                      <h4 className="font-medium text-gray-800 mb-3">Cognitive Analysis</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-600">Executive Score (B - A):</span>
                          <div className="font-bold text-lg text-blue-600">
                            {results.derivedScore.toFixed(1)}s
                          </div>
                          <div className="text-xs text-gray-500">
                            Time cost of cognitive flexibility
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600">Performance Category:</span>
                          <div className={`font-bold text-lg ${getPerformanceCategory(results.partB.timeToComplete).color}`}>
                            {getPerformanceCategory(results.partB.timeToComplete).category}
                          </div>
                          <div className="text-xs text-gray-500">
                            {results.partB.timeToComplete > 90 ? "Consider detailed evaluation" : "Within normal range"}
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
                {isTestActive && (
                  <div className="mt-3">
                    <div className="text-sm text-gray-600 mb-1">Next Target:</div>
                    <div className="text-lg font-bold text-blue-600">{currentTarget}</div>
                  </div>
                )}
                {(phase === "part-a" || phase === "part-b") && (
                  <div className="mt-3 text-sm text-gray-600">
                    <div>Errors: {phase === "part-a" ? results.partA.errors : results.partB.errors}</div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">About This Test</h3>
                <p className="text-sm text-gray-600">Trail Making Test Details</p>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    What we're measuring:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Visual scanning ability</li>
                    <li>• Processing speed</li>
                    <li>• Cognitive flexibility</li>
                    <li>• Executive function</li>
                    <li>• Attention control</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Instructions:
                  </h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Part A: Connect numbers 1-25 in order</li>
                    <li>• Part B: Alternate numbers and letters</li>
                    <li>• Work as quickly as possible</li>
                    <li>• Click on circles to connect them</li>
                    <li>• Accuracy is important</li>
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