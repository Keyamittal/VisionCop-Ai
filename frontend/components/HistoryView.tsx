import React, { useState, useEffect } from "react";
import { 
  Search, Filter, ShieldAlert, CheckCircle, 
  X, ArrowLeft, ArrowRight, Activity, Zap 
} from "lucide-react";

interface Record {
  id: number;
  filename: string;
  preprocessed_filename: string;
  annotated_filename: string;
  timestamp: string;
  location: string;
  vehicle_type: string;
  violations: string[];
  license_plate: string;
  confidence: number;
  processing_time_ms: number;
}

interface HistoryViewProps {
  initialFilters?: {
    search?: string;
    violationType?: string;
    vehicleType?: string;
    date?: string;
  } | null;
  onClearFilters?: () => void;
}

export default function HistoryView({ initialFilters, onClearFilters }: HistoryViewProps = {}) {
  const [records, setRecords] = useState<Record[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const limit = 10;

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [violationType, setViolationType] = useState("");
  const [vehicleType, setVehicleType] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  
  // Selected detail modal record
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);

  useEffect(() => {
    if (initialFilters) {
      setSearch(initialFilters.search || "");
      setViolationType(initialFilters.violationType || "");
      setVehicleType(initialFilters.vehicleType || "");
      setDateFilter(initialFilters.date || "");
      setOffset(0);
    }
  }, [initialFilters]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/violations?limit=${limit}&offset=${offset}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (violationType) url += `&violation_type=${encodeURIComponent(violationType)}`;
      if (vehicleType) url += `&vehicle_type=${encodeURIComponent(vehicleType)}`;
      if (dateFilter) url += `&date=${encodeURIComponent(dateFilter)}`;

      const response = await fetch(url);
      const data = await response.json();
      setRecords(data.data);
      setTotal(data.total);
    } catch (error) {
      console.error("Error fetching violations log list: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [offset, violationType, vehicleType, dateFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchRecords();
  };

  const handleResetFilters = () => {
    setSearch("");
    setViolationType("");
    setVehicleType("");
    setDateFilter("");
    setOffset(0);
    if (onClearFilters) onClearFilters();
    // Explicitly call load after reset next tick
    setTimeout(() => {
      fetchRecords();
    }, 0);
  };

  const formatTimestamp = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch {
      return isoStr;
    }
  };

  // Predefined violation filter tags
  const VIOLATION_OPTIONS = [
    "No Helmet",
    "Triple Riding",
    "Seatbelt Violation",
    "Red Light Violation",
    "Wrong-way Driving",
    "Stop Line Crossing",
    "Illegal Parking"
  ];

  const VEHICLE_OPTIONS = [
    "Motorcycle",
    "Car",
    "Truck",
    "Bus",
    "Auto Rickshaw"
  ];

  return (
    <div className="flex-1 bg-background overflow-y-auto p-8 text-zinc-300">
      
      {/* Title Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Infraction Logs & Evidence History</h2>
        <p className="text-sm text-zinc-400">Searchable ledger of all captured vehicles and traffic warnings.</p>
      </div>

      {/* Filter and Search Bar Card */}
      <div className="bg-card border border-border p-5 mb-6 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Keyword Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
            <input
              type="text"
              placeholder="Search plate or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background border border-border/80 pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          {/* Selector dropdowns */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
            
            {/* Date filter pill */}
            {dateFilter && (
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1.5 font-semibold flex items-center gap-1 shrink-0">
                Date: {dateFilter}
                <button 
                  type="button" 
                  onClick={() => { setDateFilter(""); if (onClearFilters) onClearFilters(); }} 
                  className="hover:text-white cursor-pointer ml-1"
                >
                  <X size={10} />
                </button>
              </span>
            )}

            {/* Infraction Category */}
            <div className="relative shrink-0">
              <select
                value={violationType}
                onChange={(e) => {
                  setOffset(0);
                  setViolationType(e.target.value);
                }}
                className="bg-background border border-border pl-3 pr-8 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 cursor-pointer appearance-none"
              >
                <option value="">All Records</option>
                <option value="INFRACTIONS">All Infractions Only</option>
                <option value="COMPLIANT">No Infractions (Compliant)</option>
                {VIOLATION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Vehicle Type */}
            <div className="relative shrink-0">
              <select
                value={vehicleType}
                onChange={(e) => {
                  setOffset(0);
                  setVehicleType(e.target.value);
                }}
                className="bg-background border border-border pl-3 pr-8 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-purple-500 cursor-pointer appearance-none"
              >
                <option value="">All Vehicles</option>
                {VEHICLE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Action CTAs */}
            <button
              type="submit"
              className="px-4 py-2.5 bg-card hover:bg-background border border-border text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              Search
            </button>

            {(search || violationType || vehicleType || dateFilter) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2.5 text-zinc-500 hover:text-zinc-300 text-xs font-semibold cursor-pointer"
              >
                Reset Filters
              </button>
            )}

          </div>

        </form>
      </div>

      {/* Main Table Card */}
      <div className="bg-card border border-border overflow-hidden shadow-sm">
        
        {loading ? (
          <div className="p-16 flex flex-col items-center justify-center text-zinc-400 space-y-3">
            <Activity className="animate-spin text-purple-500" size={32} />
            <span className="text-xs font-semibold">Updating traffic records...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-16 text-center text-zinc-500">
            <ShieldAlert size={36} className="mx-auto mb-2 text-zinc-700" />
            <p className="text-sm font-semibold">No records match filter options.</p>
            <p className="text-xs text-zinc-600 mt-1">Try resetting parameters or executing a new analysis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-background/60 border-b border-border text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  <th className="py-4 px-5 w-16">Preview</th>
                  <th className="py-4 px-5">Timestamp</th>
                  <th className="py-4 px-5">Location</th>
                  <th className="py-4 px-5">Vehicle</th>
                  <th className="py-4 px-5">Plate Number</th>
                  <th className="py-4 px-5">Violations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-xs">
                {records.map((rec) => {
                  const hasViolations = rec.violations.length > 0;
                  
                  // Use appropriate image fallback
                  // If seeded, we use a placeholder or check prefix. If it's a seed image, fallback to bike_test.jpg for the frontend preview
                  // to avoid loading blank dummy paths
                  const isSeedImage = rec.filename.includes("seed_image");
                  const annotatedUrl = isSeedImage 
                    ? "http://127.0.0.1:8000/uploads/annotated_bike_test.jpg"
                    : `http://127.0.0.1:8000/${rec.annotated_filename}`;

                  return (
                    <tr 
                      key={rec.id} 
                      onClick={() => setSelectedRecord(rec)}
                      className="hover:bg-background/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5">
                        <div className="w-10 h-7 overflow-hidden border border-border bg-background shrink-0">
                          <img src={annotatedUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-zinc-300 font-medium">
                        {formatTimestamp(rec.timestamp)}
                      </td>
                      <td className="py-3.5 px-5 text-zinc-400">
                        {rec.location}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="bg-background text-zinc-300 px-2 py-0.5 text-[11px] font-medium border border-border">
                          {rec.vehicle_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-semibold tracking-wider text-zinc-200">
                        {rec.license_plate}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {hasViolations ? (
                            rec.violations.map(v => (
                              <span key={v} className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 border border-red-500/15 font-semibold">
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 border border-emerald-500/15 font-semibold">
                              Compliant
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {total > limit && (
          <div className="bg-background/40 border-t border-border p-4 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Showing <strong className="text-zinc-300">{offset + 1}</strong> to{" "}
              <strong className="text-zinc-300">{Math.min(offset + limit, total)}</strong> of{" "}
              <strong className="text-zinc-300">{total}</strong> infractions
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(prev => Math.max(0, prev - limit))}
                disabled={offset === 0}
                className={`p-1.5 border border-border flex items-center justify-center ${
                  offset === 0 
                    ? "text-zinc-700 border-border/20 cursor-not-allowed" 
                    : "text-zinc-300 hover:bg-background hover:text-white cursor-pointer"
                }`}
              >
                <ArrowLeft size={16} />
              </button>
              <button
                onClick={() => setOffset(prev => (prev + limit < total ? prev + limit : prev))}
                disabled={offset + limit >= total}
                className={`p-1.5 border border-border flex items-center justify-center ${
                  offset + limit >= total 
                    ? "text-zinc-700 border-border/20 cursor-not-allowed" 
                    : "text-zinc-300 hover:bg-background hover:text-white cursor-pointer"
                }`}
              >
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Record details overlays Modal */}
      {selectedRecord && (() => {
        const isSeedImage = selectedRecord.filename.includes("seed_image");
        const annotatedUrl = isSeedImage 
          ? "http://127.0.0.1:8000/uploads/annotated_bike_test.jpg"
          : `http://127.0.0.1:8000/${selectedRecord.annotated_filename}`;
        const prepUrl = isSeedImage
          ? "http://127.0.0.1:8000/uploads/preprocessed_bike_test.jpg"
          : `http://127.0.0.1:8000/${selectedRecord.preprocessed_filename}`;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
            <div className="bg-card border border-border w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
              
              {/* Modal Header */}
              <div className="bg-background p-4 border-b border-border flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-sm">Evidence Record Detail — Log #{selectedRecord.id}</h3>
                  <p className="text-[10px] text-zinc-500 font-semibold">{formatTimestamp(selectedRecord.timestamp)}</p>
                </div>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1.5 hover:bg-background border border-border/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Images side-by-side (2 Cols) */}
                <div className="md:col-span-2 space-y-4">
                  <div>
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                      Annotated Bounding Boxes / OCR Output
                    </span>
                    <div className="border border-border overflow-hidden bg-background">
                      <img src={annotatedUrl} alt="Annotated Capture" className="w-full aspect-video object-contain" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                        Preprocessed Camera Feed
                      </span>
                      <div className="border border-border overflow-hidden bg-background">
                        <img src={prepUrl} alt="Preprocessed Feed" className="w-full aspect-video object-contain" />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">
                        Physical Metadata Details
                      </span>
                      <div className="p-3 bg-background border border-border h-[95px] flex flex-col justify-between text-[11px] text-zinc-400">
                        <p className="flex justify-between"><span>Location:</span> <span className="font-medium text-white">{selectedRecord.location}</span></p>
                        <p className="flex justify-between"><span>Speed:</span> <span className="font-medium text-white">{selectedRecord.processing_time_ms} ms</span></p>
                        <p className="flex justify-between"><span>Model Confidence:</span> <span className="font-medium text-white">{Math.round(selectedRecord.confidence * 100)}%</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info and Statistics Sidebar (1 Col) */}
                <div className="flex flex-col justify-between h-full bg-background/40 border border-border p-5">
                  <div className="space-y-6">
                    {/* License Plate Card */}
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Plate Number Recognition</span>
                      <div className="text-lg font-mono font-bold text-white tracking-widest mt-1.5 bg-card px-3 py-2.5 border border-border text-center uppercase">
                        {selectedRecord.license_plate}
                      </div>
                    </div>

                    {/* Vehicle Type Card */}
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Vehicle Type</span>
                      <span className="bg-blue-600/10 text-blue-400 text-xs font-semibold px-2.5 py-1 border border-blue-500/20">
                        {selectedRecord.vehicle_type}
                      </span>
                    </div>

                    {/* Violations Summary */}
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Logged Warnings</span>
                      <div className="space-y-1.5">
                        {selectedRecord.violations.length > 0 ? (
                          selectedRecord.violations.map(v => (
                            <div 
                              key={v} 
                              className="text-xs text-red-400 font-medium flex items-center gap-1.5 p-1.5 bg-red-500/5 border border-red-500/10"
                            >
                              <ShieldAlert size={12} className="text-red-400" />
                              {v}
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-emerald-400 font-medium flex items-center gap-1.5 p-1.5 bg-emerald-500/5 border border-emerald-500/10">
                            <CheckCircle size={12} className="text-emerald-400" />
                            Compliant — No Infraction
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 text-[10px] text-zinc-500 border-t border-border pt-3 flex items-center gap-1.5">
                    <Zap size={10} />
                    Verified by VisionCop Rule-Engine
                  </div>

                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
