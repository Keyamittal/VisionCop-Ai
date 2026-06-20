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

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "analyzer":
        return <AnalyzerView />;
      case "history":
        return <HistoryView />;
      default:
        return <DashboardView />;
    }
  };

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      {/* Sidebar navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Content pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </div>
  );
}