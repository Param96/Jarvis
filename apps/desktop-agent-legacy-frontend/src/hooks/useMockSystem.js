import { useState, useEffect } from 'react';

export function useMockSystem() {
  const [systemState, setSystemState] = useState('IDLE'); // IDLE, LISTENING, THINKING, SPEAKING
  const [activeTask, setActiveTask] = useState('Standby');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'system', text: 'Jarvis OS v4.2.0 initialized.', timestamp: new Date().toISOString() }
  ]);
  const [logs, setLogs] = useState([]);
  
  const [agents, setAgents] = useState([
    { id: 'coding', name: 'Coding Agent', status: 'idle', model: 'gpt-4-turbo', progress: 0 },
    { id: 'vision', name: 'Vision Agent', status: 'idle', model: 'gpt-4-vision', progress: 0 },
    { id: 'automation', name: 'Automation Agent', status: 'idle', model: 'claude-3-opus', progress: 0 },
    { id: 'research', name: 'Research Agent', status: 'idle', model: 'gemini-pro', progress: 0 },
  ]);

  const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 45, latency: 120 });

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev.slice(-49), { id: Date.now() + Math.random(), msg, type, time: new Date().toISOString() }]);
  };

  useEffect(() => {
    let isMounted = true;
    
    const runSimulation = async () => {
      if (!isMounted) return;
      await new Promise(r => setTimeout(r, 4000));
      
      // User speaks
      if (!isMounted) return;
      setSystemState('LISTENING');
      addLog('Microphone activated. Audio stream started.', 'info');
      setActiveTask('Listening to user...');
      await new Promise(r => setTimeout(r, 2000));
      
      const userMsg = 'Jarvis, analyze the current project structure and optimize the React components.';
      if (!isMounted) return;
      setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: userMsg, timestamp: new Date().toISOString() }]);
      
      // Thinking
      setSystemState('THINKING');
      setActiveTask('Analyzing request');
      addLog('Audio stream ended. Transcribing...', 'info');
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      addLog('Transcription complete. Routing to Coding Agent...', 'routing');
      
      // Agent Execution
      setAgents(prev => prev.map(a => a.id === 'coding' ? { ...a, status: 'running', progress: 10 } : a));
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      setAgents(prev => prev.map(a => a.id === 'coding' ? { ...a, progress: 40 } : a));
      addLog('Coding Agent: Reading src/ directory...', 'tool');
      await new Promise(r => setTimeout(r, 1500));
      if (!isMounted) return;
      setAgents(prev => prev.map(a => a.id === 'coding' ? { ...a, progress: 80 } : a));
      addLog('Coding Agent: Generating optimized component trees...', 'tool');
      await new Promise(r => setTimeout(r, 1000));
      if (!isMounted) return;
      setAgents(prev => prev.map(a => a.id === 'coding' ? { ...a, status: 'idle', progress: 0 } : a));
      addLog('Coding Agent task complete.', 'success');
      
      // Speaking
      setSystemState('SPEAKING');
      setActiveTask('Responding');
      
      const replyText = 'I have analyzed the project structure. I recommend breaking down the large App component into smaller, modular layout components. Shall I proceed with the refactor?';
      
      let currentReply = '';
      const replyId = Date.now();
      setMessages(prev => [...prev, { id: replyId, sender: 'jarvis', text: '', timestamp: new Date().toISOString(), streaming: true }]);
      
      for (let i = 0; i < replyText.length; i++) {
        if (!isMounted) return;
        currentReply += replyText[i];
        setMessages(prev => prev.map(m => m.id === replyId ? { ...m, text: currentReply } : m));
        await new Promise(r => setTimeout(r, 30));
      }
      
      if (!isMounted) return;
      setMessages(prev => prev.map(m => m.id === replyId ? { ...m, streaming: false } : m));
      
      setSystemState('IDLE');
      setActiveTask('Standby');
      addLog('Response completed. Waiting for input.', 'info');
    };

    const interval = setInterval(runSimulation, 25000);
    runSimulation();

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const metricInterval = setInterval(() => {
      setSysMetrics(prev => ({
        cpu: Math.max(5, Math.min(100, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() * 2 - 1))),
        latency: Math.max(20, Math.min(300, prev.latency + (Math.random() * 40 - 20)))
      }));
    }, 1000);
    return () => clearInterval(metricInterval);
  }, []);

  return { systemState, activeTask, messages, logs, agents, sysMetrics };
}
