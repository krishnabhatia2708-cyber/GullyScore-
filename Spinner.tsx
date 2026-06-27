export function Spinner({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className={`${sizes[size]} border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin ${className}`} />
  );
}

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="text-5xl font-black font-rajdhani text-gradient-gold tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
        GULLY<span className="text-amber-500">SCORE</span>
      </div>
      <Spinner size="lg" />
    </div>
  );
}
