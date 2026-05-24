"use client";

import { Shield, LayoutDashboard, Settings, Cpu, MemoryStick, Activity, Bot, Mic, TerminalSquare, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { JarvisOrb, OrbState } from '../components/JarvisOrb';

type Tab = 'overview' | 'agent';

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<{ cpu: number; ram: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([
    { role: 'system', text: 'Jarvis Online. Waiting for voice input...' }
  ]);

  useEffect(() => {
    // Connect to WebSocket for telemetry
    const deviceId = "local-dev-machine-001";
    const ws = new WebSocket(`ws://localhost:8001/ws/web/${deviceId}`);

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
    return () => ws.close();
  }, []);

  const handleSimulateCommand = () => {
    setOrbState('listening');
    setTranscript(prev => [...prev, { role: 'user', text: '*Listening to microphone...*' }]);
    
    setTimeout(() => {
      setOrbState('thinking');
      setTranscript(prev => [...prev, { role: 'user', text: 'What is the current system status?' }]);
      
      setTimeout(() => {
        setOrbState('speaking');
        setTranscript(prev => [...prev, { role: 'assistant', text: 'All systems are online. CPU is nominal. The Cloud Relay is functioning perfectly.' }]);
        
        setTimeout(() => {
          setOrbState('idle');
        }, 3000);
      }, 2000);
    }, 2000);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-jarvis-bg text-jarvis-text font-mono selection:bg-jarvis-cyan/30">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-jarvis-border bg-jarvis-panel p-6 flex flex-col gap-6 z-10">
        <div className="flex items-center gap-3 border-b border-jarvis-border pb-4">
          <div className="w-8 h-8 rounded-full border border-jarvis-cyan flex items-center justify-center bg-jarvis-cyan/10">
            <Shield size={16} className="text-jarvis-cyan" />
          </div>
          <h1 className="text-xl font-bold tracking-widest text-jarvis-cyan text-glow uppercase">Jarvis Cloud</h1>
        </div>
        
        <nav className="flex flex-col gap-2 flex-1">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'overview' ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30' : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 border border-transparent'}`}
          >
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'agent' ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30' : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 border border-transparent'}`}
          >
            <Bot size={18} />
            <span>Remote Agent</span>
          </button>

          <div className="my-2 border-b border-jarvis-border/50"></div>

          <button className="flex items-center gap-3 px-3 py-2 text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 rounded transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
        
        {/* Sidebar Mini Status */}
        <div className="pt-4 border-t border-jarvis-border">
          <div className="text-xs text-jarvis-textMuted flex items-center justify-between">
            <span>Tunnel Status:</span>
            {connected ? <span className="text-jarvis-cyan">UP</span> : <span className="text-jarvis-red">DOWN</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        <AnimatePresence mode="wait">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div 
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 p-10 flex flex-col gap-8"
            >
              <header className="flex justify-between items-center">
                <h2 className="text-2xl tracking-widest uppercase">System Dashboard</h2>
                <div className="flex items-center gap-2 text-jarvis-textMuted text-sm">
                  Status: 
                  {connected ? (
                    <span className="text-jarvis-cyan flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse"></span>
                      LIVE
                    </span>
                  ) : (
                    <span className="text-jarvis-red">OFFLINE</span>
                  )}
                </div>
              </header>

              <div className="grid grid-cols-3 gap-6">
                <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-cyan"></div>
                  <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">ACTIVE DEVICES</h3>
                  <div className="text-4xl font-bold">1</div>
                  <p className="text-jarvis-cyan text-xs mt-2">local-dev-machine-001</p>
                </div>
                <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-purple"></div>
                  <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">CURRENT PLAN</h3>
                  <div className="text-2xl font-bold">PRO TIER</div>
                  <p className="text-jarvis-purple text-xs mt-2">$29/mo • OpenAI Access</p>
                </div>
                <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-blue"></div>
                  <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">TOKENS CONSUMED</h3>
                  <div className="text-4xl font-bold">14,204</div>
                  <p className="text-jarvis-blue text-xs mt-2">This billing cycle</p>
                </div>
              </div>

              <div className="flex-1 border border-jarvis-border bg-jarvis-panel p-8 rounded-lg flex flex-col relative overflow-hidden">
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#3b82f6 1px, transparent 1px), linear-gradient(90deg, #3b82f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
                <h3 className="text-xl tracking-widest uppercase mb-8 flex items-center gap-3">
                  <Activity className="text-jarvis-cyan" />
                  Live Agent Telemetry
                </h3>
                {!telemetry ? (
                  <div className="flex-1 flex justify-center items-center">
                    <div className="text-center space-y-4">
                      <div className="inline-block w-16 h-16 rounded-full border-2 border-jarvis-cyan/30 flex justify-center items-center relative">
                        <div className="absolute w-full h-full rounded-full border-t-2 border-jarvis-cyan animate-spin"></div>
                      </div>
                      <p className="text-jarvis-textMuted tracking-widest">AWAITING TELEMETRY FROM DESKTOP AGENT...</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-12 flex-1">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2">
                        <Cpu size={18} />
                        CPU UTILIZATION
                      </div>
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                          <motion.circle 
                            cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-cyan"
                            strokeDasharray={2 * Math.PI * 88}
                            initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - telemetry.cpu / 100) }}
                            transition={{ type: "spring", bounce: 0, duration: 1 }}
                          />
                        </svg>
                        <div className="text-4xl font-bold text-glow text-jarvis-cyan">{telemetry.cpu.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2">
                        <MemoryStick size={18} />
                        MEMORY USAGE
                      </div>
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                          <motion.circle 
                            cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-purple"
                            strokeDasharray={2 * Math.PI * 88}
                            initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - telemetry.ram / 100) }}
                            transition={{ type: "spring", bounce: 0, duration: 1 }}
                          />
                        </svg>
                        <div className="text-4xl font-bold text-glow text-jarvis-purple">{telemetry.ram.toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* AGENT TAB */}
          {activeTab === 'agent' && (
            <motion.div 
              key="agent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute inset-0 flex flex-col items-center justify-between pt-16 pb-6 px-10"
            >
              
              {/* Orb Area */}
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl">
                <JarvisOrb state={orbState} />
                
                {/* State Debugger / Controls */}
                <div className="mt-12 flex gap-3 z-10">
                  <button onClick={() => setOrbState('idle')} className="px-4 py-1 text-xs border border-jarvis-border rounded-full hover:bg-jarvis-border text-jarvis-textMuted uppercase tracking-widest">Idle</button>
                  <button onClick={() => setOrbState('listening')} className="px-4 py-1 text-xs border border-jarvis-cyan/30 text-jarvis-cyan rounded-full hover:bg-jarvis-cyan/10 uppercase tracking-widest">Listening</button>
                  <button onClick={() => setOrbState('thinking')} className="px-4 py-1 text-xs border border-jarvis-purple/30 text-jarvis-purple rounded-full hover:bg-jarvis-purple/10 uppercase tracking-widest">Thinking</button>
                  <button onClick={() => setOrbState('speaking')} className="px-4 py-1 text-xs border border-jarvis-blue/30 text-jarvis-blue rounded-full hover:bg-jarvis-blue/10 uppercase tracking-widest">Speaking</button>
                </div>
              </div>

              {/* Interaction Panel */}
              <div className="w-full max-w-4xl bg-jarvis-panel border border-jarvis-border rounded-xl flex flex-col mt-8 shadow-2xl relative z-10">
                
                {/* Transcript */}
                <div className="h-48 p-6 overflow-y-auto flex flex-col gap-3 font-sans">
                  {transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`px-4 py-2 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-jarvis-border text-white' : msg.role === 'system' ? 'text-jarvis-textMuted text-sm italic' : 'bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-jarvis-border p-4 flex items-center gap-4 bg-black/20 rounded-b-xl">
                  <button 
                    onClick={handleSimulateCommand}
                    className="w-12 h-12 rounded-full bg-jarvis-cyan text-black flex items-center justify-center hover:bg-cyan-400 transition-colors shrink-0"
                  >
                    <Mic size={24} />
                  </button>
                  
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-jarvis-textMuted" size={18} />
                    <input 
                      type="text" 
                      placeholder="Type a command or use voice..." 
                      className="w-full bg-jarvis-bg border border-jarvis-border rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-jarvis-cyan/50 text-white placeholder-jarvis-textMuted"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 px-4 py-2 border border-jarvis-border rounded-full text-xs text-jarvis-textMuted tracking-widest">
                    <TerminalSquare size={14} />
                    GPT-4o Connected
                  </div>
                </div>

              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
