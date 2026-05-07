import React, { useEffect, useRef } from 'react';
import { useLowPowerMotion } from '../../hooks/useLowPowerMotion';

const MAX_DPR = 1.5;
const FRAME_INTERVAL_MS = 1000 / 30;

/**
 * LavaLampBackground — Slow-moving organic blobs that merge and split,
 * resembling a lava lamp. Deep warm tones on dark base.
 */
const LavaLampBackground = () => {
  const canvasRef = useRef(null);
  const motionAllowed = useLowPowerMotion();

  useEffect(() => {
    if (!motionAllowed) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;

    const blobs = [
      { x: 0.25, y: 0.3, r: 0.38, color: [220, 60, 60], phase: 0, speed: 0.00003 }, // Warm red
      { x: 0.7, y: 0.2, r: 0.42, color: [200, 100, 30], phase: 1.5, speed: 0.00004 }, // Orange
      { x: 0.5, y: 0.7, r: 0.35, color: [180, 40, 120], phase: 3, speed: 0.00005 }, // Magenta
      { x: 0.15, y: 0.8, r: 0.3, color: [140, 50, 180], phase: 4.5, speed: 0.00003 }, // Purple
      { x: 0.85, y: 0.6, r: 0.32, color: [230, 80, 50], phase: 2, speed: 0.00004 }, // Deep orange
    ];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.ceil(width * dpr);
      canvas.height = Math.ceil(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };

    window.addEventListener('resize', resize);
    resize();

    let lastFrameAt = 0;
    const draw = (t) => {
      if (t - lastFrameAt < FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = t;

      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#1a0a1e';
      ctx.fillRect(0, 0, width, height);

      blobs.forEach((blob, i) => {
        // Slow lava-like rising/falling motion
        const yDrift =
          Math.sin(t * blob.speed * 2 + blob.phase) * 0.25 +
          Math.sin(t * blob.speed * 5 + blob.phase * 0.7) * 0.08;

        const xDrift =
          Math.sin(t * blob.speed * 1.5 + blob.phase + 1) * 0.12 +
          Math.cos(t * blob.speed * 3 + blob.phase) * 0.06;

        // Slow pulsing blob size
        const breathe = Math.sin(t * 0.0003 + i * 1.2) * 0.08;

        const x = (blob.x + xDrift) * width;
        const y = (blob.y + yDrift) * height;
        const radius = Math.min(width, height) * (blob.r + breathe);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const [r, g, b] = blob.color;

        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
        gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.2)`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, 0.06)`);
        gradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [motionAllowed]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden bg-[#1a0a1e]">
      {motionAllowed && (
        <canvas
          ref={canvasRef}
          style={{ filter: 'blur(60px)', opacity: 0.85 }}
          className="absolute inset-0 h-full w-full"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default LavaLampBackground;
