import { useEffect, useState } from 'react';
import { Search, Mic, Camera, BrainCircuit } from 'lucide-react';

export function TopBar({ systemState, activeTask }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (state) => {
    switch (state) {
      case 'LISTENING': return 'bg-jarvis-red text-jarvis-red border-jarvis-red shadow-[0_0_10px_rgba(239,68,68,0.5)]';
      case 'THINKING': return 'bg-jarvis-purple text-jarvis-purple border-jarvis-purple shadow-[0_0_10px_rgba(168,85,247,0.5)]';
      case 'SPEAKING': return 'bg-jarvis-blue text-jarvis-blue border-jarvis-blue shadow-[0_0_10px_rgba(59,130,246,0.5)]';
      default: return 'bg-jarvis-cyan text-jarvis-cyan border-jarvis-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]';
    }
  };

  return (
    <header className="h-16 border-b border-jarvis-border bg-jarvis-bg/90 backdrop-blur-md flex items-center justify-between px-6 z-10 relative">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full border ${getStatusColor(systemState)}`}></div>
          <span className="font-mono text-sm tracking-wider uppercase text-jarvis-textMuted w-24">
            {systemState}
          </span>
        </div>
        
        <div className="h-6 w-px bg-jarvis-border"></div>
        
        <div className="font-mono text-sm text-jarvis-textMuted tracking-widest truncate max-w-md">
          <span className="text-jarvis-cyan opacity-50 mr-2">TASK &gt;</span>
          {activeTask}
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Sensor Status */}
        <div className="flex items-center gap-3 border border-jarvis-border rounded-full px-3 py-1.5 bg-jarvis-panel/50">
          <Mic size={14} className={systemState === 'LISTENING' ? 'text-jarvis-red animate-pulse' : 'text-jarvis-textMuted'} />
          <Camera size={14} className="text-jarvis-textMuted" />
          <BrainCircuit size={14} className="text-jarvis-textMuted" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-jarvis-textMuted" />
          <input 
            type="text" 
            placeholder="Search Memory & Logs..." 
            className="bg-jarvis-panel border border-jarvis-border/50 text-jarvis-text text-sm rounded-full pl-9 pr-4 py-1.5 focus:outline-none focus:border-jarvis-cyan focus:ring-1 focus:ring-jarvis-cyan w-64 transition-all"
          />
        </div>

        {/* Clock */}
        <div className="font-mono text-jarvis-cyan text-sm tracking-widest text-glow w-20 text-right">
          {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
        </div>
      </div>
    </header>
  );
}
