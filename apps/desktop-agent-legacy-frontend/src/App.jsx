import { useState } from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { MainWorkspace } from './components/panels/MainWorkspace';
import { useJarvisSystem } from './hooks/useJarvisSystem';
import './index.css';

function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  
  const { 
    systemState, 
    activeTask, 
    messages, 
    logs, 
    agents, 
    sysMetrics 
  } = useJarvisSystem();

  return (
    <AppLayout 
      currentTab={currentTab} 
      setCurrentTab={setCurrentTab}
      sysMetrics={sysMetrics}
      systemState={systemState}
      activeTask={activeTask}
      logs={logs}
    >
      <MainWorkspace 
        currentTab={currentTab}
        systemState={systemState}
        activeTask={activeTask}
        messages={messages}
        agents={agents}
      />
    </AppLayout>
  );
}

export default App;
