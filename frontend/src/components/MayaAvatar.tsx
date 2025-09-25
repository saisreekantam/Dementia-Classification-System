import { useState } from "react";
import mayaAvatar from "@/assets/maya-avatar.jpg";
import { cn } from "@/lib/utils";

interface MayaAvatarProps {
  size?: "sm" | "md" | "lg" | "xl";
  isListening?: boolean;
  className?: string;
}

export const MayaAvatar = ({ size = "md", isListening = false, className }: MayaAvatarProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24", 
    lg: "w-32 h-32",
    xl: "w-48 h-48"
  };

  return (
    <div className={cn("relative flex-shrink-0", className)}>
      <div 
        className={cn(
          "rounded-full overflow-hidden shadow-card transition-smooth",
          sizeClasses[size],
          isListening && "animate-pulse-soft ring-4 ring-primary/30"
        )}
      >
        <img
          src={mayaAvatar}
          alt="Maya AI Assistant"
          className={cn(
            "w-full h-full object-cover transition-smooth",
            !imageLoaded && "opacity-0",
            imageLoaded && "opacity-100"
          )}
          onLoad={() => setImageLoaded(true)}
        />
        {!imageLoaded && (
          <div className="w-full h-full bg-gradient-primary animate-pulse flex items-center justify-center">
            <span className="text-primary-foreground font-medium text-lg">M</span>
          </div>
        )}
      </div>
      
      {isListening && (
        <div className="absolute -bottom-1 -right-1">
          <div className="w-6 h-6 bg-success rounded-full border-2 border-background shadow-soft flex items-center justify-center">
            <div className="w-2 h-2 bg-success-foreground rounded-full animate-pulse-soft"></div>
          </div>
        </div>
      )}
    </div>
  );
};