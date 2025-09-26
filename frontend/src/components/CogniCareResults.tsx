import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  FileText,
  Download,
  RefreshCw
} from 'lucide-react';

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

interface CogniCareResultsProps {
  compositeScore: CompositeScore;
  onRestart: () => void;
}

const INTERPRETATION_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    title: 'Healthy Range',
    emoji: '✅',
    description: 'Your cognitive performance is average or above average compared to your peers.',
    recommendation: 'Continue engaging in brain-healthy habits like exercise, social activities, and a balanced diet.'
  },
  mild: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    title: 'Mild Indication',
    emoji: '⚠️',
    description: 'Your performance is slightly but consistently below the average range.',
    recommendation: 'This could be due to many factors (e.g., fatigue, stress, normal aging) or could be an early sign of cognitive change. Consider discussing with a healthcare professional.'
  },
  strong: {
    icon: AlertTriangle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    title: 'Strong Indication',
    emoji: '❗',
    description: 'Your performance is significantly below the expected range across multiple areas.',
    recommendation: 'This pattern warrants a conversation with a healthcare professional for further evaluation.'
  }
};

const DOMAIN_INFO = {
  'Memory': {
    description: 'Ability to encode, store, and retrieve information',
    tests: ['Memory Recall Test']
  },
  'Executive Function': {
    description: 'Mental skills including working memory, flexible thinking, and self-control',
    tests: ['Trail Making Test', 'Stroop Color Test']
  },
  'Language': {
    description: 'Ability to understand and express thoughts through words',
    tests: ['Verbal Fluency Test', 'Cookie Theft Description']
  }
};

const CogniCareResults: React.FC<CogniCareResultsProps> = ({ compositeScore, onRestart }) => {
  const interpretationConfig = INTERPRETATION_CONFIG[compositeScore.interpretation];
  const Icon = interpretationConfig.icon;
  const navigate = useNavigate();
  // Calculate domain scores
  const domainScores = Object.entries(DOMAIN_INFO).map(([domain, info]) => {
    const domainTests = compositeScore.individualScores.filter(score => score.domain === domain);
    const averageZScore = domainTests.reduce((sum, score) => sum + score.zScore, 0) / domainTests.length;
    
    return {
      domain,
      averageZScore,
      testCount: domainTests.length,
      ...info
    };
  });

  const formatScore = (score: number) => {
    return score >= 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
  };

  const getScoreColor = (zScore: number) => {
    if (zScore > 0.5) return 'text-green-600';
    if (zScore > -0.5) return 'text-blue-600';
    if (zScore > -1.5) return 'text-amber-600';
    return 'text-red-600';
  };

  const exportResults = () => {
    const data = {
      assessmentDate: compositeScore.completedAt.toISOString(),
      cognicareScore: compositeScore.ccs,
      interpretation: compositeScore.interpretation,
      individualScores: compositeScore.individualScores.map(score => ({
        test: score.testId,
        domain: score.domain,
        rawScore: score.rawScore,
        zScore: score.zScore,
        completedAt: score.completedAt.toISOString()
      })),
      domainScores: domainScores.map(domain => ({
        domain: domain.domain,
        averageZScore: domain.averageZScore
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognicare-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-10 w-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              Your CogniCare Results
            </h1>
          </div>
          <p className="text-lg text-gray-600">
            Comprehensive cognitive assessment completed on{' '}
            {compositeScore.completedAt.toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Score Card */}
          <div className="lg:col-span-2">
            <Card className={`${interpretationConfig.bgColor} ${interpretationConfig.borderColor} border-2`}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className={`h-8 w-8 ${interpretationConfig.color}`} />
                  <div>
                    <CardTitle className="text-2xl">
                      CogniCare Cognitive Composite Score (CCS)
                    </CardTitle>
                    <CardDescription className="text-lg">
                      Your overall cognitive performance score
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <div className="text-6xl font-bold mb-2 text-gray-900">
                      {formatScore(compositeScore.ccs)}
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`text-lg px-4 py-2 ${interpretationConfig.color} ${interpretationConfig.bgColor}`}
                    >
                      {interpretationConfig.emoji} {interpretationConfig.title}
                    </Badge>
                  </div>

                  {/* Score Interpretation */}
                  <div className="space-y-4">
                    <div className={`p-4 rounded-lg ${interpretationConfig.bgColor} border ${interpretationConfig.borderColor}`}>
                      <h3 className="font-semibold text-gray-900 mb-2">What This Means</h3>
                      <p className="text-gray-700 mb-3">{interpretationConfig.description}</p>
                      <p className="text-sm text-gray-600">
                        <strong>Recommended Action:</strong> {interpretationConfig.recommendation}
                      </p>
                    </div>

                    {/* Score Scale */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-800">CCS Score Scale</h4>
                      <div className="relative">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Strong Indication</span>
                          <span>Mild Indication</span>
                          <span>Healthy Range</span>
                        </div>
                        <div className="h-4 bg-gradient-to-r from-red-200 via-amber-200 to-green-200 rounded-full relative">
                          <div 
                            className="absolute top-0 w-2 h-4 bg-gray-800 rounded-full transform -translate-x-1"
                            style={{
                              left: `${Math.max(0, Math.min(100, ((compositeScore.ccs + 3) / 6) * 100))}%`
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>-3.0</span>
                          <span>-1.5</span>
                          <span>0.0</span>
                          <span>+3.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button onClick={exportResults} variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export Results
                </Button>
                <Button onClick={onRestart} variant="outline" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Take New Assessment
                </Button>
                <Button
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </CardContent>
            </Card>

            {/* Assessment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Assessment Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tests Completed:</span>
                  <span className="font-medium">5/5</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Duration:</span>
                  <span className="font-medium">~35-50 min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completion Date:</span>
                  <span className="font-medium">
                    {compositeScore.completedAt.toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Domain Breakdown */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Cognitive Domain Breakdown
              </CardTitle>
              <CardDescription>
                Your performance across different cognitive areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                {domainScores.map(domain => (
                  <div key={domain.domain} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">{domain.domain}</h3>
                      <span className={`font-bold ${getScoreColor(domain.averageZScore)}`}>
                        {formatScore(domain.averageZScore)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600">{domain.description}</p>
                    
                    <div className="space-y-2">
                      {domain.tests.map(test => {
                        const testScore = compositeScore.individualScores.find(score => 
                          test.toLowerCase().includes(score.testId) || 
                          score.testId.toLowerCase().includes(test.toLowerCase())
                        );
                        
                        return (
                          <div key={test} className="flex justify-between text-sm">
                            <span className="text-gray-600">{test}:</span>
                            <span className={`font-medium ${testScore ? getScoreColor(testScore.zScore) : 'text-gray-400'}`}>
                              {testScore ? formatScore(testScore.zScore) : 'N/A'}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Visual indicator */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          domain.averageZScore > 0.5 ? 'bg-green-500' :
                          domain.averageZScore > -0.5 ? 'bg-blue-500' :
                          domain.averageZScore > -1.5 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{
                          width: `${Math.max(10, Math.min(100, ((domain.averageZScore + 3) / 6) * 100))}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Individual Test Results */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Individual Test Results</CardTitle>
              <CardDescription>
                Detailed breakdown of each assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {compositeScore.individualScores.map(score => (
                  <div key={score.testId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900 capitalize">
                        {score.testId.replace(/([A-Z])/g, ' $1').trim()} Test
                      </h4>
                      <p className="text-sm text-gray-600">{score.domain} Domain</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getScoreColor(score.zScore)}`}>
                        {formatScore(score.zScore)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Raw: {score.rawScore}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8">
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-900">Important Disclaimer</h3>
                  <p className="text-sm text-amber-800">
                    This assessment is a screening tool, not a diagnostic test. It is designed to identify 
                    potential areas of concern and empower you with information. It cannot diagnose a medical 
                    condition like dementia. If you have any concerns about your results, we strongly encourage 
                    you to share and discuss them with a qualified healthcare professional, such as your doctor 
                    or a neurologist.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CogniCareResults;