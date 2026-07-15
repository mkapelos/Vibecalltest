/**
 * Generates an animated canvas video track and a silent Web Audio track
 * to use as a seamless virtual fallback when physical devices are unavailable
 * or blocked by browser/iframe security settings.
 */
export function createVirtualStream(userName: string): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  const stream = new MediaStream();

  if (ctx) {
    let angle = 0;
    const colors = [
      ["#4f46e5", "#06b6d4"], // Indigo to Cyan
      ["#ec4899", "#8b5cf6"], // Pink to Purple
      ["#10b981", "#3b82f6"], // Emerald to Blue
      ["#f59e0b", "#ef4444"], // Amber to Red
    ];
    // Select color scheme based on user name
    const colorIndex = (userName || "U").charCodeAt(0) % colors.length;
    const selectedColors = colors[colorIndex];

    const animate = () => {
      angle += 0.04;
      const pulse = Math.sin(angle) * 12 + 95; // Pulse radius

      // Draw dark background gradient
      const bgGradient = ctx.createRadialGradient(320, 240, 40, 320, 240, 380);
      bgGradient.addColorStop(0, "#0f172a"); // slate-900
      bgGradient.addColorStop(1, "#020617"); // slate-950
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, 640, 480);

      // Draw elegant background technical grid lines
      ctx.strokeStyle = "rgba(148, 163, 184, 0.04)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 480);
        ctx.stroke();
      }
      for (let i = 0; i < 480; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(640, i);
        ctx.stroke();
      }

      // Draw ambient pulsing rings
      ctx.strokeStyle = "rgba(99, 102, 241, 0.1)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(320, 240, pulse + 30, 0, Math.PI * 2);
      ctx.stroke();

      // Draw primary gradient ring
      const ringGradient = ctx.createLinearGradient(160, 120, 480, 360);
      ringGradient.addColorStop(0, selectedColors[0]);
      ringGradient.addColorStop(1, selectedColors[1]);
      ctx.strokeStyle = ringGradient;
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      // Draw arcs to look like a modern camera target or loader
      ctx.arc(320, 240, pulse, angle, angle + Math.PI * 1.5);
      ctx.stroke();

      // Orbiting indicator dot
      const dotX = 320 + Math.cos(angle * 1.5) * pulse;
      const dotY = 240 + Math.sin(angle * 1.5) * pulse;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6, 0, Math.PI * 2);
      ctx.fill();

      // Draw initials
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 72px Inter, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const initials = userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      ctx.fillText(initials || "V", 320, 225);

      // Draw user name label
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      ctx.font = "500 18px Inter, system-ui, sans-serif";
      ctx.fillText(userName, 320, 290);

      // Draw virtual camera active status label
      ctx.fillStyle = "rgba(99, 102, 241, 0.7)";
      ctx.font = "600 11px JetBrains Mono, monospace";
      ctx.fillText("● VIRTUAL CAMERA FEED", 320, 325);

      // Draw beautiful live fake audio frequency wave
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 200; x <= 440; x += 8) {
        const factor = Math.sin((x - 200) / 240 * Math.PI); // arch distribution
        const offset = Math.sin(angle * 3.5 + x * 0.08) * 15 * factor * (0.4 + Math.abs(Math.sin(angle)));
        if (x === 200) {
          ctx.moveTo(x, 380 + offset);
        } else {
          ctx.lineTo(x, 380 + offset);
        }
      }
      ctx.stroke();

      // Request next frame
      requestAnimationFrame(animate);
    };

    // Run animation loop in canvas
    setTimeout(animate, 0);

    const canvasStream = canvas.captureStream(25);
    const videoTrack = canvasStream.getVideoTracks()[0];
    if (videoTrack) {
      stream.addTrack(videoTrack);
    }
  }

  // Create silent audio stream via Web Audio API
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const dst = audioCtx.createMediaStreamDestination();
      const audioTrack = dst.stream.getAudioTracks()[0];
      if (audioTrack) {
        stream.addTrack(audioTrack);
      }
    }
  } catch (e) {
    console.warn("Web Audio API not supported for virtual fallback, audio track omitted", e);
  }

  return stream;
}
