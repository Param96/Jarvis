import { motion } from 'framer-motion';
import { GlassCard } from '../ui/GlassCard';
import { Bot, CheckCircle2, CircleDashed } from 'lucide-react';

export function AgentPanel({ agents }) {
  return (
    <div className="w-80 h-full border-l border-jarvis-border bg-jarvis-panel/20 backdrop-blur-sm p-4 overflow-y-auto flex flex-col gap-4 relative z-10 hidden xl:flex">
      
      <div className="flex items-center gap-2 mb-2">
        <Bot size={16} className="text-jarvis-cyan" />
        <h2 className="font-mono text-sm tracking-widest text-jarvis-text uppercase">Agent Swarm</h2>
      </div>

      <div className="flex flex-col gap-3">
        {agents.map(agent => (
          <GlassCard key={agent.id} className="p-3">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                {agent.status === 'running' 
                  ? <CircleDashed size={14} className="text-jarvis-purple animate-spin" />
                  : <CheckCircle2 size={14} className="text-jarvis-textMuted" />
                }
                <span className="font-sans text-sm font-medium text-jarvis-text">{agent.name}</span>
              </div>
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded border ${
                agent.status === 'running' ? 'border-jarvis-purple text-jarvis-purple bg-jarvis-purple/10' : 'border-jarvis-border text-jarvis-textMuted bg-jarvis-bg'
              }`}>
                {agent.status.toUpperCase()}
              </span>
            </div>

            <div className="flex justify-between text-[10px] font-mono text-jarvis-textMuted mb-1">
              <span>Model: {agent.model}</span>
              <span>{agent.progress}%</span>
            </div>
            
            <div className="h-1 bg-jarvis-border/50 rounded-full overflow-hidden">
              <motion.div 
                className={`h-full ${agent.status === 'running' ? 'bg-jarvis-purple shadow-[0_0_8px_rgba(168,85,247,0.8)]' : 'bg-jarvis-textMuted/30'}`}
                initial={{ width: 0 }}
                animate={{ width: `${agent.progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-jarvis-border/50">
        <h3 className="font-mono text-[10px] text-jarvis-textMuted uppercase tracking-widest mb-3">Memory Retrieval</h3>
        <GlassCard className="p-3 border-jarvis-blue/20 bg-jarvis-blue/5">
          <div className="font-mono text-xs text-jarvis-text mb-2">Project Context</div>
          <div className="text-[10px] text-jarvis-textMuted space-y-1">
            <p>• Root: /Desktop/Jarvis</p>
            <p>• Stack: React, Tailwind, Framer</p>
            <p className="text-jarvis-blue">→ Semantic match: 94%</p>
          </div>
        </GlassCard>
      </div>

    </div>
  );
}
