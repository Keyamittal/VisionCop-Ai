import React from "react";
import { LayoutDashboard, Camera, History, HelpCircle, ShieldAlert } from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const menuItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "analyzer", label: "Real-time Analyzer", icon: Camera },
    { id: "history", label: "Infractions Log", icon: History },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col justify-between h-screen sticky top-0">
      <div className="flex flex-col">
        {/* Brand Logo Header */}
        {/* Brand Logo Header */}
        <div className="p-6 border-b border-border flex items-center justify-center">
          <h1 
            className="font-bold text-lg text-white font-mono tracking-wider"
            style={{ textShadow: "0 0 15px rgba(255, 255, 255, 0.4)" }}
          >
            VisionCop AI
          </h1>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600/10 text-purple-400 border-l-2 border-purple-500 font-semibold"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-background"
                }`}
              >
                <Icon size={18} className={isActive ? "text-purple-400" : "text-zinc-400"} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 p-3 bg-background/50 border border-border/60">
          <div className="bg-background border border-border/80 p-1.5 text-zinc-400">
            <HelpCircle size={14} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-zinc-300 font-medium">Auto-detection</p>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></span>
              FastAPI: Online
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
