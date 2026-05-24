import { motion } from 'framer-motion';

export function Waveform({ color = '#06b6d4' }) {
  const bars = Array.from({ length: 5 });

  return (
    <div className="flex items-center gap-1 h-full">
      {bars.map((_, i) => (
        <motion.div
          key={i}
          className="w-1 rounded-full"
          style={{ backgroundColor: color }}
          animate={{ height: ['20%', '100%', '20%'] }}
          transition={{
            duration: 0.8,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
}
