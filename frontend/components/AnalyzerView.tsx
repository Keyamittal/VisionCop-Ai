import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, Sliders, ShieldAlert, CheckCircle, 
  RefreshCw, Cpu, Award, Zap, Image as ImageIcon,
  X, Eye, Play, Pause, Camera as CameraIcon
} from "lucide-react";

export default function AnalyzerView() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Mode Selection: Single Frame vs Live Video Stream
  const [analyzerMode, setAnalyzerMode] = useState<"image" | "video">("image");
  
  // Video & Webcam states
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamImage, setStreamImage] = useState<string | null>(null);
  
  // Realtime ticker and metrics
  const [tickerLogs, setTickerLogs] = useState<Array<{ id: string; plate: string; violations: string[]; timestamp: string }>>([]);
  const [activePlate, setActivePlate] = useState("SEARCHING...");
  const [activeViolations, setActiveViolations] = useState<string[]>([]);
  const [activeConfidence, setActiveConfidence] = useState(0.85);
  const [activeVehicles, setActiveVehicles] = useState<string[]>([]);

  // ROI Calibration states
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [roiSettings, setRoiSettings] = useState({
    stop_line_ratio: 0.65,
    wrong_way_ratio: 0.75,
    illegal_parking_ratio: 0.22
  });

  // Lightbox modal state
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedType, setExpandedType] = useState<"preprocessed" | "annotated">("annotated");

  // Preprocessing options
  const [options, setOptions] = useState({
    lowLight: false,
    denoise: false,
    contrast: false
  });

  // Refs for video frame polling
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamIntervalRef = useRef<any | null>(null);

  // Load ROI config on mount
  useEffect(() => {
    fetch("http://127.0.0.1:8000/config/roi")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setRoiSettings({
            stop_line_ratio: data.stop_line_ratio ?? 0.65,
            wrong_way_ratio: data.wrong_way_ratio ?? 0.75,
            illegal_parking_ratio: data.illegal_parking_ratio ?? 0.22
          });
        }
      })
      .catch(err => console.error("Failed to load ROI config on mount:", err));
  }, []);

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

  // Start webcam feed
  const startWebcam = async () => {
    try {
      resetVideoState();
      setIsWebcamActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Webcam start failed:", err);
      alert("Could not access camera. Please verify permissions.");
      setIsWebcamActive(false);
    }
  };

  // Stop webcam feed
  const stopWebcam = () => {
    setIsWebcamActive(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Reset all video stream parameters
  const resetVideoState = () => {
    stopStreaming();
    stopWebcam();
    setVideoFile(null);
    setVideoPreviewUrl(null);
    setStreamImage(null);
    setActivePlate("SEARCHING...");
    setActiveViolations([]);
    setActiveVehicles([]);
  };

  // Connect to WS and send frames
  const startStreaming = () => {
    if (isStreaming) return;
    
    const ws = new WebSocket("ws://127.0.0.1:8000/ws/video");
    wsRef.current = ws;
    setIsStreaming(true);

    ws.onopen = () => {
      console.log("WebSocket video pipeline connected");
      
      // Grab and send frames at ~3 FPS
      streamIntervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current || ws.readyState !== WebSocket.OPEN) return;
        
        const canvas = canvasRef.current;
        const video = videoRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL("image/jpeg", 0.6);
        
        ws.send(JSON.stringify({
          image: base64Image,
          filters: {
            lowLight: options.lowLight,
            denoise: options.denoise,
            contrast: options.contrast
          }
        }));
      }, 333);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.image) {
          setStreamImage(payload.image);
          setActivePlate(payload.license_plate);
          setActiveViolations(payload.violations || []);
          setActiveConfidence(payload.confidence ?? 0.85);
          setActiveVehicles(payload.vehicles_detected || []);

          // Push new unique infractions to ticker logs
          if (payload.license_plate && payload.license_plate !== "NOT DETECTED" && payload.violations.length > 0) {
            setTickerLogs(prev => {
              const exists = prev.some(l => l.plate === payload.license_plate && JSON.stringify(l.violations) === JSON.stringify(payload.violations));
              if (exists) return prev;
              
              return [
                {
                  id: Math.random().toString(),
                  plate: payload.license_plate,
                  violations: payload.violations,
                  timestamp: new Date().toLocaleTimeString()
                },
                ...prev.slice(0, 9)
              ];
            });
          }
        }
      } catch (err) {
        console.error("Failed to parse WS payload:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WS stream error:", err);
    };

    ws.onclose = () => {
      console.log("WebSocket video pipeline disconnected");
      stopStreaming();
    };
  };

  const stopStreaming = () => {
    setIsStreaming(false);
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  };

  const saveCalibration = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/config/roi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roiSettings)
      });
      if (!response.ok) throw new Error("Save config failed");
      alert("ROI Calibration settings saved successfully!");
      setCalibrationMode(false);
    } catch (err) {
      console.error("Failed to save ROI settings: ", err);
      alert("Failed to save ROI settings.");
    }
  };

  return (
    <div className="flex-1 bg-background overflow-y-auto p-8 text-zinc-300">
      
      {/* Title Header with Mode Toggle */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Real-time Traffic Video Frame Analyzer</h2>
          <p className="text-sm text-zinc-400">Upload high-resolution camera feeds or start live streams to run the computer vision infraction engine.</p>
        </div>
        
        {/* Toggle Mode Button */}
        <div className="flex gap-1.5 bg-card p-1 border border-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => { setAnalyzerMode("image"); resetVideoState(); }}
            className={`px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              analyzerMode === "image"
                ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Single Frame
          </button>
          <button
            onClick={() => { setAnalyzerMode("video"); setFile(null); setPreviewUrl(null); setResult(null); }}
            className={`px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              analyzerMode === "video"
                ? "bg-purple-600/10 text-purple-400 border border-purple-500/20"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Live Video Stream
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column Controls */}
        <div className="space-y-6">
          
          {/* Mode Specific Controls */}
          {analyzerMode === "image" ? (
            /* --- IMAGE MODE CONTROLS --- */
            <div className="bg-card border border-border p-6 shadow-sm">
              <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                <ImageIcon size={18} className="text-purple-400" />
                Source Image Selection
              </h4>
              
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
          ) : (
            /* --- VIDEO STREAM MODE CONTROLS --- */
            <div className="bg-card border border-border p-6 shadow-sm space-y-4">
              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                <CameraIcon size={18} className="text-purple-400" />
                Live Video Source
              </h4>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={isWebcamActive ? stopWebcam : startWebcam}
                  className={`py-2 text-xs font-semibold border transition-all cursor-pointer ${
                    isWebcamActive
                      ? "bg-red-500/10 text-red-400 border-red-500/30"
                      : "bg-background text-zinc-300 hover:text-white border-border"
                  }`}
                >
                  {isWebcamActive ? "Stop Webcam" : "Use Live Webcam"}
                </button>
                
                <div className="relative border border-border hover:border-border/80 transition-colors flex items-center justify-center text-center cursor-pointer bg-background">
                  <input 
                    type="file" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        stopWebcam();
                        setVideoFile(file);
                        setVideoPreviewUrl(URL.createObjectURL(file));
                        setStreamImage(null);
                      }
                    }}
                    accept="video/*"
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-xs text-zinc-300 font-semibold">Upload MP4 File</span>
                </div>
              </div>

              {videoFile && (
                <div className="p-3 bg-background border border-border flex items-center justify-between">
                  <p className="text-xs font-semibold text-zinc-300 truncate max-w-[80%]">{videoFile.name}</p>
                  <button onClick={() => { setVideoFile(null); setVideoPreviewUrl(null); }} className="text-zinc-500 hover:text-white">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

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
            {analyzerMode === "image" ? (
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
            ) : (
              <button
                onClick={isStreaming ? stopStreaming : startStreaming}
                disabled={!isWebcamActive && !videoFile}
                className={`w-full mt-6 py-3 text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                  (!isWebcamActive && !videoFile)
                    ? "bg-background text-zinc-600 cursor-not-allowed border border-border/50"
                    : isStreaming
                      ? "bg-red-600 hover:bg-red-500 text-zinc-950 font-bold cursor-pointer"
                      : "bg-purple-600 hover:bg-purple-500 text-zinc-950 font-bold cursor-pointer"
                }`}
              >
                {isStreaming ? (
                  <>
                    <RefreshCw className="animate-spin text-zinc-950 font-bold" size={16} />
                    Stop Inference Stream
                  </>
                ) : (
                  "Start Stream Inference"
                )}
              </button>
            )}
          </div>

          {/* Camera Calibration Card */}
          <div className="bg-card border border-border p-6 shadow-sm">
            <h4 className="font-semibold text-white mb-2 flex items-center justify-between text-sm">
              <span>Camera Calibration (ROI)</span>
              <button
                onClick={() => setCalibrationMode(!calibrationMode)}
                className={`px-2 py-1 text-[9px] font-bold border transition-colors cursor-pointer ${
                  calibrationMode 
                    ? "bg-purple-600/10 text-purple-400 border-purple-500/50" 
                    : "bg-transparent text-zinc-400 border-border hover:text-white"
                }`}
              >
                {calibrationMode ? "Exit Calibration" : "Calibrate Lines"}
              </button>
            </h4>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Configure Stop Line and Lane borders to align infractions with this camera's viewpoint.
            </p>
            {calibrationMode && (
              <p className="text-[10px] text-purple-400 font-semibold mt-3 p-2 bg-purple-600/5 border border-purple-500/10">
                Calibration lines active. Adjust settings using the interactive control panel below the visual canvas.
              </p>
            )}
          </div>

        </div>

        {/* Right Column Canvas / Evidence Screens */}
        <div className="lg:col-span-2 space-y-6">
          
          {analyzerMode === "image" ? (
            /* --- IMAGE ANALYSIS SCREEN --- */
            <div className="space-y-6">
              <div className="bg-card border border-border overflow-hidden shadow-sm min-h-[400px] flex flex-col relative">
                <div className="bg-background/60 p-4 border-b border-border flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Evidence Output</span>
                </div>

                <div className="flex-1 flex flex-col justify-center items-center bg-background/20 p-6 relative">
                  {/* Calibration Overlay Lines */}
                  {calibrationMode && (
                    <div className="absolute inset-0 pointer-events-none z-10 w-full h-full">
                      <div 
                        className="absolute left-0 right-0 h-[2px] bg-indigo-300/80 flex items-center"
                        style={{ top: `${roiSettings.stop_line_ratio * 100}%` }}
                      >
                        <span className="bg-indigo-900/95 text-indigo-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md ml-4 border border-indigo-500/20">VIRTUAL STOP LINE</span>
                      </div>
                      <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-rose-400/80 flex justify-center items-start"
                        style={{ left: `${roiSettings.wrong_way_ratio * 100}%` }}
                      >
                        <span className="bg-rose-955/95 text-rose-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md mt-24 border border-rose-500/20 whitespace-nowrap">WRONG WAY ZONE (RIGHT)</span>
                      </div>
                      <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-amber-300/80 flex justify-center items-start"
                        style={{ left: `${roiSettings.illegal_parking_ratio * 100}%` }}
                      >
                        <span className="bg-amber-955/95 text-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md mt-16 border border-amber-500/20 whitespace-nowrap">ILLEGAL PARKING ZONE (LEFT)</span>
                      </div>
                    </div>
                  )}

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

              {result && !loading && (
                <div className="bg-card border border-border p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
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
          ) : (
            /* --- VIDEO STREAM AND LIVE ALERT TICKER --- */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                
                {/* Main Video View Screen */}
                <div className="bg-card border border-border overflow-hidden shadow-sm min-h-[350px] flex flex-col relative">
                  <div className="bg-background/60 p-4 border-b border-border flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Live Video Stream Inference</span>
                    {isStreaming && (
                      <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/25 px-2 py-0.5 font-bold animate-pulse">
                        LIVE PIPELINE STREAM
                      </span>
                    )}
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center bg-background/20 relative p-4 min-h-[300px]">
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* Visual Calibration Overlay Lines */}
                    {calibrationMode && (
                      <div className="absolute inset-0 pointer-events-none z-10 w-full h-full">
                        <div 
                          className="absolute left-0 right-0 h-[2px] bg-indigo-300/80 flex items-center"
                          style={{ top: `${roiSettings.stop_line_ratio * 100}%` }}
                        >
                          <span className="bg-indigo-900/95 text-indigo-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md ml-4 border border-indigo-500/20">VIRTUAL STOP LINE</span>
                        </div>
                        <div 
                          className="absolute top-0 bottom-0 w-[2px] bg-rose-400/80 flex justify-center items-start"
                          style={{ left: `${roiSettings.wrong_way_ratio * 100}%` }}
                        >
                          <span className="bg-rose-955/95 text-rose-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md mt-24 border border-rose-500/20 whitespace-nowrap">WRONG WAY ZONE (RIGHT)</span>
                        </div>
                        <div 
                          className="absolute top-0 bottom-0 w-[2px] bg-amber-300/80 flex justify-center items-start"
                          style={{ left: `${roiSettings.illegal_parking_ratio * 100}%` }}
                        >
                          <span className="bg-amber-955/95 text-amber-200 text-[8px] font-bold px-1.5 py-0.5 rounded-sm shadow-md mt-16 border border-amber-500/20 whitespace-nowrap">ILLEGAL PARKING ZONE (LEFT)</span>
                        </div>
                      </div>
                    )}

                    <video
                      ref={videoRef}
                      src={videoPreviewUrl || undefined}
                      controls={!!videoPreviewUrl}
                      loop
                      muted
                      className={`w-full aspect-video border border-border ${
                        streamImage ? "hidden" : "block"
                      }`}
                      style={{ maxHeight: "300px" }}
                    />

                    {streamImage && (
                      <div className="w-full relative">
                        <img 
                          src={streamImage} 
                          alt="Live Pipeline Stream" 
                          className="w-full aspect-video object-contain border border-border bg-background"
                        />
                      </div>
                    )}
                    
                    {!videoPreviewUrl && !isWebcamActive && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
                        <CameraIcon size={48} className="text-zinc-700 mb-3" />
                        <p className="text-sm font-semibold text-zinc-400">No active video stream feed</p>
                        <p className="text-xs text-zinc-600 mt-1">Activate the webcam or upload a traffic recording to stream.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live telemetry metadata stats */}
                {(streamImage || isStreaming) && (
                  <div className="bg-card border border-border p-6 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-sm">
                    <div className="bg-background border border-border/80 p-4">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Plate Tracker</span>
                      <div className="text-xl font-mono font-bold text-white tracking-widest mt-2 bg-card px-3 py-2 border border-border text-center uppercase">
                        {activePlate}
                      </div>
                    </div>
                    
                    <div className="bg-background border border-border/80 p-4 md:col-span-2 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Detected Infractions</span>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {activeViolations.length > 0 ? (
                            activeViolations.map(v => (
                              <span key={v} className="text-xs bg-red-500/10 text-red-400 px-2.5 py-1 border border-red-500/20 font-semibold flex items-center gap-1">
                                <ShieldAlert size={12} />
                                {v}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2.5 py-1 border border-emerald-500/20 font-semibold flex items-center gap-1">
                              <CheckCircle size={12} />
                              Safe / Compliant
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-border/80">
                        <span>Confidence: {Math.round(activeConfidence * 100)}%</span>
                        <span className="truncate">Vehicles: {activeVehicles.join(", ") || "None"}</span>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Live rolling Infractions Alert Ticker */}
              <div className="bg-card border border-border p-5 flex flex-col h-[470px] overflow-hidden">
                <h4 className="font-semibold text-white mb-4 flex items-center gap-2 text-sm border-b border-border pb-3">
                  <ShieldAlert size={16} className="text-red-400" />
                  Live Violation Alerts
                </h4>
                
                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {tickerLogs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4">
                      <CameraIcon size={32} className="text-zinc-800 mb-2" />
                      <p className="text-xs text-zinc-500 italic">No infractions logged in current stream session.</p>
                    </div>
                  ) : (
                    tickerLogs.map(log => (
                      <div key={log.id} className="p-3 bg-background border border-border/60 hover:border-red-500/30 transition-all space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-bold text-white uppercase">{log.plate}</span>
                          <span className="text-[9px] text-zinc-500">{log.timestamp}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {log.violations.map(v => (
                            <span key={v} className="text-[8px] bg-red-500/10 text-red-400 px-1.5 py-0.5 border border-red-500/10 font-semibold">
                              {v}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Interactive Calibration Sliders Card directly under visual canvases */}
          {calibrationMode && (
            <div className="bg-card border border-border p-6 shadow-sm space-y-4">
              <h5 className="font-semibold text-white text-xs uppercase tracking-wider pb-2 border-b border-border/40 flex justify-between items-center">
                <span>Interactive ROI Line Calibration</span>
                <button
                  onClick={saveCalibration}
                  className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-zinc-950 text-xs font-bold transition-colors cursor-pointer"
                >
                  Save Calibration Settings
                </button>
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
                    <span>Stop Line Position (Y)</span>
                    <span className="text-purple-400">{Math.round(roiSettings.stop_line_ratio * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.90" 
                    step="0.01"
                    value={roiSettings.stop_line_ratio}
                    onChange={(e) => setRoiSettings(prev => ({ ...prev, stop_line_ratio: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500 h-1 bg-background"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
                    <span>Wrong Way Boundary (X)</span>
                    <span className="text-red-400">{Math.round(roiSettings.wrong_way_ratio * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.90" 
                    step="0.01"
                    value={roiSettings.wrong_way_ratio}
                    onChange={(e) => setRoiSettings(prev => ({ ...prev, wrong_way_ratio: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500 h-1 bg-background"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-xs font-semibold text-zinc-300 mb-1">
                    <span>Illegal Parking Limit (X)</span>
                    <span className="text-amber-400">{Math.round(roiSettings.illegal_parking_ratio * 100)}%</span>
                  </label>
                  <input 
                    type="range" 
                    min="0.10" 
                    max="0.90" 
                    step="0.01"
                    value={roiSettings.illegal_parking_ratio}
                    onChange={(e) => setRoiSettings(prev => ({ ...prev, illegal_parking_ratio: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500 h-1 bg-background"
                  />
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
            
            <div className="flex-1 flex flex-col bg-background/40 border-r border-border/60 relative p-6 justify-between min-h-[350px]">
              <div className="flex items-center justify-between mb-4 border-b border-border/40 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {expandedType === "preprocessed" ? "Preprocessed Feed View" : "Annotated Evidence View"}
                </span>
                
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

            <div className="w-full md:w-80 flex flex-col justify-between bg-card p-6 border-t md:border-t-0 border-border">
              <div className="space-y-6">
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

                <div>
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Plate Number Recognition</span>
                  <div className="text-lg font-mono font-bold text-white tracking-widest mt-1.5 bg-background px-3 py-2.5 border border-border text-center uppercase">
                    {result.license_plate}
                  </div>
                </div>

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

                <div className="p-3 bg-background border border-border space-y-2 text-[11px] text-zinc-400">
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
