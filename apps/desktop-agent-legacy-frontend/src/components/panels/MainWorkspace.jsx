import { CenterPanel } from './CenterPanel';
import { AgentPanel } from './AgentPanel';
import { GlassCard } from '../ui/GlassCard';

export function MainWorkspace({ currentTab, systemState, activeTask, messages, agents }) {
  
  if (currentTab === 'vision') {
    return (
      <div className="p-8 h-full flex flex-col gap-6 relative z-10">
        <h2 className="text-2xl font-mono text-jarvis-cyan text-glow">Vision Processing Module</h2>
        <div className="flex-1 grid grid-cols-2 gap-6">
          <GlassCard className="p-4 flex flex-col gap-4">
            <h3 className="font-mono text-sm text-jarvis-textMuted uppercase tracking-widest border-b border-jarvis-border/50 pb-2">Live Camera Feed</h3>
            <div className="flex-1 bg-black/50 rounded border border-jarvis-border flex justify-center items-center relative overflow-hidden">
              <div className="absolute inset-0 border-2 border-jarvis-cyan/30 m-4 rounded" style={{ clipPath: 'polygon(0 0, 10% 0, 0 10%, 0 0, 90% 0, 100% 0, 100% 10%, 100% 0, 100% 90%, 100% 100%, 90% 100%, 100% 100%, 0 100%, 10% 100%, 0 90%, 0 100%)'}}></div>
              <span className="font-mono text-jarvis-textMuted">FEED_OFFLINE</span>
            </div>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col gap-4">
            <h3 className="font-mono text-sm text-jarvis-textMuted uppercase tracking-widest border-b border-jarvis-border/50 pb-2">OCR & Object Detection</h3>
            <div className="flex-1 font-mono text-xs text-jarvis-textMuted p-4 bg-jarvis-bg/50 rounded border border-jarvis-border/30">
              <p className="text-jarvis-cyan mb-2">&gt; Awaiting visual input for analysis...</p>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  }

  if (currentTab === 'memory') {
    return (
      <div className="p-8 h-full flex flex-col gap-6 relative z-10">
        <h2 className="text-2xl font-mono text-jarvis-purple text-glow">Semantic Memory Graph</h2>
        <GlassCard className="flex-1 p-4 flex justify-center items-center" heavy>
           <span className="font-mono text-jarvis-textMuted">No memory clusters selected.</span>
        </GlassCard>
      </div>
    );
  }

  // Default Dashboard/Conversations view
  return (
    <div className="flex h-full w-full">
      <CenterPanel systemState={systemState} messages={messages} />
      {currentTab !== 'conversations' && <AgentPanel agents={agents} />}
    </div>
  );
}
