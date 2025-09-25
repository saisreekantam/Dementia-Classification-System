import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { MemoryAssessment } from "./pages/MemoryAssessment";
import { CookieTheftAssessment } from "./pages/CookieTheftAssessment";
import { VerbalFluencyAssessment } from "./pages/VerbalFluencyAssessment";
import { TrailMakingAssessment } from "./pages/TrailMakingAssessment";
import { StroopColorAssessment } from "./pages/StroopColorAssessment";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assessment/memory" 
              element={
                <ProtectedRoute>
                  <MemoryAssessment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assessment/cookie-theft" 
              element={
                <ProtectedRoute>
                  <CookieTheftAssessment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assessment/verbal-fluency" 
              element={
                <ProtectedRoute>
                  <VerbalFluencyAssessment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assessment/trail-making" 
              element={
                <ProtectedRoute>
                  <TrailMakingAssessment />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/assessment/stroop-color" 
              element={
                <ProtectedRoute>
                  <StroopColorAssessment />
                </ProtectedRoute>
              } 
            />
            
            {/* Legacy route for backward compatibility */}
            <Route path="/index" element={<Navigate to="/dashboard" replace />} />
            
            {/* Catch-all route for 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
