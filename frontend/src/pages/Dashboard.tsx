import { Brain, Clock, Mic, Zap, TrendingUp, User, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AssessmentCard } from "@/components/AssessmentCard";
import { MayaAvatar } from "@/components/MayaAvatar";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleStartAssessment = (assessmentType: string) => {
    if (assessmentType === "Complete Assessment Battery") {
      navigate("/assessment/comprehensive");
    } else if (assessmentType === "Memory Recall Test") {
      navigate("/assessment/memory");
    } else if (assessmentType === "Cookie Theft Picture") {
      navigate("/assessment/cookie-theft");
    } else if (assessmentType === "Verbal Fluency Test") {
      navigate("/assessment/verbal-fluency");
    } else if (assessmentType === "Trail Making Test") {
      navigate("/assessment/trail-making");
    } else if (assessmentType === "Stroop Color Test") {
      navigate("/assessment/stroop-color");
    } else {
      navigate("/assessment/comprehensive");
    }
  };

  const assessments = [
    {
      title: "Complete Assessment Battery",
      description: "Take all 5 cognitive assessments in sequence and get your comprehensive CogniCare Cognitive Composite Score (CCS) with detailed clinical insights.",
      icon: Brain,
      duration: "35-50 min",
      difficulty: "Comprehensive" as const,
      status: "Recommended" as const,
    },
    {
      title: "Memory Recall Test",
      description: "Assess your short-term and long-term memory with word list exercises. Maya will guide you through immediate and delayed recall tasks.",
      icon: Brain,
      duration: "10-15 min",
      difficulty: "Easy" as const,
      status: "Available" as const,
    },
    {
      title: "Cookie Theft Picture", 
      description: "Describe a complex picture scene to evaluate language, attention, and cognitive processing. A standard neuropsychological assessment.",
      icon: Mic,
      duration: "8-12 min",
      difficulty: "Medium" as const,
      status: "Available" as const,
    },
    {
      title: "Verbal Fluency Test", 
      description: "Test your language abilities by naming words from specific categories. Evaluate cognitive flexibility and language processing.",
      icon: Zap,
      duration: "5-8 min",
      difficulty: "Medium" as const,
      status: "Available" as const,
    },
    {
      title: "Trail Making Test",
      description: "Connect numbered and lettered circles in sequence. This test evaluates visual attention and task switching abilities.",
      icon: TrendingUp,
      duration: "8-12 min", 
      difficulty: "Medium" as const,
      status: "Available" as const,
    },
    {
      title: "Stroop Color Test",
      description: "Name colors while ignoring word meanings. This classic test measures cognitive control and processing speed.",
      icon: Zap,
      duration: "6-10 min",
      difficulty: "Hard" as const,
      status: "Available" as const,
    }
  ];

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged out successfully",
      description: "You have been logged out of your account.",
    });
    navigate("/login");
  };

  const getUserInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gradient-calm">
      {/* Header with User Profile */}
      <div className="border-b border-border/50 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-foreground">CogniCare</h1>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm">
                      {user?.full_name ? getUserInitials(user.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.full_name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                    <Badge variant="outline" className="w-fit mt-1 text-xs">
                      {user?.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <Card className="border-border/50 shadow-card">
            <CardContent className="p-8">
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <MayaAvatar size="xl" />
                <div className="flex-1 text-center lg:text-left">
                  <h1 className="text-3xl font-bold text-foreground mb-2">
                    Welcome back, {user?.full_name?.split(' ')[0] || 'Doctor'}!
                  </h1>
                  <p className="text-lg text-muted-foreground mb-4">
                    Hi! I'm Maya, your AI cognitive health assistant. I'm here to guide you through 
                    comprehensive brain assessments while ensuring you feel comfortable and supported.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                    <Badge variant="outline" className="bg-primary-soft text-primary border-primary/20">
                      <Brain className="w-3 h-3 mr-1" />
                      Cognitive Assessment
                    </Badge>
                    <Badge variant="outline" className="bg-secondary-soft text-secondary border-secondary/20">
                      <Mic className="w-3 h-3 mr-1" />
                      Speech Analysis
                    </Badge>
                    <Badge variant="outline" className="bg-accent-soft text-accent border-accent/20">
                      <User className="w-3 h-3 mr-1" />
                      Personalized Care
                    </Badge>
                  </div>
                </div>
                <div className="text-center">
                  <Button variant="medical" size="lg" onClick={() => handleStartAssessment("Quick")}>
                    Start Quick Assessment
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Begin with our 15-minute cognitive overview
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Assessments Completed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0</div>
              <p className="text-xs text-muted-foreground">
                +0 from last week
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">0 days</div>
              <p className="text-xs text-muted-foreground">
                Start your first assessment
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Next Reminder
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">Not set</div>
              <p className="text-xs text-muted-foreground">
                Schedule regular check-ins
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Assessment Tests */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">Available Assessments</h2>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {assessments.map((assessment, index) => (
              <AssessmentCard
                key={index}
                {...assessment}
                onStart={() => handleStartAssessment(assessment.title)}
              />
            ))}
          </div>
        </div>

        {/* Help Section */}
        <Card className="border-border/50 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-xl text-foreground">Getting Started</CardTitle>
            <CardDescription>
              New to cognitive assessments? Here's what you need to know.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">How it works</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Maya guides you through each assessment</li>
                  <li>• Complete tests at your own pace</li>
                  <li>• Speech and responses are analyzed</li>
                  <li>• Get personalized insights</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">Tips for best results</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Find a quiet, comfortable space</li>
                  <li>• Use headphones for clear audio</li>
                  <li>• Take breaks when needed</li>
                  <li>• Answer naturally and honestly</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};