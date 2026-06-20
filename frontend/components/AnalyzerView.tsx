import React, { useState } from "react";
import { 
  Upload, Sliders, ShieldAlert, CheckCircle, 
  RefreshCw, Cpu, Award, Zap, Image as ImageIcon,
  X, Eye
} from "lucide-react";

export default function AnalyzerView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Lightbox modal state
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedType, setExpandedType] = useState<"preprocessed" | "annotated">("annotated");

  // Preprocessing options
  const [options, setOptions] = useState({
    lowLight: false,
    denoise: false,
    contrast: false
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const handleOptionToggle = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("preprocess_low_light", String(options.lowLight));
    formData.append("preprocess_denoise", String(options.denoise));
    formData.append("preprocess_contrast", String(options.contrast));

    try {
      const response = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server error during processing");
      }

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error analyzing frame: ", error);
      alert("Failed to analyze image. Please ensure backend FastAPI is active.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-background overflow-y-auto p-8 text-zinc-300">
      
      {/* Title Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white tracking-tight">Real-time Traffic Video Frame Analyzer</h2>
        <p className="text-sm text-zinc-400">Upload high-resolution camera feeds to run the computer vision infraction engine.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Upload and Preprocessing Controls */}
        <div className="space-y-6">
          
          {/* File Upload Selector Card */}
          <div className="bg-card border border-border p-6 shadow-sm">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <ImageIcon size={18} className="text-purple-400" />
              Source Image Selection
            </h4>
            
            {/* Drag & Drop Region */}
            <div className="border-2 border-dashed border-border p-6 hover:border-border/80 transition-colors flex flex-col items-center justify-center text-center cursor-pointer relative bg-background/30">
              <input 
                type="file" 
                onChange={handleFileChange}
                accept="image/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload size={32} className="text-zinc-500 mb-3" />
              <p className="text-xs text-zinc-400 font-medium">Drag and drop frame, or click to browse</p>
              <p className="text-[10px] text-zinc-600 mt-1">Supports JPEG, PNG up to 10MB</p>
            </div>

            {/* Selected File Preview */}
            {file && (
              <div className="mt-4 p-3 bg-background border border-border flex items-center gap-3">
                <div className="w-12 h-12 bg-card overflow-hidden shrink-0 border border-border">
                  <img src={previewUrl!} alt="Selected Preview" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-zinc-300 truncate">{file.name}</p>
                  <p className="text-[10px] text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            )}
          </div>

          {/* Preprocessing Filters Card */}
          <div className="bg-card border border-border p-6 shadow-sm">
            <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Sliders size={18} className="text-purple-400" />
              Image Preprocessing Filters
            </h4>
            <p className="text-xs text-zinc-500 mb-4 leading-relaxed">
              Enhance input quality and equalize colors to mitigate motion blur, night shadows, or weather disturbances.
            </p>

            <div className="space-y-3">
              {/* Low Light Enhancement */}
              <label className="flex items-center justify-between p-3 border border-border hover:bg-background/40 cursor-pointer transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-300">Low-Light Enhancement</p>
                  <p className="text-[10px] text-zinc-500">CLAHE L-Channel color equalizer</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={options.lowLight}
                  onChange={() => handleOptionToggle("lowLight")}
                  className="border-border/80 bg-background text-purple-600 focus:ring-purple-500 focus:ring-offset-background w-4 h-4"
                />
              </label>

              {/* Denoising */}
              <label className="flex items-center justify-between p-3 border border-border hover:bg-background/40 cursor-pointer transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-300">Bilateral Noise Filter</p>
                  <p className="text-[10px] text-zinc-500">Smoothes pixels while keeping edges sharp</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={options.denoise}
                  onChange={() => handleOptionToggle("denoise")}
                  className="border-border/80 bg-background text-purple-600 focus:ring-purple-500 focus:ring-offset-background w-4 h-4"
                />
              </label>

              {/* Contrast Auto Normalization */}
              <label className="flex items-center justify-between p-3 border border-border hover:bg-background/40 cursor-pointer transition-colors">
                <div>
                  <p className="text-xs font-semibold text-zinc-300">Contrast Normalization</p>
                  <p className="text-[10px] text-zinc-500">Auto-scales brightness limits</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={options.contrast}
                  onChange={() => handleOptionToggle("contrast")}
                  className="border-border/80 bg-background text-purple-600 focus:ring-purple-500 focus:ring-offset-background w-4 h-4"
                />
              </label>
            </div>

            {/* Run Pipeline CTA */}
            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className={`w-full mt-6 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                !file 
                  ? "bg-background text-zinc-600 cursor-not-allowed border border-border/50" 
                  : "bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold cursor-pointer"
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin text-zinc-950" size={16} />
                  Evaluating Video Frame...
                </>
              ) : (
                "Analyze Traffic Frame"
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Comparative Video Screen & Violation Results (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Visual Comparison Screen */}
          <div className="bg-card border border-border overflow-hidden shadow-sm min-h-[400px] flex flex-col">
            <div className="bg-background/60 p-4 border-b border-border flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Evidence Output</span>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 flex flex-col justify-center items-center bg-background/20 p-6 relative">
              {!result && !loading && (
                <div className="text-center p-8">
                  <ImageIcon size={48} className="text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-zinc-400">Evidence feed screen idle</p>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm">
                    Select a traffic photograph on the left panel, enable filters, and execute the analysis engine.
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center p-8 flex flex-col items-center">
                  <RefreshCw className="animate-spin text-purple-500 mb-4" size={36} />
                  <p className="text-sm font-semibold text-zinc-300">Processing computer vision pipeline...</p>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Executing object detection (YOLOv8), segmenting windshields, and reading plates (EasyOCR).
                  </p>
                </div>
              )}

              {result && !loading && (
                <div className="w-full flex flex-col gap-6">
                  {/* Image views tabs/comparative display */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                        Preprocessed Feed
                      </span>
                      <div 
                        onClick={() => { setExpandedType("preprocessed"); setIsExpanded(true); }}
                        className="border border-border overflow-hidden bg-card relative group cursor-pointer"
                      >
                        <img 
                          src={`http://127.0.0.1:8000/${result.preprocessed_image}`} 
                          alt="Preprocessed Frame" 
                          className="w-full aspect-video object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 gap-1.5 text-xs text-white font-semibold">
                          <Eye size={16} />
                          Expand View
                        </div>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">
                        Annotated Evidence Output
                      </span>
                      <div 
                        onClick={() => { setExpandedType("annotated"); setIsExpanded(true); }}
                        className="border border-border overflow-hidden bg-card relative group cursor-pointer"
                      >
                        <img 
                          src={`http://127.0.0.1:8000/${result.output_image}`} 
                          alt="Annotated Frame" 
                          className="w-full aspect-video object-contain"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 gap-1.5 text-xs text-white font-semibold">
                          <Eye size={16} />
                          Expand View
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Model Infractions & License Plate Metrics card */}
          {result && !loading && (
            <div className="bg-card border border-border p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
              
              {/* License Plate Details */}
              <div className="bg-background border border-border/80 p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">License Plate Recognition</span>
                  <div className="text-xl font-mono font-bold text-white tracking-widest mt-2 bg-card px-3 py-2 border border-border text-center uppercase">
                    {result.license_plate}
                  </div>
                </div>
                <div className="text-[10px] text-zinc-500 mt-2 flex items-center gap-1 font-semibold">
                  <Award size={12} className="text-purple-400" />
                  OCR engine: EasyOCR English
                </div>
              </div>

              {/* Infractions / Violations list */}
              <div className="bg-background border border-border/80 p-4 md:col-span-2 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Identified Traffic Infractions</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {result.violations.length > 0 ? (
                      result.violations.map((v: string) => (
                        <span 
                          key={v} 
                          className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 border border-red-500/20 font-semibold flex items-center gap-1.5"
                        >
                          <ShieldAlert size={12} className="text-red-400" />
                          {v}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 border border-emerald-500/20 font-semibold flex items-center gap-1.5">
                        <CheckCircle size={12} className="text-emerald-400" />
                        No Infractions Reported (Compliant)
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-border/80">
                  <span className="flex items-center gap-1">
                    <Cpu size={12} />
                    Model confidence: {Math.round(result.confidence * 100)}%
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap size={12} />
                    Latency: {result.processing_time_ms} ms
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Lightbox Modal / Expanded View */}
      {isExpanded && result && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm transition-all duration-300">
          <div className="bg-card border border-border w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Left Column: Image Viewer (2/3 width) */}
            <div className="flex-1 flex flex-col bg-background/40 border-r border-border/60 relative p-6 justify-between min-h-[350px]">
              
              {/* Image Header / Tab Selector */}
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {expandedType === "preprocessed" ? "Preprocessed Feed View" : "Annotated Evidence View"}
                </span>
                
                {/* View toggle */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => setExpandedType("preprocessed")}
                    className={`px-3 py-1.5 text-[10px] font-semibold transition-all ${
                      expandedType === "preprocessed" 
                        ? "bg-purple-600/10 text-purple-400 border border-purple-500"
                        : "bg-transparent text-zinc-400 hover:text-white border border-border"
                    }`}
                  >
                    Preprocessed
                  </button>
                  <button 
                    onClick={() => setExpandedType("annotated")}
                    className={`px-3 py-1.5 text-[10px] font-semibold transition-all ${
                      expandedType === "annotated" 
                        ? "bg-purple-600/10 text-purple-400 border border-purple-500"
                        : "bg-transparent text-zinc-400 hover:text-white border border-border"
                    }`}
                  >
                    Annotated Output
                  </button>
                </div>
              </div>

              {/* Large Image display */}
              <div className="flex-1 flex items-center justify-center overflow-hidden border border-border bg-background p-2">
                <img 
                  src={expandedType === "preprocessed" 
                    ? `http://127.0.0.1:8000/${result.preprocessed_image}` 
                    : `http://127.0.0.1:8000/${result.output_image}`
                  } 
                  alt="Expanded Capture" 
                  className="w-full h-full max-h-[60vh] object-contain"
                />
              </div>

            </div>

            {/* Right Column: Metadata & Infractions Panel (1/3 width) */}
            <div className="w-full md:w-80 flex flex-col justify-between bg-card p-6 border-t md:border-t-0 border-border">
              
              <div className="space-y-6">
                
                {/* Modal close & header */}
                <div className="flex items-center justify-between pb-3 border-b border-border/60">
                  <div>
                    <h3 className="font-bold text-white text-sm">Evidence Inspection</h3>
                    <p className="text-[10px] text-zinc-500 font-semibold">VisionCop AI Real-time Output</p>
                  </div>
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="p-1.5 hover:bg-background border border-border/40 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* License Plate Card */}
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Plate Number Recognition</span>
                  <div className="text-lg font-mono font-bold text-white tracking-widest mt-1.5 bg-background px-3 py-2.5 border border-border text-center uppercase">
                    {result.license_plate}
                  </div>
                </div>

                {/* Violations Summary */}
                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-1.5">Logged Infractions</span>
                  <div className="space-y-1.5">
                    {result.violations.length > 0 ? (
                      result.violations.map((v: string) => (
                        <div 
                          key={v} 
                          className="text-xs text-red-400 font-semibold flex items-center gap-1.5 p-2 bg-red-500/5 border border-red-500/10"
                        >
                          <ShieldAlert size={12} className="text-red-400" />
                          {v}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 p-2 bg-emerald-500/5 border border-emerald-500/10">
                        <CheckCircle size={12} className="text-emerald-400" />
                        No Infractions Reported (Compliant)
                      </div>
                    )}
                  </div>
                </div>

                {/* Metrics detail table */}
                <div className="p-3 bg-background border border-border space-y-2 text-[11px] text-zinc-400">
                  <p className="flex justify-between"><span>Location:</span> <span className="font-semibold text-white">Camera Intersection A-1</span></p>
                  <p className="flex justify-between">
                    <span>Model Confidence:</span> 
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Cpu size={10} className="text-purple-400" />
                      {Math.round(result.confidence * 100)}%
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Latency:</span> 
                    <span className="font-semibold text-white flex items-center gap-1">
                      <Zap size={10} className="text-amber-400" />
                      {result.processing_time_ms} ms
                    </span>
                  </p>
                </div>

              </div>

              {/* Close Button */}
              <div className="mt-8 pt-4 border-t border-border/60">
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Close Inspection
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
