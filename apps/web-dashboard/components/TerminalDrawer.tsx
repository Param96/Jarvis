'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight } from 'lucide-react';

interface TerminalLine {
  type: 'input' | 'output' | 'system' | 'error';
  text: string;
  timestamp: Date;
}

interface TerminalDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TerminalDrawer({ isOpen, onClose }: TerminalDrawerProps) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { type: 'system', text: '╔══════════════════════════════════════════════════╗', timestamp: new Date() },
    { type: 'system', text: '║  JARVIS TERMINAL v2.0 — Type /help for commands  ║', timestamp: new Date() },
    { type: 'system', text: '╚══════════════════════════════════════════════════╝', timestamp: new Date() },
    { type: 'system', text: '', timestamp: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // WebSocket connection
  useEffect(() => {
    if (!isOpen) return;

    const ws = new WebSocket('ws://localhost:8000/ws');
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setLines(prev => [...prev, { type: 'system', text: '[CONNECTED] Link established to Jarvis Core.', timestamp: new Date() }]);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'conversation.done') {
          const text = data.payload?.text || 'No response.';
          // Split multiline responses
          const responseLines = text.split('\n');
          setLines(prev => [
            ...prev,
            ...responseLines.map((line: string) => ({ type: 'output' as const, text: line, timestamp: new Date() }))
          ]);
          setIsProcessing(false);
        } else if (data.type === 'error') {
          setLines(prev => [...prev, { type: 'error', text: `[ERROR] ${data.payload?.message || 'Unknown error'}`, timestamp: new Date() }]);
          setIsProcessing(false);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      setIsConnected(false);
      setLines(prev => [...prev, { type: 'error', text: '[DISCONNECTED] Link to Jarvis Core lost.', timestamp: new Date() }]);
    };

    return () => {
      ws.close();
    };
  }, [isOpen]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    setLines(prev => [...prev, { type: 'input', text: cmd, timestamp: new Date() }]);
    setHistory(prev => [cmd, ...prev].slice(0, 50));
    setHistoryIndex(-1);
    setIsProcessing(true);
    setInput('');

    wsRef.current.send(JSON.stringify({
      type: 'conversation.text',
      text: cmd,
      session_id: 'terminal'
    }));
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = Math.min(historyIndex + 1, history.length - 1);
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const getLineColor = (type: TerminalLine['type']) => {
    switch (type) {
      case 'input': return 'text-cyan-400';
      case 'output': return 'text-green-400';
      case 'system': return 'text-yellow-500/80';
      case 'error': return 'text-red-500';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 h-[45vh] flex flex-col"
          style={{ fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace' }}
        >
          {/* Scanline overlay */}
          <div 
            className="absolute inset-0 pointer-events-none z-10 opacity-[0.03]"
            style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 255, 65, 0.1) 2px, rgba(0, 255, 65, 0.1) 4px)',
              animation: 'scanline 8s linear infinite'
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 bg-black border-t border-green-500/30 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-green-400 text-sm tracking-widest font-bold">JARVIS TERMINAL v2.0</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${
                isConnected ? 'text-green-400 border-green-500/30 bg-green-500/10' : 'text-red-400 border-red-500/30 bg-red-500/10'
              }`}>
                {isConnected ? '● ONLINE' : '○ OFFLINE'}
              </span>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Terminal body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto bg-black/95 px-5 py-4 text-sm leading-relaxed"
            style={{ scrollBehavior: 'smooth' }}
          >
            {lines.map((line, i) => (
              <div key={i} className={`${getLineColor(line.type)} whitespace-pre-wrap`}>
                {line.type === 'input' && (
                  <span className="text-cyan-600 mr-2">❯</span>
                )}
                {line.text}
              </div>
            ))}
            {isProcessing && (
              <div className="text-green-400/60 animate-pulse">Processing...</div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex items-center px-5 py-3 bg-black border-t border-green-500/20 shrink-0">
            <ChevronRight size={16} className="text-cyan-400 mr-2 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command... (try /help)"
              className="flex-1 bg-transparent text-green-400 placeholder-green-700/50 outline-none text-sm caret-green-400"
              autoComplete="off"
              spellCheck={false}
            />
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
