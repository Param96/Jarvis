import { motion } from 'framer-motion';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface JarvisOrbProps {
  state: OrbState;
}

export function JarvisOrb({ state }: JarvisOrbProps) {
  // Define animation variants based on state
  const outerVariants = {
    idle: {
      scale: [1, 1.05, 1],
      rotate: 0,
      opacity: 0.6,
      transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
    },
    listening: {
      scale: [1, 1.15, 1.05, 1.2, 1],
      rotate: 0,
      opacity: 0.9,
      transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" }
    },
    thinking: {
      scale: 1.1,
      rotate: 360,
      opacity: 0.8,
      transition: { duration: 3, repeat: Infinity, ease: "linear" }
    },
    speaking: {
      scale: [1.1, 1.25, 1.15, 1.3, 1.1],
      rotate: 0,
      opacity: 1,
      transition: { duration: 0.5, repeat: Infinity, ease: "backInOut" }
    }
  };

  const innerVariants = {
    idle: { scale: 1, opacity: 0.8, transition: { duration: 2 } },
    listening: { scale: [1, 0.8, 1], opacity: 1, transition: { duration: 0.8, repeat: Infinity } },
    thinking: { scale: [1, 0.5, 1], opacity: 0.6, transition: { duration: 1.5, repeat: Infinity } },
    speaking: { scale: [1, 1.4, 0.9, 1.3, 1], opacity: 1, transition: { duration: 0.3, repeat: Infinity } }
  };

  const colorMap = {
    idle: 'rgba(6, 182, 212, 0.5)',      // Cyan muted
    listening: 'rgba(6, 182, 212, 0.9)', // Cyan bright
    thinking: 'rgba(168, 85, 247, 0.8)', // Purple
    speaking: 'rgba(59, 130, 246, 1)'    // Blue intense
  };

  const glowMap = {
    idle: '0 0 40px rgba(6, 182, 212, 0.2)',
    listening: '0 0 60px rgba(6, 182, 212, 0.6)',
    thinking: '0 0 50px rgba(168, 85, 247, 0.5)',
    speaking: '0 0 80px rgba(59, 130, 246, 0.8)'
  };

  return (
    <div className="relative flex justify-center items-center w-64 h-64">
      {/* Background glow that matches the state */}
      <motion.div
        className="absolute w-full h-full rounded-full blur-3xl"
        animate={{ backgroundColor: colorMap[state] }}
        transition={{ duration: 0.5 }}
      />

      {/* Outer Ring */}
      <motion.div
        className="absolute w-48 h-48 rounded-full border-4 border-transparent"
        style={{
          borderTopColor: 'currentColor',
          borderRightColor: 'currentColor',
          color: state === 'thinking' ? '#a855f7' : '#06b6d4',
          boxShadow: glowMap[state]
        }}
        variants={outerVariants}
        animate={state}
        initial="idle"
      />

      {/* Middle dashed ring */}
      <motion.div
        className="absolute w-40 h-40 rounded-full border-2 border-dashed border-jarvis-cyan/40"
        animate={{ rotate: state === 'thinking' ? -360 : 360 }}
        transition={{ duration: state === 'thinking' ? 2 : 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Inner Core */}
      <motion.div
        className="absolute w-24 h-24 rounded-full bg-gradient-to-br from-white/80 to-white/20 backdrop-blur-md flex items-center justify-center overflow-hidden"
        style={{
          boxShadow: `inset 0 0 20px ${colorMap[state]}, ${glowMap[state]}`
        }}
        variants={innerVariants}
        animate={state}
        initial="idle"
      >
        <motion.div 
          className="w-full h-full bg-current mix-blend-overlay"
          animate={{ backgroundColor: colorMap[state] }}
          transition={{ duration: 0.5 }}
        />
      </motion.div>
    </div>
  );
}
