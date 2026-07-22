"use client";

import { Shield, LayoutDashboard, Settings, Cpu, MemoryStick, Activity, Bot, Mic, MicOff, Search, AlertCircle, Volume2, Terminal, Zap, Brain, Wrench, Clock, Radio, ChevronRight } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrbState, JarvisOrb } from '../components/JarvisOrb';
import { SettingsView } from '../components/SettingsView';
import { TerminalDrawer } from '../components/TerminalDrawer';

type Tab = 'overview' | 'agent' | 'settings';

interface SystemStats {
  active_model: string;
  cloud_provider: string;
  local_provider: string;
  agents_registered: number;
  skills_loaded: number;
  tools_registered: number;
  tts_provider: string;
  wake_word_enabled: boolean;
  memory_backend: string;
  uptime_seconds: number;
}

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<{ cpu: number; ram: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('agent');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([
    { role: 'system', text: 'Jarvis Voice Engine Initialized.' }
  ]);
  const [inputText, setInputText] = useState('');
  const [streamingText, setStreamingText] = useState<string>('');
  const [typingText, setTypingText] = useState<string>('');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingFullTextRef = useRef<string>('');
  
  // Voice & Error State
  const [isListening, setIsListening] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [convoMode, setConvoMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [terminalOpen, setTerminalOpen] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const backendWsRef = useRef<WebSocket | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Fetch live stats from backend
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, streamingText, typingText]);

  // Keyboard shortcut for terminal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const deviceId = "local-dev-machine-001";
    const ws = new WebSocket(`ws://localhost:8001/ws/web/${deviceId}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "telemetry" && data.metrics) {
          setTelemetry({ cpu: data.metrics.cpu, ram: data.metrics.ram });
        }
      } catch (err) {}
    };
    ws.onclose = () => setConnected(false);

    // Setup Backend WS
    const backendWs = new WebSocket("ws://localhost:8000/ws");
    backendWsRef.current = backendWs;

    backendWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "model.token") {
          setStreamingText(prev => prev + data.payload.token);
        } else if (data.type === "conversation.transcript") {
          setInputText(data.payload.text);
          setOrbState('thinking');
        } else if (data.type === "conversation.done") {
          const fullText = data.payload.text;
          const isSystem = data.payload.model === 'system';
          setStreamingText('');
          setInputText('');
          
          if (isSystem) {
            // System messages appear instantly
            setTranscript(prev => [...prev, { role: 'system', text: fullText }]);
            setOrbState('idle');
          } else {
            // Typewriter effect: reveal words synced with TTS (~150 words/min = ~400ms/word)
            setOrbState('speaking');
            pendingFullTextRef.current = fullText;
            const words = fullText.split(/(\s+)/); // preserve whitespace
            let wordIndex = 0;
            setTypingText('');
            
            // Clear any previous typewriter
            if (typewriterRef.current) clearInterval(typewriterRef.current);
            
            const msPerWord = Math.max(80, Math.min(400, (fullText.length / words.length) * 28));
            typewriterRef.current = setInterval(() => {
              wordIndex++;
              const revealed = words.slice(0, wordIndex).join('');
              setTypingText(revealed);
              
              if (wordIndex >= words.length) {
                // Done typing — move to transcript
                if (typewriterRef.current) clearInterval(typewriterRef.current);
                typewriterRef.current = null;
                setTypingText('');
                setTranscript(prev => [...prev, { role: 'assistant', text: fullText }]);
                pendingFullTextRef.current = '';
              }
            }, msPerWord);
          }
        } else if (data.type === "audio.tts_finished") {
          // TTS finished — if typewriter is still going, finish it instantly
          if (typewriterRef.current) {
            clearInterval(typewriterRef.current);
            typewriterRef.current = null;
          }
          if (pendingFullTextRef.current) {
            setTypingText('');
            setTranscript(prev => [...prev, { role: 'assistant', text: pendingFullTextRef.current }]);
            pendingFullTextRef.current = '';
          }
          setOrbState('idle');
          if (recognitionRef.current && document.body.dataset.convoMode === 'true') {
             try { recognitionRef.current.start(); } catch (e) {}
             setOrbState('listening');
          }
        } else if (data.type === "error") {
          setErrorMsg(data.payload.message);
          setOrbState('idle');
        }
      } catch (e) {}
    };

    return () => {
      ws.close();
      backendWs.close();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    document.body.dataset.convoMode = convoMode ? 'true' : 'false';
  }, [convoMode]);

  const toggleConvoMode = () => {
    if (convoMode) {
      setConvoMode(false);
      setOrbState('idle');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setErrorMsg("Your browser does not support Conversational Voice Mode (use Chrome).");
        return;
      }
      setConvoMode(true);
      setOrbState('listening');
      
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript.trim()) {
           handleCommandSubmit(undefined, finalTranscript.trim());
        }
      };
      
      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          console.error("Speech Rec Error:", event.error);
          setConvoMode(false);
          setOrbState('idle');
        }
      };
      
      recognition.onend = () => {
        if (document.body.dataset.convoMode === 'true') {
           setOrbState('idle');
        }
      };
      
      recognitionRef.current = recognition;
      try { recognition.start(); } catch (e) {}
    }
  };

  const handleCommandSubmit = async (e?: React.FormEvent, overrideCommand?: string) => {
    if (e) e.preventDefault();
    const command = overrideCommand || inputText.trim();
    if (!command) return;

    setInputText('');
    setOrbState('thinking');
    setTranscript(prev => [...prev, { role: 'user', text: command }]);
    
    try {
      if (backendWsRef.current?.readyState === WebSocket.OPEN) {
        backendWsRef.current.send(JSON.stringify({
          type: "conversation.text",
          text: command,
          session_id: "web-dashboard"
        }));
      } else {
        throw new Error("WebSocket disconnected.");
      }
    } catch (err) {
      console.error(err);
      setTranscript(prev => [...prev, { role: 'system', text: "Error: Could not reach Swarm Backend." }]);
      setOrbState('idle');
    }
  };

  // Format uptime
  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  // Tab animation variants
  const tabVariants = {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
    exit: { opacity: 0, y: -20, scale: 0.98, transition: { duration: 0.2 } }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030308] text-jarvis-text font-sans selection:bg-jarvis-cyan/30">
      
      {/* Animated Grid Background */}
      <div className="fixed inset-0 animated-grid pointer-events-none z-0" />

      {/* Sidebar */}
      <aside className="w-64 border-r border-jarvis-border/50 bg-black/40 backdrop-blur-xl p-6 flex flex-col gap-6 z-10 relative">
        {/* Sidebar gradient accent */}
        <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-jarvis-cyan/30 via-transparent to-jarvis-purple/20" />

        <div className="flex items-center gap-3 border-b border-jarvis-border/50 pb-4">
          <motion.div 
            className="w-9 h-9 rounded-lg border border-jarvis-cyan/50 flex items-center justify-center bg-jarvis-cyan/10"
            whileHover={{ scale: 1.1, borderColor: 'rgba(6,182,212,0.8)' }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            <Shield size={16} className="text-jarvis-cyan" />
          </motion.div>
          <div>
            <h1 className="text-lg font-bold tracking-widest text-jarvis-cyan text-glow-subtle uppercase">Jarvis</h1>
            <p className="text-[10px] text-jarvis-textMuted tracking-widest">CLOUD INTELLIGENCE</p>
          </div>
        </div>
        
        <nav className="flex flex-col gap-1.5 flex-1">
          {([
            { id: 'overview' as Tab, icon: LayoutDashboard, label: 'Overview' },
            { id: 'agent' as Tab, icon: Bot, label: 'Agent Console' },
          ]).map(({ id, icon: Icon, label }) => (
            <motion.button 
              key={id}
              onClick={() => setActiveTab(id)} 
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                activeTab === id 
                  ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30 sidebar-active' 
                  : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-white/5 border border-transparent'
              }`}
              whileHover={{ x: 3 }}
              whileTap={{ scale: 0.97 }}
            >
              <Icon size={17} /><span className="tracking-wide">{label}</span>
            </motion.button>
          ))}

          <div className="my-2 border-b border-jarvis-border/30" />

          <motion.button 
            onClick={() => setActiveTab('settings')} 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
              activeTab === 'settings' 
                ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30 sidebar-active' 
                : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-white/5 border border-transparent'
            }`}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
          >
            <Settings size={17} /><span className="tracking-wide">Settings</span>
          </motion.button>

          <div className="my-2 border-b border-jarvis-border/30" />

          <motion.button
            onClick={() => setTerminalOpen(prev => !prev)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
              terminalOpen 
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-white/5 border border-transparent'
            }`}
            whileHover={{ x: 3 }}
            whileTap={{ scale: 0.97 }}
          >
            <Terminal size={17} /><span className="tracking-wide">Terminal</span>
            <span className="ml-auto text-[10px] text-jarvis-textMuted/60">⌘`</span>
          </motion.button>
        </nav>
        
        {/* Sidebar Mini Status */}
        <div className="pt-4 border-t border-jarvis-border/30 space-y-2.5">
          <div className="text-xs text-jarvis-textMuted flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Radio size={12} />Backend:</span>
            {connected ? (
              <span className="text-jarvis-cyan flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-jarvis-cyan status-dot-live" />LIVE
              </span>
            ) : (
              <span className="text-jarvis-red flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-jarvis-red" />DOWN
              </span>
            )}
          </div>
          <div className="text-xs text-jarvis-textMuted flex items-center justify-between">
            <span className="flex items-center gap-1.5"><Brain size={12} />Model:</span>
            <span className="text-jarvis-cyan text-[10px] truncate max-w-[100px]">{stats?.active_model || '...'}</span>
          </div>
          {stats && (
            <div className="text-xs text-jarvis-textMuted flex items-center justify-between">
              <span className="flex items-center gap-1.5"><Clock size={12} />Uptime:</span>
              <span className="text-jarvis-textMuted">{formatUptime(stats.uptime_seconds)}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar">
        
        {/* Global Error Toast */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50, scale: 0.9 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-jarvis-red/10 border border-jarvis-red/50 text-jarvis-red px-6 py-3 rounded-xl flex items-center gap-3 shadow-lg shadow-jarvis-red/10 backdrop-blur-xl"
              onClick={() => setErrorMsg(null)}
            >
              <AlertCircle size={18} />
              <span className="text-sm tracking-wide">{errorMsg}</span>
              <span className="text-xs opacity-50 ml-2 cursor-pointer">×</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 p-10 flex flex-col gap-8">
              <header className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-semibold tracking-wider">System Dashboard</h2>
                  <p className="text-jarvis-textMuted text-sm mt-1">Real-time system metrics and status</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  Status: {connected ? (
                    <span className="text-jarvis-cyan flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-jarvis-cyan status-dot-live" />LIVE
                    </span>
                  ) : (
                    <span className="text-jarvis-red">OFFLINE</span>
                  )}
                </div>
              </header>

              {/* Live Stats Cards */}
              <div className="grid grid-cols-4 gap-5">
                {[
                  { label: 'ACTIVE MODEL', value: stats?.active_model || 'Loading...', icon: Brain, color: 'jarvis-cyan', accent: '#06b6d4' },
                  { label: 'AGENTS', value: stats ? String(stats.agents_registered) : '...', icon: Bot, color: 'jarvis-purple', accent: '#a855f7' },
                  { label: 'SKILLS LOADED', value: stats ? String(stats.skills_loaded) : '...', icon: Zap, color: 'jarvis-blue', accent: '#3b82f6' },
                  { label: 'TOOLS', value: stats ? String(stats.tools_registered) : '...', icon: Wrench, color: 'jarvis-cyan', accent: '#06b6d4' },
                ].map(({ label, value, icon: Icon, color, accent }, i) => (
                  <motion.div
                    key={label}
                    className="glass-card glow-border p-5 rounded-xl relative overflow-hidden group cursor-default"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.4 }}
                    whileHover={{ y: -2 }}
                  >
                    <div className="absolute top-0 left-0 w-full h-[2px] shimmer-line" style={{ background: `linear-gradient(90deg, transparent 30%, ${accent}33 50%, transparent 70%)`, backgroundSize: '200% 100%' }} />
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={14} className={`text-${color}`} style={{ color: accent }} />
                      <h3 className="text-jarvis-textMuted text-[11px] tracking-widest font-medium">{label}</h3>
                    </div>
                    <div className="text-2xl font-bold truncate" style={{ color: accent }}>{value}</div>
                  </motion.div>
                ))}
              </div>

              {/* System Info Row */}
              <div className="grid grid-cols-3 gap-5">
                {[
                  { label: 'Cloud Provider', value: stats?.cloud_provider || '...', sub: stats?.cloud_provider !== 'disabled' ? 'Active' : 'Disabled' },
                  { label: 'TTS Engine', value: stats?.tts_provider || '...', sub: 'Voice Output' },
                  { label: 'Memory Backend', value: stats?.memory_backend || '...', sub: 'Knowledge Store' },
                ].map(({ label, value, sub }, i) => (
                  <motion.div
                    key={label}
                    className="glass-card p-5 rounded-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1, duration: 0.4 }}
                  >
                    <h3 className="text-jarvis-textMuted text-[11px] tracking-widest mb-2">{label}</h3>
                    <div className="text-lg font-semibold text-white capitalize">{value}</div>
                    <p className="text-jarvis-textMuted text-xs mt-1">{sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Telemetry Section */}
              <motion.div 
                className="flex-1 glass-card p-8 rounded-xl flex flex-col relative overflow-hidden"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                <h3 className="text-lg tracking-widest uppercase mb-8 flex items-center gap-3 font-medium">
                  <Activity className="text-jarvis-cyan" size={20} />Live Agent Telemetry
                </h3>
                {!telemetry ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="text-center space-y-4">
                      <div className="inline-block w-16 h-16 rounded-full border-2 border-jarvis-cyan/30 flex justify-center items-center relative">
                        <div className="absolute w-full h-full rounded-full border-t-2 border-jarvis-cyan animate-spin" />
                      </div>
                      <p className="text-jarvis-textMuted tracking-widest text-sm">AWAITING TELEMETRY FROM DESKTOP AGENT...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-12 flex-1">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="text-jarvis-textMuted tracking-widest text-sm flex items-center gap-2"><Cpu size={16} />CPU UTILIZATION</div>
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="6" fill="none" className="text-jarvis-border/30" />
                          <motion.circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="6" fill="none" className="text-jarvis-cyan" strokeDasharray={2 * Math.PI * 80} initial={{ strokeDashoffset: 2 * Math.PI * 80 }} animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - telemetry.cpu / 100) }} transition={{ type: "spring", bounce: 0, duration: 1 }} strokeLinecap="round" />
                        </svg>
                        <div className="text-3xl font-bold text-glow-subtle text-jarvis-cyan">{telemetry.cpu.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="text-jarvis-textMuted tracking-widest text-sm flex items-center gap-2"><MemoryStick size={16} />MEMORY USAGE</div>
                      <div className="relative w-44 h-44 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="6" fill="none" className="text-jarvis-border/30" />
                          <motion.circle cx="88" cy="88" r="80" stroke="currentColor" strokeWidth="6" fill="none" className="text-jarvis-purple" strokeDasharray={2 * Math.PI * 80} initial={{ strokeDashoffset: 2 * Math.PI * 80 }} animate={{ strokeDashoffset: 2 * Math.PI * 80 * (1 - telemetry.ram / 100) }} transition={{ type: "spring", bounce: 0, duration: 1 }} strokeLinecap="round" />
                        </svg>
                        <div className="text-3xl font-bold text-glow-subtle text-jarvis-purple">{telemetry.ram.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* AGENT TAB */}
          {activeTab === 'agent' && (
            <motion.div key="agent" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0 flex flex-col items-center justify-between pt-12 pb-6 px-10">
              
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative">
                <JarvisOrb state={orbState} />
              </div>

              <motion.div 
                className="w-full max-w-4xl glass-card rounded-xl flex flex-col mt-6 shadow-2xl relative z-10 overflow-hidden"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {/* Transcript Area */}
                {!convoMode && (
                  <div className="h-52 p-5 overflow-y-auto flex flex-col gap-2.5 font-sans custom-scrollbar">
                    {transcript.map((msg, i) => (
                      <motion.div 
                        key={i} 
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className={`whitespace-pre-wrap px-4 py-2.5 rounded-xl max-w-[80%] text-sm leading-relaxed ${
                          msg.role === 'user' 
                            ? 'bg-jarvis-cyan/10 border border-jarvis-cyan/20 text-white' 
                            : msg.role === 'system' 
                              ? 'text-jarvis-textMuted text-xs italic' 
                              : 'bg-white/5 border border-white/10 text-gray-200'
                        }`}>
                          {msg.text}
                        </div>
                      </motion.div>
                    ))}
                    {streamingText && (
                      <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="whitespace-pre-wrap px-4 py-2.5 rounded-xl max-w-[80%] bg-white/5 border border-white/10 text-gray-200 text-sm leading-relaxed">
                          {streamingText}
                          <span className="inline-block w-2 h-4 ml-1 bg-jarvis-cyan animate-pulse rounded-sm" />
                        </div>
                      </motion.div>
                    )}
                    {typingText && (
                      <motion.div className="flex justify-start" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        <div className="whitespace-pre-wrap px-4 py-2.5 rounded-xl max-w-[80%] bg-white/5 border border-white/10 text-gray-200 text-sm leading-relaxed">
                          {typingText}
                          <span className="inline-block w-2 h-4 ml-1 bg-jarvis-cyan animate-pulse rounded-sm" />
                        </div>
                      </motion.div>
                    )}
                    <div ref={transcriptEndRef} />
                  </div>
                )}
                
                {/* Convo Mode View */}
                {convoMode && (
                  <div className="h-52 p-6 flex flex-col items-center justify-center font-sans text-center">
                    <motion.div 
                      className="text-xl text-jarvis-cyan mb-3 font-medium tracking-wide"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      Conversational Mode Active
                    </motion.div>
                    <div className="text-jarvis-textMuted text-base max-w-lg leading-relaxed">
                      {typingText || streamingText || "Speak naturally — Jarvis is listening..."}
                    </div>
                  </div>
                )}

                {/* Input Area */}
                <form onSubmit={(e) => handleCommandSubmit(e)} className="border-t border-white/10 p-4 flex items-center gap-3 bg-black/30">
                  <motion.button 
                    type="button"
                    onClick={toggleConvoMode}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                      convoMode 
                        ? 'bg-jarvis-red/20 text-jarvis-red border border-jarvis-red/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
                        : 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30 hover:bg-jarvis-cyan/20'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    title={convoMode ? "Disable Convo Mode" : "Enable Convo Mode"}
                  >
                    {convoMode ? <Mic size={20} /> : <MicOff size={20} />}
                  </motion.button>
                  
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-jarvis-textMuted/50" size={16} />
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={convoMode ? 'Voice mode active — speak or type...' : "Ask Jarvis anything, or type / for commands..."} 
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-5 focus:outline-none focus:border-jarvis-cyan/40 text-white placeholder-jarvis-textMuted/40 text-sm transition-colors"
                    />
                  </div>
                  
                  <motion.button 
                    type="submit" 
                    className="w-11 h-11 rounded-xl bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan flex items-center justify-center hover:bg-jarvis-cyan/20 transition-colors shrink-0"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronRight size={20} />
                  </motion.button>
                </form>
              </motion.div>

            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" variants={tabVariants} initial="initial" animate="animate" exit="exit" className="absolute inset-0">
              <SettingsView />
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Terminal Drawer */}
      <TerminalDrawer isOpen={terminalOpen} onClose={() => setTerminalOpen(false)} />
    </div>
  );
}
