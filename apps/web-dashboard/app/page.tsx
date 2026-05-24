"use client";

import { Shield, LayoutDashboard, Settings, Cpu, MemoryStick, Activity } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<{ cpu: number; ram: number } | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // In production, device_id and token come from auth context
    const deviceId = "local-dev-machine-001";
    const ws = new WebSocket(`ws://localhost:8001/ws/web/${deviceId}`);

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.event === "telemetry" && data.metrics) {
          setTelemetry({
            cpu: data.metrics.cpu,
            ram: data.metrics.ram,
          });
        }
      } catch (err) {
        console.error("Failed to parse telemetry:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

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
          <button className="flex items-center gap-3 px-3 py-2 bg-jarvis-cyan/10 text-jarvis-cyan border border-jarvis-cyan/30 rounded">
            <LayoutDashboard size={18} />
            <span>Overview</span>
          </button>
          <button className="flex items-center gap-3 px-3 py-2 text-jarvis-textMuted hover:text-jarvis-text hover:bg-jarvis-border/30 rounded transition-colors">
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10 flex flex-col gap-8 relative overflow-y-auto">
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
          {/* Linked Devices Card */}
          <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-cyan"></div>
            <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">ACTIVE DEVICES</h3>
            <div className="text-4xl font-bold">1</div>
            <p className="text-jarvis-cyan text-xs mt-2">local-dev-machine-001</p>
          </div>

          {/* SaaS Billing Card */}
          <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-purple"></div>
            <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">CURRENT PLAN</h3>
            <div className="text-2xl font-bold">PRO TIER</div>
            <p className="text-jarvis-purple text-xs mt-2">$29/mo • OpenAI Access</p>
          </div>

          {/* Tokens Used Card */}
          <div className="border border-jarvis-border bg-jarvis-panel p-6 rounded-lg relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-jarvis-blue"></div>
            <h3 className="text-jarvis-textMuted text-sm tracking-widest mb-4">TOKENS CONSUMED</h3>
            <div className="text-4xl font-bold">14,204</div>
            <p className="text-jarvis-blue text-xs mt-2">This billing cycle</p>
          </div>
        </div>

        {/* Telemetry Main Panel */}
        <div className="flex-1 border border-jarvis-border bg-jarvis-panel p-8 rounded-lg flex flex-col relative overflow-hidden">
          {/* Background Grid Pattern */}
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
              
              {/* CPU Metric */}
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2">
                  <Cpu size={18} />
                  CPU UTILIZATION
                </div>
                
                <div className="relative w-48 h-48 flex items-center justify-center">
                  {/* Outer Ring Background */}
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                    {/* Animated Value Ring */}
                    <motion.circle 
                      cx="96" cy="96" r="88" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="none" 
                      className="text-jarvis-cyan"
                      strokeDasharray={2 * Math.PI * 88}
                      initial={{ strokeDashoffset: 2 * Math.PI * 88 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - telemetry.cpu / 100) }}
                      transition={{ type: "spring", bounce: 0, duration: 1 }}
                    />
                  </svg>
                  <div className="text-4xl font-bold text-glow text-jarvis-cyan">{telemetry.cpu.toFixed(1)}%</div>
                </div>
              </div>

              {/* RAM Metric */}
              <div className="flex flex-col items-center justify-center space-y-6">
                <div className="text-jarvis-textMuted tracking-widest flex items-center gap-2">
                  <MemoryStick size={18} />
                  MEMORY USAGE
                </div>
                
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="absolute w-full h-full -rotate-90">
                    <circle cx="96" cy="96" r="88" stroke="currentColor" strokeWidth="8" fill="none" className="text-jarvis-border" />
                    <motion.circle 
                      cx="96" cy="96" r="88" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      fill="none" 
                      className="text-jarvis-purple"
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
      </main>
    </div>
  );
}
