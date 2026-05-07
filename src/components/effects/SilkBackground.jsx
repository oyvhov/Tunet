import React, { useEffect, useRef } from 'react';
import { useLowPowerMotion } from '../../hooks/useLowPowerMotion';

const MAX_DPR = 1.5;
const FRAME_INTERVAL_MS = 1000 / 30;

/**
 * SilkBackground — Soft pastel flowing waves on a bright base.
 * Designed for light themes: gentle, airy, and elegant.
 */
const SilkBackground = () => {
  const canvasRef = useRef(null);
  const motionAllowed = useLowPowerMotion();

  useEffect(() => {
    if (!motionAllowed) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;

    // Soft pastel ribbons
    const ribbons = [
      { x: 0.2, y: 0.15, r: 0.55, color: [147, 197, 253], phase: 0, speed: 0.00003 }, // Soft blue
      { x: 0.75, y: 0.25, r: 0.5, color: [196, 181, 253], phase: 1.8, speed: 0.000025 }, // Lavender
      { x: 0.5, y: 0.75, r: 0.45, color: [167, 243, 208], phase: 3.2, speed: 0.000035 }, // Mint
      { x: 0.1, y: 0.6, r: 0.4, color: [253, 186, 116], phase: 4.8, speed: 0.00003 }, // Peach
      { x: 0.85, y: 0.7, r: 0.38, color: [252, 165, 206], phase: 2.5, speed: 0.000028 }, // Rose
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

      // Bright warm-white base
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, width, height);

      ribbons.forEach((ribbon, i) => {
        // Gentle silk-like drifting
        const xWave =
          Math.sin(t * ribbon.speed * 3 + ribbon.phase) * 0.15 +
          Math.sin(t * ribbon.speed * 7 + ribbon.phase * 1.3) * 0.05;

        const yWave =
          Math.cos(t * ribbon.speed * 2 + ribbon.phase) * 0.12 +
          Math.cos(t * ribbon.speed * 5 + ribbon.phase * 0.8) * 0.06;

        // Gentle breathing
        const breathe = Math.sin(t * 0.0004 + i * 1.5) * 0.06;

        const x = (ribbon.x + xWave) * width;
        const y = (ribbon.y + yWave) * height;
        const radius = Math.min(width, height) * (ribbon.r + breathe);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const [r, g, b] = ribbon.color;

        // Very soft layering — multiply blending on white gives watercolor effect
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
        gradient.addColorStop(0.35, `rgba(${r}, ${g}, ${b}, 0.15)`);
        gradient.addColorStop(0.65, `rgba(${r}, ${g}, ${b}, 0.05)`);
        gradient.addColorStop(1, 'transparent');

        ctx.globalCompositeOperation = 'multiply';
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
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden bg-[#f8fafc]">
      {motionAllowed && (
        <canvas
          ref={canvasRef}
          style={{ filter: 'blur(64px)', opacity: 0.7 }}
          className="absolute inset-0 h-full w-full"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default SilkBackground;
