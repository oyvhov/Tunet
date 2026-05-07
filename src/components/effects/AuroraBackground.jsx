import React, { useEffect, useRef } from 'react';
import { useLowPowerMotion } from '../../hooks/useLowPowerMotion';

const MAX_DPR = 1.5;
const FRAME_INTERVAL_MS = 1000 / 30;

const AuroraBackground = () => {
  const canvasRef = useRef(null);
  const motionAllowed = useLowPowerMotion();

  useEffect(() => {
    if (!motionAllowed) return undefined;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width, height;

    // Configuration - Reduced speeds for more fluid, languid movement
    const orbs = [
      { x: 0.2, y: 0.2, r: 0.5, color: '#4f46e5', phase: 0, speed: 0.00005 }, // Indigo
      { x: 0.8, y: 0.3, r: 0.6, color: '#0ea5e9', phase: 2, speed: 0.00004 }, // Sky
      { x: 0.5, y: 0.8, r: 0.5, color: '#8b5cf6', phase: 4, speed: 0.00006 }, // Violet
      { x: 0.1, y: 0.9, r: 0.4, color: '#14b8a6', phase: 1, speed: 0.00005 }, // Teal
    ];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      // Handle high DPI displays
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

      // Reset composite operation to ensure background clears correctly
      // Otherwise screen blend mode accumulates, turning the screen white
      ctx.globalCompositeOperation = 'source-over';

      // Clear with base dark color
      ctx.fillStyle = '#0f172a'; // Slate 900
      ctx.fillRect(0, 0, width, height);

      // Update and draw orbs
      orbs.forEach((orb, i) => {
        // Organic fluid movement using compound sine waves
        const time = t * 1.0;

        // Compound sine waves for non-linear path
        // Using the orb.speed (very small number) directly with large time multiplier
        const noiseX =
          Math.sin(time * orb.speed * 4 + orb.phase) * 0.2 +
          Math.sin(time * orb.speed * 8 + orb.phase) * 0.1;

        const noiseY =
          Math.cos(time * orb.speed * 3 + orb.phase) * 0.2 +
          Math.cos(time * orb.speed * 5 + orb.phase) * 0.1;

        // Interaction term
        const interaction = Math.sin(time * 0.0001) * 0.02;

        const x = (orb.x + noiseX + interaction) * width;
        const y = (orb.y + noiseY + interaction) * height;

        // Breathing radius
        const radius = Math.min(width, height) * (orb.r + Math.sin(time * 0.0005 + i) * 0.05);

        // Draw radial gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

        // Soft ehereal blending
        gradient.addColorStop(0, orb.color + '66');
        gradient.addColorStop(0.6, orb.color + '22');
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
    <div className="pointer-events-none fixed inset-0 z-0 h-full w-full overflow-hidden bg-[#0f172a]">
      {motionAllowed && (
        <canvas
          ref={canvasRef}
          style={{ filter: 'blur(56px)', opacity: 0.8 }}
          className="absolute inset-0 h-full w-full"
        />
      )}
      {/* Noise texture overlay for texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
};

export default AuroraBackground;
