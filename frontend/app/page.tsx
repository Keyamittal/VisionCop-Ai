"use client";

import { useState } from "react";
import Sidebar from "../components/Sidebar";
import DashboardView from "../components/DashboardView";
import AnalyzerView from "../components/AnalyzerView";
import HistoryView from "../components/HistoryView";
import SplashScreen from "../components/SplashScreen";

export default function Home() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSplash, setShowSplash] = useState(true);
  const [historyFilters, setHistoryFilters] = useState<{
    search?: string;
    violationType?: string;
    vehicleType?: string;
    date?: string;
  } | null>(null);

  const handleSelectMetric = (metric: "infractions" | "compliance" | "today") => {
    if (metric === "infractions") {
      setHistoryFilters({ violationType: "INFRACTIONS" });
    } else if (metric === "compliance") {
      setHistoryFilters({ violationType: "COMPLIANT" });
    } else if (metric === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      setHistoryFilters({ date: todayStr });
    }
    setActiveTab("history");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView onSelectMetric={handleSelectMetric} />;
      case "analyzer":
        return <AnalyzerView />;
      case "history":
        return (
          <HistoryView 
            initialFilters={historyFilters} 
            onClearFilters={() => setHistoryFilters(null)} 
          />
        );
      default:
        return <DashboardView onSelectMetric={handleSelectMetric} />;
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar navigation */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          setHistoryFilters(null);
        }} 
      />
      
      {/* Content pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}