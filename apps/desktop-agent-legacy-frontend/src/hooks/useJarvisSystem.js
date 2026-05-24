import { useEffect, useRef, useState } from 'react';

const WS_URL = import.meta.env.VITE_JARVIS_WS_URL || 'ws://localhost:8000/ws';

const initialAgents = [
  { id: 'conversation', name: 'Conversation Agent', status: 'idle', model: 'router', progress: 0 },
  { id: 'voice', name: 'Voice Agent', status: 'idle', model: 'openwakeword + tts', progress: 0 },
  { id: 'memory', name: 'Memory Agent', status: 'idle', model: 'sqlite', progress: 0 },
  { id: 'automation', name: 'Automation Agent', status: 'idle', model: 'tools', progress: 0 },
];

function mapBackendState(state) {
  if (state === 'PROCESSING') return 'THINKING';
  return state || 'IDLE';
}

export function useJarvisSystem() {
  const [systemState, setSystemState] = useState('CONNECTING');
  const [activeTask, setActiveTask] = useState('Connecting to Jarvis...');
  const [messages, setMessages] = useState([
    {
      id: 'system-start',
      sender: 'system',
      text: 'Connecting to Jarvis backend...',
      timestamp: new Date().toISOString(),
    },
  ]);
  const [logs, setLogs] = useState([]);
  const [agents, setAgents] = useState(initialAgents);
  const [sysMetrics, setSysMetrics] = useState({ cpu: 12, ram: 45, latency: 0 });
  const streamingReplyId = useRef(null);
  const connectionStartedAt = useRef(Date.now());

  const addLog = (msg, type = 'info') => {
    setLogs((prev) => [
      ...prev.slice(-49),
      { id: Date.now() + Math.random(), msg, type, time: new Date().toISOString() },
    ]);
  };

  useEffect(() => {
    let socket;
    let reconnectTimer;
    let closedByHook = false;

    const handleBackendMessage = (message) => {
      const type = message.type;
      const payload = message.payload || {};

      if (type === 'system.connected') {
        return;
      }

      if (type === 'state.changed') {
        const nextState = mapBackendState(payload.state);
        setSystemState(nextState);
        setActiveTask(payload.task || (nextState === 'IDLE' ? "Waiting for 'Hey Jarvis'" : nextState));
        setAgents((prev) =>
          prev.map((agent) => {
            if (agent.id === 'voice' && ['LISTENING', 'SPEAKING'].includes(nextState)) {
              return { ...agent, status: 'running', progress: 65 };
            }
            if (agent.id === 'conversation' && nextState === 'THINKING') {
              return { ...agent, status: 'running', progress: 70 };
            }
            return { ...agent, status: 'idle', progress: 0 };
          }),
        );
        return;
      }

      if (type === 'audio.wake_word_detected') {
        addLog(`Wake word detected: ${payload.name}`, 'success');
        return;
      }

      if (type === 'conversation.user_transcript') {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'user',
            text: payload.text,
            timestamp: new Date().toISOString(),
          },
        ]);
        addLog('Speech transcribed.', 'info');
        return;
      }

      if (type === 'model.token') {
        if (!streamingReplyId.current) {
          streamingReplyId.current = Date.now();
          setMessages((prev) => [
            ...prev,
            {
              id: streamingReplyId.current,
              sender: 'jarvis',
              text: '',
              timestamp: new Date().toISOString(),
              streaming: true,
            },
          ]);
        }
        setMessages((prev) =>
          prev.map((item) =>
            item.id === streamingReplyId.current
              ? { ...item, text: `${item.text}${payload.token}` }
              : item,
          ),
        );
        return;
      }

      if (type === 'conversation.assistant_response') {
        const replyText = payload.text || '';
        setMessages((prev) => {
          if (streamingReplyId.current) {
            return prev.map((item) =>
              item.id === streamingReplyId.current
                ? { ...item, text: item.text || replyText, streaming: false }
                : item,
            );
          }
          return [
            ...prev,
            {
              id: Date.now(),
              sender: 'jarvis',
              text: replyText,
              timestamp: new Date().toISOString(),
            },
          ];
        });
        streamingReplyId.current = null;
        addLog(`Response completed with ${payload.model}.`, 'success');
        return;
      }

      if (type === 'system.error') {
        setSystemState('ERROR');
        setActiveTask(payload.error || 'Backend error');
        addLog(payload.error || 'Backend error.', 'error');
      }
    };

    const connect = () => {
      connectionStartedAt.current = Date.now();
      socket = new WebSocket(WS_URL);

      socket.onopen = () => {
        setSystemState('IDLE');
        setActiveTask("Waiting for 'Hey Jarvis'");
        addLog('Connected to Jarvis backend.', 'success');
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            sender: 'system',
            text: "Jarvis is online. Say 'Hey Jarvis' to wake him up.",
            timestamp: new Date().toISOString(),
          },
        ]);
      };

      socket.onmessage = (event) => {
        handleBackendMessage(JSON.parse(event.data));
      };

      socket.onclose = () => {
        if (closedByHook) return;
        setSystemState('OFFLINE');
        setActiveTask('Backend disconnected');
        addLog('Backend disconnected. Retrying...', 'error');
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      socket.onerror = () => {
        addLog('WebSocket connection error.', 'error');
      };
    };

    connect();

    return () => {
      closedByHook = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, []);

  useEffect(() => {
    const metricInterval = window.setInterval(() => {
      setSysMetrics((prev) => ({
        cpu: Math.max(5, Math.min(100, prev.cpu + (Math.random() * 10 - 5))),
        ram: Math.max(20, Math.min(90, prev.ram + (Math.random() * 2 - 1))),
        latency: Math.max(0, Date.now() - connectionStartedAt.current),
      }));
    }, 1000);
    return () => window.clearInterval(metricInterval);
  }, []);

  return { systemState, activeTask, messages, logs, agents, sysMetrics };
}
