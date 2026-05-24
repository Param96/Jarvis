import { motion } from 'framer-motion';
import { Mic, Activity, Cpu, MessageSquare } from 'lucide-react';

export function JarvisOrb({ state }) {
  const getCoreColor = () => {
    switch (state) {
      case 'IDLE': return '#06b6d4'; // Cyan
      case 'LISTENING': return '#ef4444'; // Red
      case 'THINKING': return '#a855f7'; // Purple
      case 'SPEAKING': return '#3b82f6'; // Blue
      default: return '#06b6d4';
    }
  };

  const coreColor = getCoreColor();

  const getIcon = () => {
    switch (state) {
      case 'IDLE': return <Cpu size={40} color={coreColor} strokeWidth={1.5} />;
      case 'LISTENING': return <Mic size={40} color={coreColor} strokeWidth={1.5} />;
      case 'THINKING': return <Activity size={40} color={coreColor} strokeWidth={1.5} />;
      case 'SPEAKING': return <MessageSquare size={40} color={coreColor} strokeWidth={1.5} />;
      default: return <Cpu size={40} color={coreColor} strokeWidth={1.5} />;
    }
  };

  return (
    <div className="relative w-48 h-48 flex justify-center items-center shrink-0 my-8">
      {/* Outer Tech Ring */}
      <motion.div
        className="absolute rounded-full border-2 border-transparent"
        style={{ width: '100%', height: '100%', borderTopColor: coreColor, borderBottomColor: coreColor, opacity: 0.3 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Middle Dashed Ring */}
      <motion.div
        className="absolute rounded-full border-transparent"
        style={{ width: '85%', height: '85%', borderRightColor: coreColor, borderLeftColor: coreColor, borderStyle: 'dashed', borderWidth: '3px', opacity: 0.5 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      />
      
      {/* Inner Solid Ring with Glow */}
      <motion.div
        className="absolute rounded-full"
        style={{ width: '70%', height: '70%', border: `2px solid ${coreColor}`, opacity: 0.8 }}
        animate={{ 
          scale: state === 'LISTENING' || state === 'SPEAKING' ? [1, 1.05, 1] : 1, 
          boxShadow: [
            `0 0 15px ${coreColor}40`, 
            `0 0 40px ${coreColor}80`, 
            `0 0 15px ${coreColor}40`
          ] 
        }}
        transition={{ duration: state === 'LISTENING' ? 0.8 : 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      
      {/* Center Icon */}
      <motion.div
        className="absolute flex items-center justify-center z-10"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {getIcon()}
      </motion.div>
    </div>
  );
}
