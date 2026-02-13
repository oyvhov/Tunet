import AuroraBackground from '../components/effects/AuroraBackground';

/**
 * BackgroundLayer — renders the animated aurora or static gradient background.
 */
export default function BackgroundLayer({ bgMode }) {
  if (bgMode === 'animated') {
    return <AuroraBackground />;
  }

  return (
    <div className="fixed inset-0 pointer-events-none z-0">
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom right, var(--bg-gradient-from), var(--bg-primary), var(--bg-gradient-to))',
        }}
      />
      <div
        className="absolute top-[-15%] right-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none"
        style={{ background: 'rgba(59, 130, 246, 0.08)', filter: 'blur(150px)' }}
      />
      <div
        className="absolute bottom-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full pointer-events-none"
        style={{ background: 'rgba(30, 58, 138, 0.1)', filter: 'blur(150px)' }}
      />
    </div>
  );
}
