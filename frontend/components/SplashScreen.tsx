import React, { useState, useEffect, useRef } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

interface Vehicle {
  id: number;
  x: number;
  y: number;
  speed: number;
  targetSpeed: number;
  color: string;
  type: "car" | "bike";
  width: number;
  height: number;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lightState, setLightState] = useState<"green" | "yellow" | "red">("green");

  useEffect(() => {
    // Traffic light sequencer timing
    const timer1 = setTimeout(() => {
      setLightState("yellow");
    }, 2800);

    const timer2 = setTimeout(() => {
      setLightState("red");
    }, 4500);

    const timer3 = setTimeout(() => {
      onComplete();
    }, 7200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Handle high-DPI scaling for a crisp display
    const handleResize = () => {
      canvas.width = window.innerWidth * window.devicePixelRatio;
      canvas.height = window.innerHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    handleResize();
    window.addEventListener("resize", handleResize);

    // Instantiate realistic vehicles on the road lanes
    // Lane 1 is at roadY + 20, Lane 2 is at roadY + 80
    const vehicles: Vehicle[] = [
      { id: 1, x: -120, y: 0, speed: 5.5, targetSpeed: 5.5, color: "#a78bfa", type: "car", width: 95, height: 44 },
      { id: 2, x: -420, y: 0, speed: 6.2, targetSpeed: 6.2, color: "#38bdf8", type: "car", width: 100, height: 46 },
      { id: 3, x: -260, y: 0, speed: 7.2, targetSpeed: 7.2, color: "#fbbf24", type: "bike", width: 55, height: 32 },
      { id: 4, x: -620, y: 0, speed: 5.8, targetSpeed: 5.8, color: "#f43f5e", type: "car", width: 105, height: 48 }
    ];

    let animationFrameId: number;

    const drawSkyline = (ctx: CanvasRenderingContext2D, width: number, roadY: number) => {
      // Midnight skyline backdrop
      ctx.fillStyle = "#090716";
      ctx.fillRect(0, 0, width, roadY);

      // Distant buildings
      ctx.fillStyle = "#100e24";
      const buildings = [
        { x: 50, w: 70, h: 140 },
        { x: 160, w: 90, h: 220 },
        { x: 280, w: 60, h: 110 },
        { x: 370, w: 110, h: 290 },
        { x: 510, w: 80, h: 170 },
        { x: 620, w: 95, h: 250 },
        { x: 740, w: 120, h: 130 },
        { x: 890, w: 70, h: 200 },
        { x: 990, w: 100, h: 280 },
        { x: 1120, w: 80, h: 150 },
        { x: 1230, w: 90, h: 240 }
      ];

      buildings.forEach((b) => {
        if (b.x < width) {
          ctx.fillRect(b.x, roadY - b.h, b.w, b.h);
          
          // Window light grids
          ctx.fillStyle = "rgba(254, 240, 138, 0.12)";
          const cols = Math.floor(b.w / 14);
          const rows = Math.floor(b.h / 22);
          for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
              const seed = Math.sin(b.x + c * 15 + r * 25);
              if (seed > 0.25) {
                ctx.fillRect(b.x + 6 + c * 14, roadY - b.h + 10 + r * 22, 4, 6);
              }
            }
          }
          ctx.fillStyle = "#100e24";
        }
      });
    };

    const drawStreetlight = (ctx: CanvasRenderingContext2D, x: number, roadY: number) => {
      ctx.save();
      const lightHeight = roadY;
      
      // Steel pole
      ctx.fillStyle = "#4b5563";
      ctx.fillRect(x - 2.5, 0, 5, lightHeight);
      
      // Arm extension
      ctx.fillRect(x - 30, 0, 30, 4.5);

      // Lamp head
      ctx.fillStyle = "#1f2937";
      ctx.fillRect(x - 35, 4.5, 10, 5);

      // Glowing light cone
      const coneGrad = ctx.createLinearGradient(x - 30, 9.5, x - 30, lightHeight);
      coneGrad.addColorStop(0, "rgba(254, 240, 138, 0.18)");
      coneGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(x - 35, 9.5);
      ctx.lineTo(x - 25, 9.5);
      ctx.lineTo(x + 50, lightHeight);
      ctx.lineTo(x - 110, lightHeight);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    };

    const drawPoliceman = (ctx: CanvasRenderingContext2D, x: number, y: number, raisedHand: boolean) => {
      ctx.save();
      
      // Body shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x, y + 80, 26, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Black boots
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x - 11, y + 65, 9, 15);
      ctx.fillRect(x + 2, y + 65, 9, 15);

      // Pants (Navy blue uniform trousers)
      ctx.fillStyle = "#17183B"; 
      ctx.fillRect(x - 10, y + 40, 8.5, 25);
      ctx.fillRect(x + 1.5, y + 40, 8.5, 25);

      // Torso / Jacket
      ctx.fillRect(x - 14, y + 12, 28, 30);

      // Reflective vest
      ctx.fillStyle = "#a3e635";
      ctx.fillRect(x - 13, y + 12, 26, 24);
      
      // Vest reflective silver stripes
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(x - 9, y + 12, 4, 24);
      ctx.fillRect(x + 5, y + 12, 4, 24);
      
      // Orange band
      ctx.fillStyle = "#ea580c"; 
      ctx.fillRect(x - 13, y + 22, 26, 4);

      // Collar
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 12);
      ctx.lineTo(x + 4, y + 12);
      ctx.lineTo(x, y + 17);
      ctx.closePath();
      ctx.fill();

      // Arms signaling
      ctx.fillStyle = "#17183B";
      if (raisedHand) {
        // Raised Left arm holding stop paddle
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 15);
        ctx.lineTo(x - 30, y + 2);
        ctx.lineTo(x - 26, y - 3);
        ctx.lineTo(x - 9, y + 11);
        ctx.closePath();
        ctx.fill();

        // White glove
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - 29, y - 0.5, 6, 0, Math.PI * 2);
        ctx.fill();

        // Sign pole
        ctx.strokeStyle = "#475569";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(x - 29, y - 0.5);
        ctx.lineTo(x - 39, y - 16);
        ctx.stroke();

        // STOP Paddle octagonal shape
        const px = x - 39;
        const py = y - 16;
        const radius = 20;
        ctx.fillStyle = "#ef4444";
        ctx.shadowColor = "#ef4444";
        ctx.shadowBlur = 15;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + Math.PI / 8;
          ctx.lineTo(px + radius * Math.cos(angle), py + radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // White border
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4 + Math.PI / 8;
          ctx.lineTo(px + (radius - 2.5) * Math.cos(angle), py + (radius - 2.5) * Math.sin(angle));
        }
        ctx.closePath();
        ctx.stroke();

        // STOP text
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("STOP", px, py);

        // Relaxed arm right
        ctx.fillStyle = "#17183B";
        ctx.fillRect(x + 14, y + 15, 7, 20);
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + 17.5, y + 35, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Directing gesture
        ctx.beginPath();
        ctx.moveTo(x - 14, y + 15);
        ctx.lineTo(x - 19, y + 30);
        ctx.lineTo(x - 14, y + 34);
        ctx.lineTo(x - 9, y + 19);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x - 16.5, y + 34, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Waving Right arm
        ctx.fillStyle = "#17183B";
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 15);
        ctx.lineTo(x + 36, y + 5);
        ctx.lineTo(x + 32, y + 0);
        ctx.lineTo(x + 10, y + 11);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x + 36, y + 2.5, 5.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Neck & Face skin
      ctx.fillStyle = "#ffd1a9";
      ctx.fillRect(x - 4, y + 4, 8, 8);
      
      // Bigger head
      ctx.beginPath();
      ctx.arc(x, y - 4, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // Sunglasses
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(x - 7, y - 7.5, 14, 3.5);

      // Peaked Cap
      ctx.fillStyle = "#17183B";
      ctx.beginPath();
      ctx.moveTo(x - 13, y - 9.5);
      ctx.lineTo(x + 13, y - 9.5);
      ctx.lineTo(x + 15, y - 18);
      ctx.lineTo(x - 15, y - 18);
      ctx.closePath();
      ctx.fill();

      // Cap visor peak
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.moveTo(x - 12.5, y - 9.5);
      ctx.lineTo(x + 12.5, y - 9.5);
      ctx.lineTo(x + 14, y - 5.5);
      ctx.lineTo(x - 14, y - 5.5);
      ctx.closePath();
      ctx.fill();

      // Gold strap & badge
      ctx.fillStyle = "#eab308";
      ctx.fillRect(x - 12.5, y - 11.5, 25, 2);
      ctx.beginPath();
      ctx.arc(x, y - 13, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawDetailedCar = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) => {
      ctx.save();
      
      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height - 2, width / 2 + 6, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Chassis
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y + height - 10);
      ctx.lineTo(x + 12, y + height - 10);
      ctx.quadraticCurveTo(x + 3, y + 16, x + 24, y + 12);
      ctx.lineTo(x + width - 30, y + 12);
      ctx.quadraticCurveTo(x + width - 10, y + 13, x + width - 3, y + 20);
      ctx.lineTo(x + width, y + height - 10);
      ctx.lineTo(x, y + height - 10);
      ctx.closePath();
      ctx.fill();

      // Windows
      ctx.fillStyle = "#09090b";
      ctx.fillRect(x + 28, y + 2, width - 60, 11);
      
      const glassGrad = ctx.createLinearGradient(x + 30, y + 2, x + width - 35, y + 12);
      glassGrad.addColorStop(0, "#38bdf8");
      glassGrad.addColorStop(0.5, "#0284c7");
      glassGrad.addColorStop(1, "#075985");
      ctx.fillStyle = glassGrad;
      
      ctx.beginPath();
      ctx.moveTo(x + 30, y + 11);
      ctx.lineTo(x + 38, y + 3);
      ctx.lineTo(x + width / 2 - 2, y + 3);
      ctx.lineTo(x + width / 2 - 2, y + 11);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x + width / 2 + 2, y + 11);
      ctx.lineTo(x + width / 2 + 2, y + 3);
      ctx.lineTo(x + width - 38, y + 3);
      ctx.lineTo(x + width - 32, y + 11);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + width / 2, y + 2);
      ctx.lineTo(x + width / 2, y + 12);
      ctx.stroke();

      // Lights
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(x + 4, y + 16, 2.5, 4.5, Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#f87171";
      ctx.shadowColor = "#ef4444";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.ellipse(x + width - 3, y + 17, 2.5, 5.5, -Math.PI / 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Alloy Wheels
      const drawRim = (wx: number, wy: number) => {
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.arc(wx, wy, 10.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(wx, wy, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(wx, wy, 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 1.2;
        for (let i = 0; i < 5; i++) {
          const angle = (i * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 7.2 * Math.cos(angle), wy + 7.2 * Math.sin(angle));
          ctx.stroke();
        }
      };

      drawRim(x + 22, y + height - 8);
      drawRim(x + width - 24, y + height - 8);

      // Handle lines
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x + width / 2 - 12, y + 19);
      ctx.lineTo(x + width / 2 - 4, y + 19);
      ctx.moveTo(x + width / 2 + 12, y + 19);
      ctx.lineTo(x + width / 2 + 20, y + 19);
      ctx.stroke();

      ctx.restore();
    };

    const drawDetailedBike = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) => {
      ctx.save();

      // Shadow
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height - 2, width / 2 + 2, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Spokes wheels
      const drawBikeRim = (wx: number, wy: number) => {
        ctx.fillStyle = "#09090b";
        ctx.beginPath();
        ctx.arc(wx, wy, 9.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(wx, wy, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = "#94a3b8";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI * 2) / 8;
          ctx.beginPath();
          ctx.moveTo(wx, wy);
          ctx.lineTo(wx + 7.5 * Math.cos(angle), wy + 7.5 * Math.sin(angle));
          ctx.stroke();
        }
      };

      const fWheelX = x + width - 9;
      const rWheelX = x + 9;
      const wY = y + height - 9;
      drawBikeRim(fWheelX, wY);
      drawBikeRim(rWheelX, wY);

      // Swingarm
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rWheelX, wY);
      ctx.lineTo(x + width / 2, y + height - 11);
      ctx.lineTo(fWheelX, wY);
      ctx.stroke();

      // Chrome silencer
      ctx.strokeStyle = "#cbd5e1";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x + 11, y + height - 11);
      ctx.lineTo(x + 28, y + height - 13);
      ctx.stroke();

      // Fuel Tank
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + 14, y + 9);
      ctx.quadraticCurveTo(x + 21, y + 3, x + 33, y + 3);
      ctx.lineTo(x + 40, y + 11);
      ctx.lineTo(x + 11, y + 11);
      ctx.closePath();
      ctx.fill();

      // Seat pad
      ctx.fillStyle = "#09090b";
      ctx.fillRect(x + 11, y + 9, 13, 2.5);

      // Fork bars
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fWheelX, wY);
      ctx.lineTo(x + width - 18, y - 1);
      ctx.lineTo(x + width - 24, y - 1);
      ctx.stroke();

      // Headlight glowing
      ctx.fillStyle = "#fef08a";
      ctx.shadowColor = "#fde047";
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(x + width - 14, y + 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Rider details
      const rx = x + 23;
      const ry = y + 1;

      // Riding jacket
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(rx - 5.5, ry, 11, 9);

      // Jeans Blue pants
      ctx.fillStyle = "#1d4ed8";
      ctx.fillRect(rx - 4.5, ry + 9, 9, 3.5);

      // Arm to handlebar
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry + 2);
      ctx.lineTo(x + width - 20, y);
      ctx.stroke();

      // Rider Helmet
      ctx.fillStyle = "#ab96ff";
      ctx.beginPath();
      ctx.arc(rx, ry - 6.5, 5.5, 0, Math.PI * 2);
      ctx.fill();
      
      // Helmet glassy shield visor
      ctx.fillStyle = "#020617";
      ctx.beginPath();
      ctx.arc(rx + 2.5, ry - 6.5, 2.8, -Math.PI / 3, Math.PI / 3);
      ctx.fill();

      ctx.restore();
    };

    // Draw centering brand titles inside the sky backdrop
    const drawSkyTitles = (ctx: CanvasRenderingContext2D, width: number, roadY: number) => {
      ctx.save();
      ctx.textAlign = "center";
      
      // "VisionCop AI" Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 32px monospace";
      ctx.shadowColor = "#ab96ff";
      ctx.shadowBlur = 15;
      ctx.fillText("VisionCop AI", width / 2, roadY - 315);
      
      ctx.restore();
    };

    const render = () => {
      const width = canvas.width / window.devicePixelRatio;
      const height = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, width, height);

      // Dynamically calculate road height position relative to window viewport
      const roadY = height - 250;
      const roadHeight = 140;

      // 1. Background skyline
      drawSkyline(ctx, width, roadY);

      // 2. Street lights positioned symmetrically
      drawStreetlight(ctx, 120, roadY);
      drawStreetlight(ctx, width - 420, roadY);

      // 3. Draw Sky Titles
      drawSkyTitles(ctx, width, roadY);

      // 4. Road Canvas strip
      ctx.fillStyle = "#111116";
      ctx.fillRect(0, roadY, width, roadHeight);

      // curbs
      ctx.fillStyle = "#1e1b29";
      ctx.fillRect(0, roadY - 4, width, 4);
      ctx.fillRect(0, roadY + roadHeight, width, 4);

      // Lane dividers
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 2;
      ctx.setLineDash([15, 20]);
      ctx.beginPath();
      ctx.moveTo(0, roadY + roadHeight / 2);
      ctx.lineTo(width, roadY + roadHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Stop Line
      const stopLineX = width - 300;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(stopLineX, roadY);
      ctx.lineTo(stopLineX, roadY + roadHeight);
      ctx.stroke();

      // Zebra stripes
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 7;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(stopLineX + 22, roadY);
      ctx.lineTo(stopLineX + 22, roadY + roadHeight);
      ctx.stroke();
      ctx.setLineDash([]);

      // 5. Policeman character
      const copX = stopLineX + 60;
      const copY = roadY - 55;
      drawPoliceman(ctx, copX, copY, lightState === "red");

      // 6. Dynamic Vehicles loop (no bounding boxes, strictly realistic drawing)
      vehicles.forEach((vehicle, idx) => {
        // Position vehicles on standard lanes
        vehicle.y = idx < 2 ? roadY + 16 : roadY + 76;

        if (lightState === "green") {
          vehicle.targetSpeed = vehicle.type === "bike" ? 7.2 : 5.6;
        } else if (lightState === "yellow") {
          vehicle.targetSpeed = 1.8;
        } else {
          // Red light: stop behind stop line
          const stopThreshold = stopLineX - vehicle.width - 15 - (vehicle.id * 20);
          if (vehicle.x >= stopThreshold) {
            vehicle.targetSpeed = 0;
            vehicle.x = stopThreshold;
          } else {
            vehicle.targetSpeed = 1.2;
          }
        }

        vehicle.speed += (vehicle.targetSpeed - vehicle.speed) * 0.1;
        vehicle.x += vehicle.speed;

        // Loop traffic if green light is active
        if (vehicle.x > width + 100 && lightState === "green") {
          vehicle.x = -150 - Math.random() * 200;
        }

        if (vehicle.type === "car") {
          drawDetailedCar(ctx, vehicle.x, vehicle.y, vehicle.width, vehicle.height, vehicle.color);
        } else {
          drawDetailedBike(ctx, vehicle.x, vehicle.y, vehicle.width, vehicle.height, vehicle.color);
        }
      });

      // 7. Traffic Light post
      const tlX = stopLineX - 45;
      const tlY = roadY - 80;
      
      ctx.fillStyle = "#27272a";
      ctx.fillRect(tlX + 7, tlY + 40, 6, 40);

      ctx.fillStyle = "#09090b";
      ctx.strokeStyle = "#27272a";
      ctx.lineWidth = 2;
      ctx.fillRect(tlX, tlY, 20, 42);
      ctx.strokeRect(tlX, tlY, 20, 42);

      const drawLamp = (yOffset: number, color: string, isActive: boolean) => {
        ctx.beginPath();
        ctx.arc(tlX + 10, tlY + yOffset, 4.5, 0, Math.PI * 2);
        if (isActive) {
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 12;
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "rgba(40, 40, 50, 0.35)";
          ctx.fill();
        }
      };
      drawLamp(8, "#ef4444", lightState === "red");
      drawLamp(21, "#fbbf24", lightState === "yellow");
      drawLamp(34, "#10b981", lightState === "green");

      ctx.fillStyle = "#71717a";
      ctx.font = "8px monospace";
      ctx.fillText("SIG_04", tlX - 8, tlY - 8);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [lightState]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col justify-between overflow-hidden select-none">
      {/* Absolute fullscreen canvas viewport */}
      <canvas 
        ref={canvasRef} 
        className="w-screen h-screen bg-background block"
      />
    </div>
  );
}
