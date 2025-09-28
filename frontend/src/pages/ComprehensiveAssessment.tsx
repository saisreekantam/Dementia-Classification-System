import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, Brain, Target, MessageSquare, Zap, Eye } from 'lucide-react';

// Import all assessment components
import { MemoryAssessment } from './MemoryAssessment';
import { VerbalFluencyAssessment } from './VerbalFluencyAssessment';
import { TrailMakingAssessment } from './TrailMakingAssessment';
import { StroopColorAssessment } from './StroopColorAssessment';
import { CookieTheftAssessment } from './CookieTheftAssessment';
import CogniCareResults from '../components/CogniCareResults';

// Population norms for Z-score calculations (based on research literature)
const POPULATION_NORMS = {
  memory: { mean: 12.5, stdDev: 2.8 }, // Average words recalled after delay
  verbalFluency: { mean: 18.2, stdDev: 4.3 }, // Average animals named in 60s
  trailMaking: { mean: 75.0, stdDev: 25.0 }, // Average seconds for Part B
  stroop: { mean: 650, stdDev: 180 }, // Average interference effect in ms
  cookieTheft: { mean: 14.5, stdDev: 3.2 } // Average information units described
};

// Assessment configuration
const ASSESSMENTS = [
  {
    id: 'memory',
    title: 'Memory Recall Test',
    description: 'Tests your ability to remember and recall information',
    icon: Brain,
    component: MemoryAssessment,
    domain: 'Memory',
    estimatedTime: '10-15 minutes',
    weight: 0.35,
    primaryMetric: 'delayedRecallCount'
  },
  {
    id: 'verbalFluency',
    title: 'Verbal Fluency Test',
    description: 'Tests your ability to retrieve words from memory',
    icon: MessageSquare,
    component: VerbalFluencyAssessment,
    domain: 'Language',
    estimatedTime: '5 minutes',
    weight: 0.15,
    primaryMetric: 'correctWords'
  },
  {
    id: 'trailMaking',
    title: 'Trail Making Test',
    description: 'Tests visual attention and cognitive flexibility',
    icon: Target,
    component: TrailMakingAssessment,
    domain: 'Executive Function',
    estimatedTime: '8-12 minutes',
    weight: 0.20,
    primaryMetric: 'partBTime'
  },
  {
    id: 'stroop',
    title: 'Stroop Color Test',
    description: 'Tests your ability to inhibit automatic responses',
    icon: Eye,
    component: StroopColorAssessment,
    domain: 'Executive Function',
    estimatedTime: '8-10 minutes',
    weight: 0.20,
    primaryMetric: 'interferenceScore'
  },
  {
    id: 'cookieTheft',
    title: 'Cookie Theft Description',
    description: 'Tests language and scene description abilities',
    icon: Zap,
    component: CookieTheftAssessment,
    domain: 'Language',
    estimatedTime: '5-8 minutes',
    weight: 0.10,
    primaryMetric: 'informationUnits'
  }
];

interface AssessmentScore {
  testId: string;
  rawScore: number;
  zScore: number;
  domain: string;
  completedAt: Date;
}

interface CompositeScore {
  ccs: number;
  interpretation: 'healthy' | 'mild' | 'strong';
  individualScores: AssessmentScore[];
  completedAt: Date;
}

const ComprehensiveAssessment: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<'overview' | 'assessment' | 'results'>('overview');
  const [currentAssessmentIndex, setCurrentAssessmentIndex] = useState(0);
  const [completedAssessments, setCompletedAssessments] = useState<Set<string>>(new Set());
  const [assessmentScores, setAssessmentScores] = useState<AssessmentScore[]>([]);
  const [compositeScore, setCompositeScore] = useState<CompositeScore | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const currentAssessment = ASSESSMENTS[currentAssessmentIndex];
  const progress = (completedAssessments.size / ASSESSMENTS.length) * 100;

  // Calculate Z-score for a given test
  const calculateZScore = (testId: string, rawScore: number): number => {
    const norms = POPULATION_NORMS[testId as keyof typeof POPULATION_NORMS];
    if (!norms) return 0;

    let zScore = (rawScore - norms.mean) / norms.stdDev;

    // For tests where lower scores are better, invert the Z-score
    if (testId === 'trailMaking' || testId === 'stroop') {
      zScore = -zScore;
    }

    return zScore;
  };

  // Calculate CogniCare Composite Score
  const calculateCompositeScore = (scores: AssessmentScore[]): CompositeScore => {
    const ccs = scores.reduce((total, score) => {
      const assessment = ASSESSMENTS.find(a => a.id === score.testId);
      if (!assessment) return total;
      return total + (score.zScore * assessment.weight);
    }, 0);

    let interpretation: 'healthy' | 'mild' | 'strong';
    if (ccs > 0.0) {
      interpretation = 'healthy';
    } else if (ccs >= -1.5) {
      interpretation = 'mild';
    } else {
      interpretation = 'strong';
    }

    return {
      ccs,
      interpretation,
      individualScores: scores,
      completedAt: new Date()
    };
  };

  // Handle assessment completion
  const handleAssessmentComplete = (testId: string, results: any) => {
    const assessment = ASSESSMENTS.find(a => a.id === testId);
    if (!assessment) return;

    // Extract the primary metric from results
    let rawScore: number;
    switch (testId) {
      case 'memory':
        rawScore = results.delayedRecall?.correctWords || 0;
        break;
      case 'verbalFluency':
        rawScore = results.correctWords || 0;
        break;
      case 'trailMaking':
        rawScore = results.partB?.timeToComplete || 300; // Default to 5 minutes if not completed
        break;
      case 'stroop':
        rawScore = results.interferenceScore || 0;
        break;
      case 'cookieTheft':
        rawScore = results.informationUnits || 0;
        break;
      default:
        rawScore = 0;
    }

    const zScore = calculateZScore(testId, rawScore);
    const assessmentScore: AssessmentScore = {
      testId,
      rawScore,
      zScore,
      domain: assessment.domain,
      completedAt: new Date()
    };

    const newScores = [...assessmentScores, assessmentScore];
    setAssessmentScores(newScores);
    setCompletedAssessments(prev => new Set(prev).add(testId));

    // Move to next assessment or results
    if (currentAssessmentIndex < ASSESSMENTS.length - 1) {
      setCurrentAssessmentIndex(prev => prev + 1);
    } else {
      // All assessments completed - calculate composite score
      const composite = calculateCompositeScore(newScores);
      setCompositeScore(composite);
      setCurrentStep('results');
      
      // Store results in localStorage
      localStorage.setItem('cognicare_results', JSON.stringify(composite));
    }
  };

  // Start the assessment battery
  const startAssessment = () => {
    setStartTime(new Date());
    setCurrentStep('assessment');
    setCurrentAssessmentIndex(0);
  };

  // Go back to previous assessment
  const goToPreviousAssessment = () => {
    if (currentAssessmentIndex > 0) {
      setCurrentAssessmentIndex(prev => prev - 1);
    }
  };

  // Reset and start over
  const restartAssessment = () => {
    setCurrentStep('overview');
    setCurrentAssessmentIndex(0);
    setCompletedAssessments(new Set());
    setAssessmentScores([]);
    setCompositeScore(null);
    setStartTime(null);
    localStorage.removeItem('cognicare_results');
  };

  if (currentStep === 'overview') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              CogniCare Comprehensive Assessment
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Complete our scientifically-validated cognitive assessment battery to get your 
              CogniCare Cognitive Composite Score (CCS) and personalized insights.
            </p>
          </div>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Assessment Overview
              </CardTitle>
              <CardDescription>
                This comprehensive assessment consists of 5 validated neuropsychological tests 
                that evaluate your memory, executive function, and language abilities.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {ASSESSMENTS.map((assessment, index) => {
                  const Icon = assessment.icon;
                  return (
                    <div key={assessment.id} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-3 mb-3">
                        <Icon className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="font-semibold">{assessment.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {assessment.domain}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{assessment.description}</p>
                      <p className="text-xs text-gray-500">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {assessment.estimatedTime}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Total estimated time: 15-20 minutes</li>
                  <li>• Find a quiet environment free from distractions</li>
                  <li>• You can take short breaks between tests if needed</li>
                  <li>• This is a screening tool, not a diagnostic test</li>
                  <li>• Your data is stored locally and not shared</li>
                </ul>
              </div>

              <div className="mt-6 text-center">
                <Button onClick={startAssessment} size="lg" className="px-8">
                  Begin Comprehensive Assesment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (currentStep === 'assessment') {
    const CurrentAssessmentComponent = currentAssessment.component;
    const visibleScores = assessmentScores.filter(
      score => completedAssessments.has(score.testId)
    );
    const interimComposite: CompositeScore = {
      ccs: visibleScores.reduce((total, score) => {
        const assessment = ASSESSMENTS.find(a => a.id === score.testId);
        if (!assessment) return total;
        return total + (score.zScore * assessment.weight);
      }, 0),
      interpretation:
        visibleScores.reduce((total, score) => {
          const assessment = ASSESSMENTS.find(a => a.id === score.testId);
          if (!assessment) return total;
          return total + (score.zScore * assessment.weight);
        }, 0) > 0.0
          ? 'healthy'
          : visibleScores.reduce((total, score) => {
              const assessment = ASSESSMENTS.find(a => a.id === score.testId);
              if (!assessment) return total;
              return total + (score.zScore * assessment.weight);
            }, 0) >= -1.5
          ? 'mild'
          : 'strong',
      individualScores: visibleScores,
      completedAt: new Date(),
    };
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Progress Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {currentAssessment.title}
                </h1>
                <p className="text-gray-600">
                  Assessment {currentAssessmentIndex + 1} of {ASSESSMENTS.length}
                </p>
              </div>
              <Badge variant="outline" className="text-sm">
                {currentAssessment.domain}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Overall Progress</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Assessment navigation */}
            <div className="flex items-center gap-2 mt-4">
              {currentAssessmentIndex > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={goToPreviousAssessment}
                >
                  Previous Test
                </Button>
              )}
              <div className="flex-1" />
              <div className="flex gap-1">
                {ASSESSMENTS.map((_, index) => (
                  <div
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index < currentAssessmentIndex
                        ? 'bg-green-500'
                        : index === currentAssessmentIndex
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Current Assessment */}
        <div className="py-8">
          <CurrentAssessmentComponent
            onComplete={(results: any) => handleAssessmentComplete(currentAssessment.id, results)}
            isSequential={true}
          />
        </div>
        {visibleScores.length > 0 && (
          <div className="max-w-4xl mx-auto my-8">
            <CogniCareResults
              compositeScore={interimComposite}
              onRestart={restartAssessment}
            />
          </div>
        )}
      </div>
    );
  }

  if (currentStep === 'results' && compositeScore) {
    return (
      <CogniCareResults 
        compositeScore={compositeScore}
        onRestart={restartAssessment}
      />
    );
  }

  // Fallback loading state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Complete</CardTitle>
            <CardDescription>
              Your results are being processed...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Brain className="h-16 w-16 text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">
                Please wait while we calculate your CogniCare Cognitive Composite Score.
              </p>
              <Button onClick={restartAssessment} variant="outline" className="mt-4">
                Start New Assessment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ComprehensiveAssessment;