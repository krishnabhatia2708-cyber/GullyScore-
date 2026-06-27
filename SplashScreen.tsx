import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStuck(true), 4000);
    return () => clearTimeout(t);
  }, []);

  if (stuck) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🏏</div>
          <h1 className="text-xl font-bold text-white mb-2">Loading Issues</h1>
          <p className="text-gray-400 text-sm mb-4">
            The app is taking longer than expected. This might be a network issue.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="gs-btn-primary px-6 py-2 text-sm"
          >
            Reload App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-bounce">🏏</div>
        <div className="text-3xl font-black mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          <span className="text-white">GULLY</span>
          <span className="text-amber-500">SCORE</span>
        </div>
        <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden mx-auto">
          <div className="h-full bg-amber-500 animate-pulse" style={{ animation: 'loading 1.5s infinite' }} />
        </div>
        <style>{`
          @keyframes loading {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
}
