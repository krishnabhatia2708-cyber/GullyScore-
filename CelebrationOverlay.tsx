import { motion, AnimatePresence } from 'framer-motion';
import { Confetti } from './Confetti';

type CelebrationType = 'four' | 'six' | 'wicket' | 'win' | 'potm' | null;

interface Props {
  type: CelebrationType;
  playerName?: string;
  teamName?: string;
  onDismiss: () => void;
}

const configs = {
  four: {
    emoji: '🏏',
    title: 'FOUR!',
    subtitle: 'Beautiful shot!',
    bg: 'from-blue-900/95 to-blue-950/95',
    accent: 'text-blue-400',
    border: 'border-blue-500/50',
    confetti: false,
  },
  six: {
    emoji: '🚀',
    title: 'SIX!',
    subtitle: 'Out of the park!',
    bg: 'from-purple-900/95 to-purple-950/95',
    accent: 'text-purple-400',
    border: 'border-purple-500/50',
    confetti: true,
  },
  wicket: {
    emoji: '💥',
    title: 'WICKET!',
    subtitle: 'What a delivery!',
    bg: 'from-red-900/95 to-red-950/95',
    accent: 'text-red-400',
    border: 'border-red-500/50',
    confetti: false,
  },
  win: {
    emoji: '🏆',
    title: 'MATCH WON!',
    subtitle: 'Champions!',
    bg: 'from-amber-900/95 to-amber-950/95',
    accent: 'text-amber-400',
    border: 'border-amber-500/50',
    confetti: true,
  },
  potm: {
    emoji: '⭐',
    title: 'PLAYER OF THE MATCH',
    subtitle: 'Outstanding performance!',
    bg: 'from-yellow-900/95 to-yellow-950/95',
    accent: 'text-yellow-400',
    border: 'border-yellow-500/50',
    confetti: true,
  },
};

export function CelebrationOverlay({ type, playerName, teamName, onDismiss }: Props) {
  if (!type) return null;
  const config = configs[type];

  return (
    <>
      <Confetti active={config.confetti} duration={2500} />
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={onDismiss}
        >
          <motion.div
            initial={{ scale: 0.5, y: 60 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={`bg-gradient-to-br ${config.bg} border ${config.border} rounded-3xl p-10 text-center max-w-sm w-full shadow-2xl`}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1] }}
              transition={{ duration: 0.6, times: [0, 0.6, 1] }}
              className="text-8xl mb-4"
            >
              {config.emoji}
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className={`text-5xl font-black ${config.accent} mb-1`}
              style={{ fontFamily: 'Rajdhani, sans-serif' }}
            >
              {config.title}
            </motion.h2>

            {(playerName || teamName) && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="text-2xl font-bold text-white mt-2"
                style={{ fontFamily: 'Rajdhani, sans-serif' }}
              >
                {playerName || teamName}
              </motion.p>
            )}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 mt-2"
            >
              {config.subtitle}
            </motion.p>

            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={onDismiss}
              className="mt-6 gs-btn-secondary text-sm w-full"
            >
              Continue
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>
  );
}
