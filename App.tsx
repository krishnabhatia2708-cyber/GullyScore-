import { AnimatePresence, motion } from 'framer-motion';
import { useApp, AppProvider } from './contexts/AppContext';
import { useAuth, AuthProvider } from './contexts/AuthContext';
import { ToastContainer } from './components/ui/Toast';
import { SplashScreen } from './components/ui/SplashScreen';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotFoundPage } from './components/NotFoundPage';

// Pages
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { TeamsPage } from './pages/TeamsPage';
import { MatchWizardPage } from './pages/MatchWizard';
import { LiveScoringPage } from './pages/LiveScoringPage';
import { ScorecardPage } from './pages/ScorecardPage';
import { MatchSummaryPage } from './pages/MatchSummaryPage';
import { PlayerProfilePage } from './pages/PlayerProfilePage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { TournamentsPage, TournamentDetailPage } from './pages/TournamentsPage';
import { AdminPage } from './pages/AdminPage';

const PUBLIC_PAGES = ['landing', 'auth', 'leaderboard'];

const pageVariants = { initial: { opacity: 0 }, enter: { opacity: 1 }, exit: { opacity: 0 } };

const PAGE_COMPONENTS: Record<string, React.ComponentType> = {
  'landing': LandingPage,
  'auth': AuthPage,
  'dashboard': DashboardPage,
  'teams': TeamsPage,
  'match-wizard': MatchWizardPage,
  'live-scoring': LiveScoringPage,
  'scorecard': ScorecardPage,
  'match-summary': MatchSummaryPage,
  'player-profile': PlayerProfilePage,
  'leaderboard': LeaderboardPage,
  'tournaments': TournamentsPage,
  'tournament-detail': TournamentDetailPage,
  'admin': AdminPage,
};

function PageRouter() {
  const { currentPage } = useApp();
  const { loading, user, profile } = useAuth();

  if (loading) {
    return <SplashScreen />;
  }

  const isPublic = PUBLIC_PAGES.includes(currentPage);

  // Determine which page to show
  let PageContent: React.ComponentType;

  if (!user && !isPublic) {
    PageContent = AuthPage;
  } else if (user && (currentPage === 'landing' || currentPage === 'auth')) {
    PageContent = DashboardPage;
  } else if (currentPage === 'admin' && (!user || !profile?.is_admin)) {
    PageContent = DashboardPage;
  } else {
    PageContent = PAGE_COMPONENTS[currentPage] || NotFoundPage;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentPage}
        initial="initial"
        animate="enter"
        exit="exit"
        variants={pageVariants}
        transition={{ duration: 0.15 }}
        className="min-h-screen"
      >
        <PageContent />
      </motion.div>
    </AnimatePresence>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <div className="bg-gray-950 min-h-screen text-white">
            <PageRouter />
            <ToastContainer />
          </div>
        </AppProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
