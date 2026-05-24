import { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Terminal({ logs }) {
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const getColorForType = (type) => {
    switch (type) {
      case 'info': return 'text-jarvis-textMuted';
      case 'tool': return 'text-jarvis-blue';
      case 'routing': return 'text-jarvis-purple';
      case 'success': return 'text-jarvis-cyan';
      case 'error': return 'text-jarvis-red';
      default: return 'text-jarvis-text';
    }
  };

  return (
    <div className={`absolute bottom-0 left-64 right-0 border-t border-jarvis-border bg-jarvis-bg/95 backdrop-blur-xl z-30 flex flex-col transition-all duration-300 ${isOpen ? 'h-64' : 'h-10'}`}>
      {/* Header / Toggle */}
      <div 
        className="h-10 px-4 flex items-center justify-between cursor-pointer hover:bg-jarvis-panel/50 border-b border-jarvis-border/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <TerminalIcon size={14} className="text-jarvis-cyan" />
          <span className="font-mono text-xs text-jarvis-text uppercase tracking-widest">System Console</span>
        </div>
        <div className="flex items-center gap-2 text-jarvis-textMuted">
          <span className="font-mono text-[10px]">{logs.length} events logged</span>
          {isOpen ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1"
          >
            {logs.map((log) => (
              <div key={log.id} className="flex gap-4">
                <span className="text-jarvis-textMuted/50 shrink-0">
                  [{new Date(log.time).toISOString().split('T')[1].replace('Z', '')}]
                </span>
                <span className={`${getColorForType(log.type)}`}>
                  {log.msg}
                </span>
              </div>
            ))}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
