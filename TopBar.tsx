import { ArrowLeft, Bell } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Page } from '../../types';

interface Props {
  title?: string;
  showBack?: boolean;
  backTo?: Page;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

export function TopBar({ title, showBack = false, backTo, rightElement, transparent = false }: Props) {
  const { navigate, goBack, canGoBack } = useApp();

  const handleBack = () => {
    if (backTo) {
      navigate(backTo);
    } else if (canGoBack) {
      goBack();
    } else {
      window.history.back();
    }
  };

  return (
    <header className={`sticky top-0 z-20 ${transparent ? 'bg-transparent' : 'bg-gray-950/90 backdrop-blur-md border-b border-gray-800/50'}`}>
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={handleBack}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800/80 hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-300" />
            </button>
          )}
          {title ? (
            <h1 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {title}
            </h1>
          ) : (
            <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              <span className="text-white">GULLY</span>
              <span className="text-amber-500">SCORE</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {rightElement}
          {!showBack && (
            <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-800/80 hover:bg-gray-700 transition-colors relative">
              <Bell className="w-5 h-5 text-gray-300" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-500 rounded-full" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
