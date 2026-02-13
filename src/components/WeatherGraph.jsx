import { useMemo } from 'react';

// Helper function to create smooth Bezier curves
const createBezierPath = (points, smoothing = 0.35) => {
  const line = (p1, p2) => {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
  };
  const controlPoint = (current, previous, next, reverse) => {
    const p = previous || current;
    const n = next || current;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const length = l.length * smoothing;
    return [current[0] + Math.cos(angle) * length, current[1] + Math.sin(angle) * length];
  };
  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = controlPoint(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = controlPoint(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
};

// Helper function to create smooth curves (Catmull-Rom to Bezier)
const getSvgPath = (points, smoothing = 0.35) => {
  return createBezierPath(points, smoothing);
};

// Smooth data using Moving Average
const smoothData = (data, windowSize = 3) => {
  if (data.length < windowSize) return data;
  return data.map((point, index, array) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(array.length, index + Math.floor(windowSize / 2) + 1);
    const subset = array.slice(start, end);
    const sum = subset.reduce((acc, p) => acc + p.temp, 0);
    return { ...point, temp: sum / subset.length };
  });
};

export default function WeatherGraph({ history, currentTemp }) {
  const width = 800;
  const height = 200;

  const data = useMemo(() => {
    if (!history || history.length === 0) return [];

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

    // Process history
    let points = history
        .map(d => ({
          time: new Date(d.last_updated),
          temp: parseFloat(d.state),
        }))
        .filter(p => !isNaN(p.temp) && p.time >= twelveHoursAgo)
        .sort((a, b) => a.time - b.time);

    // Add current time point
    if (currentTemp !== undefined && !isNaN(currentTemp)) {
        const now = new Date();
        // Only add if newer than the last point
        if (points.length === 0 || points[points.length - 1].time < now) {
            points.push({
                time: now,
                temp: parseFloat(currentTemp)
            });
        }
    }

    // Downsample: if there are many points, take every other to reduce noise
    if (points.length > 40) {
        points = points.filter((_, i) => i % 2 === 0);
    }

    // Use moving average to smooth the curve
    return smoothData(points, 3);
  }, [history, currentTemp]);

  // Ensure we always have data to plot, even if just dummy data to show the grid
  const plotData = data.length === 1 ? [data[0], { ...data[0], time: new Date(data[0].time.getTime() + 1000) }] : (data.length === 0 ? [{time: new Date(), temp: 0}, {time: new Date(Date.now() + 1000), temp: 0}] : data);

  const minTemp = Math.min(...plotData.map(d => d.temp));
  const maxTemp = Math.max(...plotData.map(d => d.temp));

  // Add dynamic padding based on data interval
  const baseRange = maxTemp - minTemp || 1;
  const padding = Math.max(2, baseRange * 0.15);
  const yMin = minTemp - padding;
  const yMax = maxTemp + padding;
  const yRange = yMax - yMin || 1;

  const minTime = plotData[0].time.getTime();
  const maxTime = plotData[plotData.length - 1].time.getTime();
  const timeRange = maxTime - minTime || 1;

  const paddingX = 0;
  const getX = (t) => paddingX + ((t.getTime() - minTime) / timeRange) * (width - paddingX * 2);
  const getY = (temp) => height - ((temp - yMin) / yRange) * height;

  // Generate points and smooth path
  const points = plotData.map(p => [getX(p.time), getY(p.temp)]);
  const smoothPath = getSvgPath(points);

  // Generate fill area
  // Extend way below height to cover rounded corners fully
  const extendedHeight = height + 40; 
  const dArea = `${smoothPath} L ${points[points.length-1][0]},${extendedHeight} L ${points[0][0]},${extendedHeight} Z`;

  // Define color scale (Gradient Units UserSpaceOnUse maps temp directly to Y)
  // Gradient defined so that 0 degrees is the boundary between blue and green
  const yTop = getY(30); // Hot
  const yBottom = getY(-15); // Cold

  return (
    <div className="w-full h-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weatherGrad" x1="0" y1={yBottom} x2="0" y2={yTop} gradientUnits="userSpaceOnUse">
             <stop offset="0%" stopColor="#3b82f6" />
             <stop offset="30%" stopColor="#06b6d4" />
             <stop offset="50%" stopColor="#22c55e" />
             <stop offset="75%" stopColor="#eab308" />
             <stop offset="100%" stopColor="#ef4444" /> {/* Hot (Red) */}
          </linearGradient>
          
          {/* Enhanced fade mask for smoother bottom edge */}
          <linearGradient id="fillFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="60%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          
          <mask id="fillMask">
             <rect x="0" y="0" width={width} height={height} fill="url(#fillFade)" />
          </mask>
        </defs>

        {/* Fill under the graph */}
        <path d={dArea} fill="url(#weatherGrad)" mask="url(#fillMask)" opacity="0.85" />

        {/* Full line — Bezier curve with gradient */}
        <path d={smoothPath} fill="none" stroke="url(#weatherGrad)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.95" />
        
        {/* Dot for current temperature */}
        {!isNaN(currentTemp) && (
          <>
            <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="6" fill="var(--card-bg)" stroke="url(#weatherGrad)" strokeWidth="4" />
            <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="8" fill="none" stroke="url(#weatherGrad)" strokeWidth="2" opacity="0.3" />
          </>
        )}

      </svg>
    </div>
  );
}
