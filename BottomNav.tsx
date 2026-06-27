import { Home, Activity, Shield, BarChart3, User } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { Page } from '../../types';
import { motion } from 'framer-motion';

const navItems: { icon: React.ReactNode; label: string; page: Page }[] = [
  { icon: <Home className="w-5 h-5" />, label: 'Home', page: 'dashboard' },
  { icon: <Activity className="w-5 h-5" />, label: 'Matches', page: 'match-wizard' },
  { icon: <Shield className="w-5 h-5" />, label: 'Teams', page: 'teams' },
  { icon: <BarChart3 className="w-5 h-5" />, label: 'Rankings', page: 'leaderboard' },
  { icon: <User className="w-5 h-5" />, label: 'Profile', page: 'player-profile' },
];

export function BottomNav() {
  const { currentPage, navigate } = useApp();

  const isActive = (page: Page) => {
    if (page === 'dashboard' && currentPage === 'dashboard') return true;
    if (page === 'match-wizard' && (currentPage === 'match-wizard' || currentPage === 'live-scoring' || currentPage === 'scorecard')) return true;
    if (page === 'teams' && (currentPage === 'teams' || currentPage === 'team-detail')) return true;
    if (page === 'leaderboard' && currentPage === 'leaderboard') return true;
    if (page === 'player-profile' && currentPage === 'player-profile') return true;
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-gray-900/95 backdrop-blur-md border-t border-gray-800 safe-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map(item => {
          const active = isActive(item.page);
          return (
            <button
              key={item.page}
              onClick={() => navigate(item.page)}
              className="flex flex-col items-center gap-1 px-4 py-1 relative"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute inset-0 bg-amber-500/10 rounded-xl"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className={active ? 'text-amber-500' : 'text-gray-500'}>
                {item.icon}
              </span>
              <span className={`text-xs font-medium ${active ? 'text-amber-500' : 'text-gray-500'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
