import { useMemo } from 'react';

// Hjelpefunksjon for å lage mjuke kurver (Catmull-Rom til Bezier)
const getSvgPath = (points, smoothing = 0.35) => {
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

// Funksjon for å glatte ut data (Moving Average)
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

    // Behandle historikk
    let points = history
        .map(d => ({
          time: new Date(d.last_updated),
          temp: parseFloat(d.state),
        }))
        .filter(p => !isNaN(p.temp) && p.time >= twelveHoursAgo)
        .sort((a, b) => a.time - b.time);

    // Legg til nåtidspunkt
    if (currentTemp !== undefined && !isNaN(currentTemp)) {
        const now = new Date();
        // Legg berre til om det er nyare enn siste punkt
        if (points.length === 0 || points[points.length - 1].time < now) {
            points.push({
                time: now,
                temp: parseFloat(currentTemp)
            });
        }
    }

    // Downsample: Hvis vi har mange punkt, ta berre kvart andre for å redusere støy
    if (points.length > 40) {
        points = points.filter((_, i) => i % 2 === 0);
    }

    // Bruk moving average for å glatte ut kurva
    return smoothData(points, 3);
  }, [history, currentTemp]);

  // Sikre at vi alltid har data å plotte, sjølv om det berre er dummy-data for å vise rutenettet
  const plotData = data.length === 1 ? [data[0], { ...data[0], time: new Date(data[0].time.getTime() + 1000) }] : (data.length === 0 ? [{time: new Date(), temp: 0}, {time: new Date(Date.now() + 1000), temp: 0}] : data);

  const minTemp = Math.min(...plotData.map(d => d.temp));
  const maxTemp = Math.max(...plotData.map(d => d.temp));

  // Legg til litt padding dynamisk basert på dataintervallet
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

  // Generer punkt og mjuk bane
  const points = plotData.map(p => [getX(p.time), getY(p.temp)]);
  const smoothPath = getSvgPath(points);

  // Generer område for fyll (valfritt, men ser bra ut)
  const dArea = `${smoothPath} L ${points[points.length-1][0]},${height} L ${points[0][0]},${height} Z`;

  // Definer fargeskalaen (Gradient Units UserSpaceOnUse gjer at vi kan mappe temp direkte til Y)
  // Vi definerer gradienten slik at 0 grader er skillet mellom blått og grønt
  const yZero = getY(0);
  const yTop = getY(30); // Varmt
  const yBottom = getY(-15); // Kaldt

  // Finn min og max punkt for labels
  const minPoint = plotData.reduce((prev, curr) => (curr.temp < prev.temp ? curr : prev), plotData[0]);
  const maxPoint = plotData.reduce((prev, curr) => (curr.temp > prev.temp ? curr : prev), plotData[0]);
  const lastPoint = plotData[plotData.length - 1];

  return (
    <div className="w-full h-full relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="weatherGrad" x1="0" y1={yBottom} x2="0" y2={yTop} gradientUnits="userSpaceOnUse">
             <stop offset="0%" stopColor="#3b82f6" />
             <stop offset="30%" stopColor="#06b6d4" />
             <stop offset="50%" stopColor="#22c55e" />
             <stop offset="75%" stopColor="#eab308" />
             <stop offset="100%" stopColor="#ef4444" /> {/* Varmt (Raud) */}
          </linearGradient>
          <linearGradient id="fillFade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.4" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id="fillMask">
             <rect x="0" y="0" width={width} height={height} fill="url(#fillFade)" />
          </mask>
        </defs>

        {/* Fyll under grafen */}
        <path d={dArea} fill="url(#weatherGrad)" mask="url(#fillMask)" />

        {/* Heile linja */}
        <path d={smoothPath} fill="none" stroke="url(#weatherGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Prikk for noverande temperatur */}
        {!isNaN(currentTemp) && <circle cx={points[points.length-1][0]} cy={points[points.length-1][1]} r="6" fill="var(--card-bg)" stroke="url(#weatherGrad)" strokeWidth="4" />}

      </svg>

      {/* Min/Max labels (HTML for å unngå distortion) */}
      <div className="absolute text-[var(--text-primary)] font-bold text-sm pointer-events-none" 
           style={{ left: `${(getX(maxPoint.time) / width) * 100}%`, top: `${(getY(maxPoint.temp) / height) * 100}%`, transform: 'translate(-50%, -150%)' }}>
        {Math.round(maxPoint.temp)}°
      </div>
      <div className="absolute text-[var(--text-primary)] font-bold text-sm pointer-events-none" 
           style={{ left: `${(getX(minPoint.time) / width) * 100}%`, top: `${(getY(minPoint.temp) / height) * 100}%`, transform: 'translate(-50%, 25%)' }}>
        {Math.round(minPoint.temp)}°
      </div>
    </div>
  );
}
