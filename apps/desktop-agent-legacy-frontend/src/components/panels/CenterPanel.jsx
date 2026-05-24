import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { JarvisOrb } from '../ui/JarvisOrb';
import { GlassCard } from '../ui/GlassCard';
import { Waveform } from '../ui/Waveform';

export function CenterPanel({ systemState, messages }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col h-full relative z-10 px-6 py-4 max-w-4xl mx-auto w-full">
      
      {/* Top Orb Area */}
      <div className="flex flex-col items-center justify-center py-6 shrink-0 h-[300px]">
        <JarvisOrb state={systemState} />
        <div className="h-10 mt-4">
          {systemState === 'LISTENING' && <Waveform color="#ef4444" />}
          {systemState === 'THINKING' && <Waveform color="#a855f7" />}
          {systemState === 'SPEAKING' && <Waveform color="#3b82f6" />}
        </div>
      </div>

      {/* Chat Area */}
      <GlassCard className="flex-1 flex flex-col mb-4 overflow-hidden" heavy>
        <div className="border-b border-jarvis-border/50 px-4 py-2 bg-jarvis-panel flex justify-between items-center shrink-0">
          <div className="font-mono text-xs uppercase tracking-widest text-jarvis-cyan flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan animate-pulse"></div>
            Live Feed
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"
        >
          {messages.map((msg, idx) => (
            <motion.div 
              key={msg.id || idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}
            >
              <div className={`text-[10px] font-mono mb-1 text-jarvis-textMuted ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.sender === 'user' ? 'USER' : 'JARVIS'} // {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
              
              <div className={`
                p-4 rounded-xl text-sm leading-relaxed border backdrop-blur-sm
                ${msg.sender === 'user' 
                  ? 'bg-jarvis-panel/80 border-jarvis-border/50 text-jarvis-text rounded-tr-none' 
                  : 'bg-jarvis-cyan/10 border-jarvis-cyan/30 text-jarvis-cyan rounded-tl-none shadow-[0_0_15px_rgba(6,182,212,0.1)]'}
              `}>
                {msg.text}
                {msg.streaming && <span className="inline-block w-2 h-4 ml-1 bg-jarvis-cyan animate-pulse align-middle"></span>}
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
