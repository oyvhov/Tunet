import React, { useEffect, useRef } from 'react';

const WeatherEffects = ({ condition }) => {
  const canvasRef = useRef(null);

  // Normalize condition
  const getEffectType = (cond) => {
    if (!cond) return null;
    const c = cond.toLowerCase();
    if (['rainy', 'pouring', 'lightning-rainy'].includes(c)) return 'rain';
    if (['snowy', 'snowy-rainy'].includes(c)) return 'snow';
    return null;
  };

  const effectType = getEffectType(condition);

  useEffect(() => {
    if (!effectType) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];

    // Resize handling
    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Particle config
    const config = {
      rain: {
        count: 60,
        speed: { min: 2.5, max: 5.5 }, // Slower rain
        angle: { min: 0, max: 0.1 },
        color: 'rgba(174, 194, 224, 0.4)',
        width: 1.5,
        length: { min: 8, max: 14 },
      },
      snow: {
        count: 40,
        speed: { min: 0.5, max: 1.5 },
        angle: { min: -0.5, max: 0.5 },
        color: 'rgba(255, 255, 255, 0.5)',
        radius: { min: 1, max: 2.5 },
      },
    };

    const initParticles = () => {
      particles = [];
      const cfg = config[effectType];
      for (let i = 0; i < cfg.count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          speed: cfg.speed.min + Math.random() * (cfg.speed.max - cfg.speed.min),
          length: cfg.length
            ? cfg.length.min + Math.random() * (cfg.length.max - cfg.length.min)
            : 0,
          radius: cfg.radius
            ? cfg.radius.min + Math.random() * (cfg.radius.max - cfg.radius.min)
            : 0,
          opacity: Math.random(),
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cfg = config[effectType];

      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = cfg.width || 1;

      particles.forEach((p) => {
        ctx.beginPath();
        if (effectType === 'rain') {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.length);
          ctx.stroke();

          p.y += p.speed;
          if (p.y > canvas.height) {
            p.y = -p.length;
            p.x = Math.random() * canvas.width;
          }
        } else if (effectType === 'snow') {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();

          p.y += p.speed;
          p.x += Math.sin(p.y * 0.05) * 0.5; // Slight sway

          if (p.y > canvas.height) {
            p.y = -5;
            p.x = Math.random() * canvas.width;
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    initParticles();
    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effectType]);

  if (!effectType) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ opacity: 0.8 }} />
    </div>
  );
};

export default WeatherEffects;
