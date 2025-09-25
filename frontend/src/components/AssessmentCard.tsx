import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AssessmentCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  duration: string;
  difficulty: "Easy" | "Medium" | "Hard";
  status?: "Available" | "In Progress" | "Completed" | "Locked";
  progress?: number;
  onStart: () => void;
  className?: string;
}

export const AssessmentCard = ({
  title,
  description,
  icon: Icon,
  duration,
  difficulty,
  status = "Available",
  progress = 0,
  onStart,
  className
}: AssessmentCardProps) => {
  const difficultyColors = {
    Easy: "bg-success/10 text-success border-success/20",
    Medium: "bg-warning/10 text-warning border-warning/20",
    Hard: "bg-destructive/10 text-destructive border-destructive/20"
  };

  const statusColors = {
    Available: "bg-primary/10 text-primary border-primary/20",
    "In Progress": "bg-accent/10 text-accent border-accent/20",
    Completed: "bg-success/10 text-success border-success/20",
    Locked: "bg-muted/10 text-muted-foreground border-muted/20"
  };

  const isDisabled = status === "Locked";

  return (
    <Card className={cn(
      "transition-smooth hover:shadow-card border-border/50",
      !isDisabled && "hover:border-primary/30 cursor-pointer",
      isDisabled && "opacity-60",
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center",
              !isDisabled ? "bg-gradient-primary" : "bg-muted"
            )}>
              <Icon className={cn(
                "w-6 h-6",
                !isDisabled ? "text-primary-foreground" : "text-muted-foreground"
              )} />
            </div>
            <div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className={difficultyColors[difficulty]}>
                  {difficulty}
                </Badge>
                <Badge variant="outline" className={statusColors[status]}>
                  {status}
                </Badge>
              </div>
            </div>
          </div>
          <span className="text-sm text-muted-foreground">{duration}</span>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <CardDescription className="text-sm leading-relaxed mb-4">
          {description}
        </CardDescription>

        {status === "In Progress" && progress > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress</span>
              <span className="text-foreground font-medium">{progress}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-gradient-primary h-2 rounded-full transition-smooth"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <Button
          onClick={onStart}
          disabled={isDisabled}
          variant={status === "Completed" ? "outline" : "medical"}
          className="w-full"
        >
          {status === "Available" && "Start Assessment"}
          {status === "In Progress" && "Continue"}
          {status === "Completed" && "Review Results"}
          {status === "Locked" && "Locked"}
        </Button>
      </CardContent>
    </Card>
  );
};