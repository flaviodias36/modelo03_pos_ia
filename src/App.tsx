import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ImportCSV from "./pages/ImportCSV";
import TrainModel from "./pages/TrainModel";
import TestRecommendation from "./pages/TestRecommendation";
import TechnicalExplanation from "./pages/TechnicalExplanation";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <div className="flex min-h-screen w-full">
          <Sidebar />
          <div className="flex-1 ml-[260px] transition-all duration-300">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/import" element={<ImportCSV />} />
              <Route path="/train" element={<TrainModel />} />
              <Route path="/recommend" element={<TestRecommendation />} />
              <Route path="/explanation" element={<TechnicalExplanation />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
