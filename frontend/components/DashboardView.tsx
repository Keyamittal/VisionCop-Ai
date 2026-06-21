import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, Camera, Zap, CheckCircle2, 
  TrendingUp, BarChart3, AlertTriangle, Activity 
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend 
} from "recharts";

interface Stats {
  total_records: number;
  total_violations: number;
  compliance_rate_percent: number;
  average_processing_time_ms: number;
  today_records: number;
}

interface Analytics {
  timeline: Array<{ date: string; total: number; violations: number }>;
  violations: Array<{ type: string; count: number }>;
  vehicles: Array<{ category: string; count: number }>;
  model_performance: {
    mAP50: number;
    mAP50_95: number;
    precision: number;
    recall: number;
    f1_score: number;
    confidence_distribution: Array<{ range: string; count: number }>;
  };
}

interface DashboardViewProps {
  onSelectMetric?: (metric: "infractions" | "compliance" | "today") => void;
}

export default function DashboardView({ onSelectMetric }: DashboardViewProps = {}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const statsRes = await fetch("http://127.0.0.1:8000/statistics");
        const statsData = await statsRes.json();
        
        const analyticsRes = await fetch("http://127.0.0.1:8000/analytics");
        const analyticsData = await analyticsRes.json();
        
        setStats(statsData);
        setAnalytics(analyticsData);
        setError(null);
      } catch (err) {
        console.error("Error fetching dashboard statistics: ", err);
        setError("Failed to connect to backend server. Make sure FastAPI server is running on port 8000.");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full bg-background text-zinc-300 p-8 space-y-4">
        <Activity className="animate-spin text-purple-500" size={40} />
        <p className="text-sm font-medium">Fetching analytics dashboard info...</p>
      </div>
    );
  }

  if (error || !stats || !analytics) {
    return (
      <div className="flex-1 bg-background p-8 text-zinc-300 flex flex-col items-center justify-center">
        <div className="max-w-md text-center p-6 bg-card border border-border shadow-lg">
          <AlertTriangle className="text-amber-500 mx-auto mb-4" size={48} />
          <h3 className="font-bold text-lg text-white mb-2">Backend Connection Error</h3>
          <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
            {error || "Could not retrieve statistics database records."}
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold text-sm transition-colors"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Color scheme for pie charts (using lavender purple as the primary color)
  const PIE_COLORS = ["#e6e0ff", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6"];

  return (
    <div className="flex-1 bg-background overflow-y-auto p-8 text-zinc-300">
      
      {/* Title Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">System Performance & Analytics</h2>
        <p className="text-sm text-zinc-400">Automated evaluation scorecard and infraction trend reports.</p>
      </div>

      {/* Grid of Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        
        {/* Total Infractions Card */}
        <div 
          onClick={() => onSelectMetric?.("infractions")}
          className="bg-card border border-border/80 p-5 flex items-center gap-4 relative overflow-hidden group hover:border-border/80 transition-all duration-200 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-xl group-hover:bg-red-500/10 transition-colors"></div>
          <div className="p-3 bg-red-500/10 text-red-400">
            <ShieldAlert size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Total Infractions</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.total_violations}</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Found across {stats.total_records} captures</p>
          </div>
        </div>

        {/* Compliance Rate Card */}
        <div 
          onClick={() => onSelectMetric?.("compliance")}
          className="bg-card border border-border/80 p-5 flex items-center gap-4 relative overflow-hidden group hover:border-border/80 transition-all duration-200 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-xl group-hover:bg-emerald-500/10 transition-colors"></div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Compliance Rate</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.compliance_rate_percent}%</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">No infractions reported</p>
          </div>
        </div>

        {/* Today's Captures Card */}
        <div 
          onClick={() => onSelectMetric?.("today")}
          className="bg-card border border-border/80 p-5 flex items-center gap-4 relative overflow-hidden group hover:border-border/80 transition-all duration-200 cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-xl group-hover:bg-purple-500/10 transition-colors"></div>
          <div className="p-3 bg-purple-500/10 text-purple-400">
            <Camera size={22} />
          </div>
          <div>
            <p className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Today's Captures</p>
            <h3 className="text-2xl font-bold text-white mt-1">{stats.today_records}</h3>
            <p className="text-[10px] text-zinc-400 mt-0.5">Uploaded surveillance frames</p>
          </div>
        </div>

      </div>

      {/* Analytics Graphical Section */}
      {stats.total_records === 0 ? (
        <div className="bg-card border border-border/80 p-10 text-center flex flex-col items-center justify-center min-h-[350px]">
          <div className="bg-purple-600/10 p-4 text-purple-400 mb-4">
            <Camera size={36} />
          </div>
          <h4 className="text-lg font-bold text-white mb-2">No Traffic Feeds Analyzed Yet</h4>
          <p className="text-sm text-zinc-400 max-w-md leading-relaxed mb-6">
            The surveillance log is currently clean. Navigate to the <strong className="text-purple-400 font-semibold">Real-time Analyzer</strong> tab, upload active traffic camera photos, and configure filters to trigger real-time AI classification and log violations.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            
            {/* Timeline Trend Line Chart (Left: 2 Cols) */}
            <div className="bg-card border border-border/80 p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp size={18} className="text-purple-400" />
                <h4 className="font-semibold text-white">Daily Traffic Violations Trend</h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={analytics.timeline}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e6e0ff" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#e6e0ff" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorViolations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1836" />
                    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#110e24", borderColor: "#1d1836", borderRadius: "0px", color: "#fafafa" }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                    <Area type="monotone" dataKey="total" name="Total Captures" stroke="#e6e0ff" fillOpacity={1} fill="url(#colorTotal)" strokeWidth={2} />
                    <Area type="monotone" dataKey="violations" name="Reported Violations" stroke="#ef4444" fillOpacity={1} fill="url(#colorViolations)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Violations Category Pie Chart (Right: 1 Col) */}
            <div className="bg-card border border-border/80 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-indigo-400" />
                <h4 className="font-semibold text-white">Infractions Breakdown</h4>
              </div>
              <div className="h-[230px] flex items-center justify-center">
                {analytics.violations.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={analytics.violations}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="type"
                      >
                        {analytics.violations.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#110e24", borderColor: "#1d1836", borderRadius: "0px", color: "#fafafa" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-zinc-500 text-sm">No infractions logged yet.</p>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                {analytics.violations.map((item, idx) => (
                  <div key={item.type} className="flex items-center gap-1.5 truncate">
                    <span 
                      className="w-2.5 h-2.5 shrink-0 animate-pulse" 
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    ></span>
                    <span className="text-zinc-400 text-[11px] truncate" title={item.type}>
                      {item.type} ({item.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Lower Row: Vehicle distribution + Model evaluation scores */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Vehicles Breakdown Bar Chart (Left: 2 Cols) */}
            <div className="bg-card border border-border/80 p-6 lg:col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 size={18} className="text-purple-400" />
                <h4 className="font-semibold text-white">Vehicle Category Incident Distribution</h4>
              </div>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.vehicles}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1836" />
                    <XAxis dataKey="category" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis stroke="#71717a" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: "#110e24", borderColor: "#1d1836", borderRadius: "0px", color: "#fafafa" }}
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    />
                    <Bar dataKey="count" name="Incidents Logged" fill="#e2d8ff" radius={[0, 0, 0, 0]}>
                      {analytics.vehicles.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Model Evaluation Metrics Scorecard */}
            <div className="bg-card border border-border/80 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Activity size={18} className="text-emerald-400" />
                <h4 className="font-semibold text-white">AI Evaluation Scorecard</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-background border border-border text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">mAP@50</span>
                  <p className="text-xl font-bold text-white mt-1">{(analytics.model_performance.mAP50 * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-background border border-border text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">F1-Score</span>
                  <p className="text-xl font-bold text-white mt-1">{(analytics.model_performance.f1_score * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-background border border-border text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Precision</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{(analytics.model_performance.precision * 100).toFixed(0)}%</p>
                </div>
                <div className="p-3 bg-background border border-border text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">Recall</span>
                  <p className="text-xl font-bold text-purple-400 mt-1">{(analytics.model_performance.recall * 100).toFixed(0)}%</p>
                </div>
              </div>

              <div>
                <h5 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3">Model Confidence Spread</h5>
                <div className="space-y-2">
                  {analytics.model_performance.confidence_distribution.map((item) => (
                    <div key={item.range} className="flex items-center gap-3 text-xs">
                      <span className="w-12 text-zinc-400 shrink-0">{item.range}</span>
                      <div className="flex-1 bg-background border border-border/40 h-2 overflow-hidden">
                        <div 
                          className="bg-purple-500 h-full" 
                          style={{ width: `${(item.count / 25) * 100}%` }}
                        ></div>
                      </div>
                      <span className="w-6 text-right text-zinc-500 shrink-0 font-medium">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}
