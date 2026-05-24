export function GlassCard({ children, className = '', heavy = false }) {
  const baseClass = heavy 
    ? 'glass-panel-heavy' 
    : 'glass-panel';

  return (
    <div className={`${baseClass} ${className}`}>
      {/* Decorative corners */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-jarvis-cyan/40 rounded-tl-xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-jarvis-cyan/40 rounded-br-xl pointer-events-none" />
      {children}
    </div>
  );
}
