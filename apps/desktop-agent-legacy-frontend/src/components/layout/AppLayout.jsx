import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Terminal } from './Terminal';

export function AppLayout({ children, currentTab, setCurrentTab, sysMetrics, systemState, activeTask, logs }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-jarvis-bg text-jarvis-text font-sans selection:bg-jarvis-cyan/30">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} sysMetrics={sysMetrics} />
      
      <div className="flex-1 flex flex-col relative h-full">
        <TopBar systemState={systemState} activeTask={activeTask} />
        
        <main className="flex-1 overflow-hidden relative pb-10">
          {/* Global Scanline overlay for the main area */}
          <div className="absolute inset-0 scanline-overlay pointer-events-none"></div>
          
          {children}
        </main>

        <Terminal logs={logs} />
      </div>
    </div>
  );
}
