"use client";

import { Shield, LayoutDashboard, Settings, Cpu, MemoryStick, Activity, Bot, Mic, MicOff, TerminalSquare, Search, AlertCircle, Volume2 } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OrbState, JarvisOrb } from '../components/JarvisOrb';
import { SettingsView } from '../components/SettingsView';

type Tab = 'overview' | 'agent' | 'settings';

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<{ cpu: number; ram: number } | null>(null);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('agent');
  const [orbState, setOrbState] = useState<OrbState>('idle');
  const [transcript, setTranscript] = useState<Array<{role: string, text: string}>>([
    { role: 'system', text: 'Jarvis Voice Engine Initialized.' }
  ]);
  const [inputText, setInputText] = useState('');
  
  // Voice & Error State
  const [isListening, setIsListening] = useState(false);
  const [micEnabled, setMicEnabled] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const backendWsRef = useRef<WebSocket | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Initialize Speech Synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      synthRef.current = window.speechSynthesis;
      
      const loadVoices = () => {
        const voices = synthRef.current?.getVoices() || [];
        const preferredVoices = ['Daniel', 'Alex', 'Samantha', 'Google UK English Male'];
        let selected = voices.find(v => preferredVoices.includes(v.name) && v.lang.startsWith('en'));
        if (!selected) {
          selected = voices.find(v => v.lang === 'en-GB' || v.lang === 'en-US');
        }
        if (selected) voiceRef.current = selected;
      };

      loadVoices();
      if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
      }
    } else {
      setErrorMsg("Your browser does not support Speech Synthesis (TTS).");
    }
  }, []);

  const speakResponse = (text: string) => {
    if (!synthRef.current) {
      setErrorMsg("Speech synthesis not available.");
      return;
    }
    
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
    }
    utterance.rate = 1.05;
    utterance.pitch = 0.9;

    utterance.onstart = () => setOrbState('speaking');
    utterance.onend = () => setOrbState('idle');
    utterance.onerror = (e) => {
      console.error("TTS Error:", e);
      setErrorMsg("Failed to play audio (browser autoplay policy may be blocking it).");
      setOrbState('idle');
    };

    synthRef.current.speak(utterance);
  };

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
        if (data.type === "conversation.transcript") {
          setInputText(data.payload.text);
          setOrbState('thinking');
        } else if (data.type === "conversation.done") {
          setTranscript(prev => [...prev, { role: data.payload.model === 'system' ? 'system' : 'assistant', text: data.payload.text }]);
          speakResponse(data.payload.text);
          setInputText('');
        } else if (data.type === "error") {
          setErrorMsg(data.payload.message);
          setOrbState('idle');
        }
      } catch (e) {}
    };

    return () => {
      ws.close();
      backendWs.close();
      if (synthRef.current) synthRef.current.cancel();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const toggleMic = async () => {
    if (micEnabled) {
      // Turn OFF mic: Stop recording and send the Blob
      setMicEnabled(false);
      setIsListening(false);
      setOrbState('idle');
      
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
    } else {
      // Turn ON mic: Start recording
      setErrorMsg(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          if (backendWsRef.current?.readyState === WebSocket.OPEN) {
            setOrbState('thinking');
            backendWsRef.current.send(audioBlob);
          }
        };

        mediaRecorder.start();
        setMicEnabled(true);
        setIsListening(true);
        setOrbState('listening');
      } catch (err: any) {
        console.error("Mic error:", err);
        setErrorMsg(`Microphone Error: ${err.message}. Please ensure mic permissions are granted.`);
        setMicEnabled(false);
        setIsListening(false);
      }
    }
  };

  const testVoice = () => {
    speakResponse("Testing Jarvis voice output. All systems nominal.");
  };

  const [activeModel, setActiveModel] = useState<string>("GPT-4o");
  const [selectedModel, setSelectedModel] = useState<string>("Auto");

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
          <button onClick={() => setActiveTab('overview')} className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'overview' ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30' : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 border border-transparent'}`}>
            <LayoutDashboard size={18} /><span>Overview</span>
          </button>
          
          <button onClick={() => setActiveTab('agent')} className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'agent' ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30' : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 border border-transparent'}`}>
            <Bot size={18} /><span>Remote Agent</span>
          </button>

          <div className="my-2 border-b border-jarvis-border/50"></div>

          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${activeTab === 'settings' ? 'bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30' : 'text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 border border-transparent'}`}>
            <Settings size={18} /><span>Settings</span>
          </button>
        </nav>
        
        {/* Sidebar Mini Status */}
        <div className="pt-4 border-t border-jarvis-border">
          <div className="text-xs text-jarvis-textMuted flex items-center justify-between mb-2">
            <span>Tunnel Status:</span>
            {connected ? <span className="text-jarvis-cyan">UP</span> : <span className="text-jarvis-red">DOWN</span>}
          </div>
          <div className="text-xs text-jarvis-textMuted flex items-center justify-between">
            <span>Voice Engine:</span>
            {isListening ? <span className="text-jarvis-cyan animate-pulse">LISTENING</span> : <span className="text-jarvis-textMuted">IDLE</span>}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 relative overflow-y-auto overflow-x-hidden">
        
        {/* Global Error Toast */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="absolute top-6 left-1/2 -translate-x-1/2 z-50 bg-jarvis-red/20 border border-jarvis-red text-jarvis-red px-6 py-3 rounded-lg flex items-center gap-3 shadow-lg shadow-jarvis-red/20"
            >
              <AlertCircle size={20} />
              <span className="text-sm tracking-wide">{errorMsg}</span>
            </motion.div>
          )}


        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 p-10 flex flex-col gap-8">
              <header className="flex justify-between items-center">
                <h2 className="text-2xl tracking-widest uppercase">System Dashboard</h2>
                <div className="flex items-center gap-2 text-jarvis-textMuted text-sm">
                  Status: {connected ? <span className="text-jarvis-cyan flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-jarvis-cyan animate-pulse"></span>LIVE</span> : <span className="text-jarvis-red">OFFLINE</span>}
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
                <h3 className="text-xl tracking-widest uppercase mb-8 flex items-center gap-3"><Activity className="text-jarvis-cyan" />Live Agent Telemetry</h3>
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
                      <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2"><Cpu size={18} />CPU UTILIZATION</div>
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                          <motion.circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-cyan" strokeDasharray={2 * Math.PI * 88} initial={{ strokeDashoffset: 2 * Math.PI * 88 }} animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - telemetry.cpu / 100) }} transition={{ type: "spring", bounce: 0, duration: 1 }} />
                        </svg>
                        <div className="text-4xl font-bold text-glow text-jarvis-cyan">{telemetry.cpu.toFixed(1)}%</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center space-y-6">
                      <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2"><MemoryStick size={18} />MEMORY USAGE</div>
                      <div className="relative w-48 h-48 flex items-center justify-center">
                        <svg className="absolute w-full h-full -rotate-90">
                          <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                          <motion.circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-purple" strokeDasharray={2 * Math.PI * 88} initial={{ strokeDashoffset: 2 * Math.PI * 88 }} animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - telemetry.ram / 100) }} transition={{ type: "spring", bounce: 0, duration: 1 }} />
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
            <motion.div key="agent" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0 flex flex-col items-center justify-between pt-16 pb-6 px-10">
              
              <div className="flex-1 flex flex-col items-center justify-center w-full max-w-3xl relative">
                <button 
                  onClick={testVoice}
                  className="absolute right-0 top-0 flex items-center gap-2 px-3 py-1.5 border border-jarvis-border rounded-full text-xs text-jarvis-textMuted hover:text-white hover:border-jarvis-cyan/50 transition-colors"
                >
                  <Volume2 size={14} /> Test Voice
                </button>
                <JarvisOrb state={orbState} />
              </div>

              <div className="w-full max-w-4xl bg-jarvis-panel border border-jarvis-border rounded-xl flex flex-col mt-8 shadow-2xl relative z-10">
                <div className="h-48 p-6 overflow-y-auto flex flex-col gap-3 font-sans">
                  {transcript.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`whitespace-pre-wrap px-4 py-2 rounded-lg max-w-[80%] ${msg.role === 'user' ? 'bg-jarvis-border text-white' : msg.role === 'system' ? 'text-jarvis-textMuted text-sm' : 'bg-jarvis-cyan/10 border border-jarvis-cyan/30 text-jarvis-cyan'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={(e) => handleCommandSubmit(e)} className="border-t border-jarvis-border p-4 flex items-center gap-4 bg-black/20 rounded-b-xl">
                  <button 
                    type="button"
                    onClick={toggleMic}
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors shrink-0 ${micEnabled ? 'bg-jarvis-red text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-jarvis-cyan text-black hover:bg-cyan-400'}`}
                    title={micEnabled ? "Disable Voice Engine" : "Enable Voice Engine"}
                  >
                    {micEnabled ? <Mic size={24} /> : <MicOff size={24} />}
                  </button>
                  
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-jarvis-textMuted" size={18} />
                    <input 
                      type="text" 
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={micEnabled ? 'Speak your command, then click the mic to stop recording...' : "Click the mic to record a voice command..."} 
                      className="w-full bg-jarvis-bg border border-jarvis-border rounded-full py-3 pl-12 pr-6 focus:outline-none focus:border-jarvis-cyan/50 text-white placeholder-jarvis-textMuted"
                    />
                  </div>
                  
                  <button type="submit" className="hidden">Submit</button>

                  <div className="flex items-center gap-3">
                    <select 
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="bg-jarvis-panel border border-jarvis-border text-jarvis-textMuted text-xs rounded-full px-3 py-2 focus:outline-none focus:border-jarvis-cyan transition-colors"
                    >
                      <option value="Auto">Auto (Smart Route)</option>
                      <option value="llama3.2:latest">Ollama: llama3.2</option>
                      <option value="qwen2.5-coder:3b">Ollama: qwen2.5-coder</option>
                      <option value="qwen2.5:7b">Ollama: qwen2.5:7b</option>
                      <option value="GPT-4o">Cloud: OpenRouter (Auto Free)</option>
                    </select>

                    <div className="flex items-center gap-2 px-4 py-2 border border-jarvis-border rounded-full text-xs text-jarvis-cyan tracking-widest bg-jarvis-cyan/5">
                      <TerminalSquare size={14} />
                      {activeModel}
                    </div>
                  </div>
                </form>
              </div>

            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="absolute inset-0">
              <SettingsView />
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
