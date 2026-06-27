import { motion } from 'framer-motion';
import { Home } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export function NotFoundPage() {
  const { navigate } = useApp();
  const { user } = useAuth();

  const handleGoHome = () => {
    navigate(user ? 'dashboard' : 'landing');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-8xl mb-6">🏏</div>
        <h1 className="text-6xl font-black text-gray-700 mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          404
        </h1>
        <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Page Not Found
        </h2>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={handleGoHome}
            className="gs-btn-primary px-8 py-3 flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </motion.div>
    </div>
  );
}
