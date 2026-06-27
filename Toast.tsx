import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

let addToastGlobal: ((message: string, type: ToastType) => void) | null = null;

export function showToast(message: string, type: ToastType = 'success') {
  if (addToastGlobal) addToastGlobal(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    addToastGlobal = (message, type) => {
      const id = Math.random().toString(36).slice(2);
      setToasts(t => [...t, { id, message, type }]);
      setTimeout(() => {
        setToasts(t => t.filter(item => item.id !== id));
      }, 3000);
    };
    return () => { addToastGlobal = null; };
  }, []);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />,
    info: <AlertCircle className="w-5 h-5 text-amber-400" />,
  };

  const colors = {
    success: 'border-emerald-500/30 bg-emerald-950/80',
    error: 'border-red-500/30 bg-red-950/80',
    info: 'border-amber-500/30 bg-amber-950/80',
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 60, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 60, scale: 0.9 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl ${colors[toast.type]}`}
          >
            {icons[toast.type]}
            <span className="text-sm text-white flex-1">{toast.message}</span>
            <button
              onClick={() => setToasts(t => t.filter(i => i.id !== toast.id))}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
