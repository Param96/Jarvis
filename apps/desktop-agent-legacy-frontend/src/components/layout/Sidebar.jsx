import { Cpu, HardDrive, Wifi, Shield, Settings, Eye, Network, LayoutDashboard, MessageSquare } from 'lucide-react';

export function Sidebar({ currentTab, setCurrentTab, sysMetrics }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'agents', label: 'Agents', icon: Network },
    { id: 'vision', label: 'Vision', icon: Eye },
    { id: 'memory', label: 'Memory', icon: HardDrive },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-jarvis-border bg-jarvis-bg/90 backdrop-blur-md flex flex-col h-full relative z-20">
      {/* Scanline overlay specific to sidebar */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-30"></div>
      
      <div className="p-6 flex items-center gap-3 border-b border-jarvis-border/50">
        <div className="w-8 h-8 rounded-full border border-jarvis-cyan flex items-center justify-center bg-jarvis-cyan/10">
          <Shield size={16} className="text-jarvis-cyan" />
        </div>
        <h1 className="font-mono text-xl font-bold tracking-widest text-jarvis-cyan text-glow uppercase">Jarvis OS</h1>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        <div className="text-xs font-mono text-jarvis-textMuted mb-4 px-2 uppercase tracking-widest">Core Systems</div>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors font-sans text-sm ${
                isActive 
                  ? 'bg-jarvis-cyan/15 text-jarvis-cyan border border-jarvis-cyan/30 shadow-[inset_0_0_10px_rgba(6,182,212,0.1)]' 
                  : 'text-jarvis-textMuted hover:bg-jarvis-panel hover:text-jarvis-text'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-jarvis-cyan' : 'text-jarvis-textMuted'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-jarvis-border/50">
        <div className="text-xs font-mono text-jarvis-textMuted mb-3 uppercase tracking-widest">Hardware Telemetry</div>
        
        <div className="space-y-3">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-jarvis-textMuted font-mono">
              <span className="flex items-center gap-1"><Cpu size={12}/> CPU</span>
              <span>{sysMetrics.cpu.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-jarvis-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-jarvis-cyan transition-all duration-500" 
                style={{ width: `${sysMetrics.cpu}%` }}
              ></div>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-jarvis-textMuted font-mono">
              <span className="flex items-center gap-1"><HardDrive size={12}/> MEM</span>
              <span>{sysMetrics.ram.toFixed(1)}%</span>
            </div>
            <div className="h-1 bg-jarvis-border rounded-full overflow-hidden">
              <div 
                className="h-full bg-jarvis-blue transition-all duration-500" 
                style={{ width: `${sysMetrics.ram}%` }}
              ></div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-jarvis-textMuted font-mono">
              <span className="flex items-center gap-1"><Wifi size={12}/> LATENCY</span>
              <span>{sysMetrics.latency.toFixed(0)}ms</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
