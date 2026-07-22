'use client';

import { motion } from 'framer-motion';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

interface JarvisOrbProps {
  state: OrbState;
}

export function JarvisOrb({ state }: JarvisOrbProps) {
  const colorMap = {
    idle: 'rgba(6, 182, 212, 0.5)',
    listening: 'rgba(6, 182, 212, 0.9)',
    thinking: 'rgba(168, 85, 247, 0.8)',
    speaking: 'rgba(59, 130, 246, 1)'
  };

  const glowMap = {
    idle: '0 0 60px rgba(6, 182, 212, 0.15), 0 0 120px rgba(6, 182, 212, 0.05)',
    listening: '0 0 80px rgba(6, 182, 212, 0.5), 0 0 160px rgba(6, 182, 212, 0.2)',
    thinking: '0 0 70px rgba(168, 85, 247, 0.4), 0 0 140px rgba(168, 85, 247, 0.15)',
    speaking: '0 0 100px rgba(59, 130, 246, 0.6), 0 0 200px rgba(59, 130, 246, 0.2)'
  };

  const labelMap = {
    idle: 'STANDBY',
    listening: 'LISTENING',
    thinking: 'PROCESSING',
    speaking: 'SPEAKING'
  };

  return (
    <div className="relative flex flex-col justify-center items-center w-72 h-72">
      {/* Ambient glow background */}
      <motion.div
        className="absolute w-96 h-96 rounded-full blur-[100px]"
        animate={{ 
          backgroundColor: colorMap[state],
          scale: state === 'speaking' ? [1, 1.3, 1] : state === 'listening' ? [1, 1.15, 1] : 1
        }}
        transition={state === 'speaking' || state === 'listening' ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : { duration: 1 }}
      />

      {/* Outermost pulse rings (only on active states) */}
      {(state === 'listening' || state === 'speaking') && (
        <>
          <motion.div
            className="absolute w-64 h-64 rounded-full border border-current pulse-ring"
            style={{ color: state === 'speaking' ? '#3b82f6' : '#06b6d4' }}
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute w-64 h-64 rounded-full border border-current pulse-ring"
            style={{ color: state === 'speaking' ? '#3b82f6' : '#06b6d4' }}
            initial={{ scale: 1, opacity: 0.3 }}
            animate={{ scale: 2.5, opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut', delay: 0.7 }}
          />
        </>
      )}

      {/* Outer rotating ring 1 */}
      <motion.div
        className="absolute w-56 h-56 rounded-full"
        style={{
          border: '2px solid transparent',
          borderTopColor: state === 'thinking' ? '#a855f7' : '#06b6d4',
          borderRightColor: state === 'thinking' ? 'rgba(168,85,247,0.3)' : 'rgba(6,182,212,0.3)',
          boxShadow: glowMap[state]
        }}
        animate={{
          rotate: 360,
          scale: state === 'speaking' ? [1, 1.08, 1] : state === 'listening' ? [1, 1.05, 1] : 1
        }}
        transition={{
          rotate: { duration: state === 'thinking' ? 1.5 : 12, repeat: Infinity, ease: 'linear' },
          scale: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' }
        }}
      />

      {/* Outer rotating ring 2 (counter-rotate) */}
      <motion.div
        className="absolute w-48 h-48 rounded-full"
        style={{
          border: '1.5px solid transparent',
          borderBottomColor: state === 'thinking' ? 'rgba(168,85,247,0.6)' : 'rgba(6,182,212,0.4)',
          borderLeftColor: state === 'thinking' ? 'rgba(168,85,247,0.2)' : 'rgba(6,182,212,0.15)',
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: state === 'thinking' ? 2 : 18, repeat: Infinity, ease: 'linear' }}
      />

      {/* Middle dashed ring */}
      <motion.div
        className="absolute w-40 h-40 rounded-full"
        style={{
          border: '1px dashed rgba(6,182,212,0.2)',
        }}
        animate={{ rotate: state === 'thinking' ? -360 : 360 }}
        transition={{ duration: state === 'thinking' ? 3 : 30, repeat: Infinity, ease: 'linear' }}
      />

      {/* Hex accent markers */}
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <motion.div
          key={deg}
          className="absolute w-2 h-2 rounded-full"
          style={{
            backgroundColor: state === 'thinking' ? '#a855f7' : '#06b6d4',
            left: `calc(50% + ${Math.cos(deg * Math.PI / 180) * 96}px - 4px)`,
            top: `calc(50% + ${Math.sin(deg * Math.PI / 180) * 96}px - 4px)`,
            boxShadow: `0 0 8px ${state === 'thinking' ? '#a855f7' : '#06b6d4'}`
          }}
          animate={{ 
            opacity: state === 'idle' ? [0.2, 0.5, 0.2] : [0.4, 1, 0.4],
            scale: state === 'speaking' ? [0.8, 1.5, 0.8] : 1,
          }}
          transition={{ duration: 2, repeat: Infinity, delay: deg / 360 }}
        />
      ))}

      {/* Inner Core — glass effect */}
      <motion.div
        className="absolute w-28 h-28 rounded-full overflow-hidden flex items-center justify-center"
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.15), transparent 70%)`,
          backdropFilter: 'blur(12px)',
          boxShadow: `inset 0 0 30px ${colorMap[state]}, ${glowMap[state]}`
        }}
        animate={{
          scale: state === 'speaking' ? [1, 1.15, 0.95, 1.1, 1] : 
                 state === 'listening' ? [1, 0.92, 1] : 
                 state === 'thinking' ? [1, 0.85, 1] : 
                 [1, 1.03, 1],
        }}
        transition={{
          duration: state === 'speaking' ? 0.4 : state === 'thinking' ? 1.5 : 2.5,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {/* Inner gradient fill */}
        <motion.div 
          className="w-full h-full rounded-full"
          style={{
            background: `radial-gradient(circle at 40% 40%, ${colorMap[state]}, transparent 70%)`
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Center dot */}
      <motion.div
        className="absolute w-4 h-4 rounded-full"
        style={{
          backgroundColor: 'white',
          boxShadow: `0 0 15px white, 0 0 30px ${colorMap[state]}`
        }}
        animate={{
          scale: state === 'speaking' ? [0.8, 1.3, 0.8] : [0.9, 1.1, 0.9],
          opacity: state === 'idle' ? 0.7 : 1,
        }}
        transition={{ duration: state === 'speaking' ? 0.3 : 2, repeat: Infinity }}
      />

      {/* State label */}
      <motion.div
        className="absolute -bottom-8 text-xs tracking-[0.3em] font-medium"
        style={{ color: state === 'thinking' ? '#a855f7' : state === 'speaking' ? '#3b82f6' : '#06b6d4' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {labelMap[state]}
      </motion.div>
    </div>
  );
}
