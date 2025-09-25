import { useState } from "react";
import { Header } from "@/components/Header";
import { Dashboard } from "@/pages/Dashboard";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onSettingsClick={() => console.log("Settings clicked")}
      />
      <main>
        <Dashboard />
      </main>
    </div>
  );
};

export default Index;
