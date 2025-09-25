import { Brain, Menu, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MayaAvatar } from "@/components/MayaAvatar";

interface HeaderProps {
  onMenuClick?: () => void;
  onSettingsClick?: () => void;
}

export const Header = ({ onMenuClick, onSettingsClick }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onMenuClick}
            className="lg:hidden"
          >
            <Menu />
          </Button>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">CogniCare</h1>
              <p className="text-xs text-muted-foreground">AI Cognitive Assessment</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-3">
            <MayaAvatar size="sm" />
            <div className="text-right">
              <p className="text-sm font-medium text-foreground">Maya</p>
              <p className="text-xs text-muted-foreground">Your AI Assistant</p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onSettingsClick}
          >
            <Settings />
          </Button>
        </div>
      </div>
    </header>
  );
};