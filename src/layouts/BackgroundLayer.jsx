import AuroraBackground from '../components/effects/AuroraBackground';

/**
 * BackgroundLayer — renders the animated aurora or static gradient background.
 */
export default function BackgroundLayer({ bgMode }) {
  if (bgMode === 'animated') {
    return <AuroraBackground />;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* Deep static gradient base */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, var(--bg-gradient-from), var(--bg-primary) 70%, var(--bg-gradient-to))',
        }}
      />

      {/* Animated Aurora Blobs - even in 'static' mode we give some life */}
      <div
        className="aurora-blob-1 pointer-events-none absolute top-[-10%] right-[-5%] h-[60vw] w-[60vw] rounded-full opacity-60 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0) 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="aurora-blob-2 pointer-events-none absolute bottom-[-10%] left-[-5%] h-[60vw] w-[60vw] rounded-full opacity-50 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0) 70%)',
          filter: 'blur(80px)',
        }}
      />
      <div
        className="aurora-blob-3 pointer-events-none absolute top-[40%] left-[30%] h-[50vw] w-[50vw] rounded-full opacity-40 mix-blend-screen"
        style={{
          background:
            'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, rgba(14, 165, 233, 0) 70%)',
          filter: 'blur(90px)',
        }}
      />
    </div>
  );
}
