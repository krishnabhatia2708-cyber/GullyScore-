import { motion } from 'framer-motion';
import { Trophy, Activity, Users, BarChart3, ChevronRight, Star, Zap, Shield } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export function LandingPage() {
  const { navigate } = useApp();

  const features = [
    { icon: <Activity className="w-6 h-6 text-amber-500" />, title: 'Live Scoring', desc: 'Ball-by-ball scoring with instant updates' },
    { icon: <Users className="w-6 h-6 text-emerald-500" />, title: 'Team Management', desc: 'Build and manage your cricket teams' },
    { icon: <Trophy className="w-6 h-6 text-yellow-500" />, title: 'Tournaments', desc: 'Run complete league & knockout tournaments' },
    { icon: <BarChart3 className="w-6 h-6 text-blue-500" />, title: 'Player Stats', desc: 'Detailed career stats & rankings' },
  ];

  const stats = [
    { label: 'Matches Played', value: '10K+' },
    { label: 'Players Tracked', value: '50K+' },
    { label: 'Tournaments', value: '500+' },
    { label: 'Teams', value: '5K+' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-x-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <div className="text-2xl font-black" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          <span className="text-white">GULLY</span>
          <span className="text-amber-500">SCORE</span>
        </div>
        <button
          onClick={() => navigate('auth')}
          className="gs-btn-primary text-sm px-5 py-2.5"
        >
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-12 pb-20 max-w-6xl mx-auto text-center">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-6">
            <Zap className="w-3.5 h-3.5" />
            <span>Professional Cricket Scoring</span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-4 leading-none" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            <span className="text-white">YOUR CRICKET.</span>
            <br />
            <span className="text-gradient-gold">YOUR LEGACY.</span>
          </h1>

          <p className="text-gray-400 text-lg max-w-xl mx-auto mb-8">
            Score matches like the IPL. Track player stats. Run tournaments.
            GullyScore makes gully cricket feel like the big league.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('auth')}
              className="gs-btn-primary text-lg px-8 py-4 flex items-center gap-2 justify-center"
            >
              Start Scoring Free
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('leaderboard')}
              className="gs-btn-secondary text-lg px-8 py-4 flex items-center gap-2 justify-center"
            >
              <BarChart3 className="w-5 h-5" />
              View Rankings
            </button>
          </div>
        </motion.div>

        {/* Mock Scorecard */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="mt-16 max-w-sm mx-auto gs-card-premium p-5 text-left"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="gs-badge-live">LIVE</span>
            <span className="text-gray-500 text-xs">Over 12.3</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="font-bold text-lg" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Green Warriors</div>
              <div className="text-3xl font-black text-amber-500" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                124/4
              </div>
              <div className="text-gray-500 text-sm">Need 19 runs in 15 balls</div>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-sm">Royal Strikers</div>
              <div className="text-2xl font-bold text-gray-300" style={{ fontFamily: 'Rajdhani, sans-serif' }}>142/8</div>
            </div>
          </div>

          <div className="flex gap-2">
            {['1', '4', '0', 'W', '1', '6'].map((b, i) => (
              <div key={i} className={`gs-score-ball text-xs ${b === '4' ? 'gs-ball-four' : b === '6' ? 'gs-ball-six' : b === 'W' ? 'gs-ball-wicket' : b === '0' ? 'gs-ball-dot' : 'gs-ball-run'}`}>
                {b}
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i }}
              className="gs-card p-5 text-center"
            >
              <div className="text-3xl font-black text-amber-500 mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{s.value}</div>
              <div className="text-gray-400 text-sm">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <h2 className="text-4xl font-black text-center mb-10" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Everything You Need to <span className="text-amber-500">Score Big</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="gs-card-premium p-6 flex gap-4 items-start"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center flex-shrink-0">
                {f.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{f.title}</h3>
                <p className="text-gray-400 text-sm">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Key Feature: Match Flow */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <div className="gs-card p-8 text-center">
          <Shield className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-3xl font-black mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Smart Match Wizard
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            IPL-style setup wizard. Coin flip toss. Auto-track wickets. Auto strike rotation. Never miss a ball.
          </p>
          <div className="flex flex-wrap gap-3 justify-center text-sm">
            {['Select Teams', 'Set Overs', 'Flip Coin', 'Choose Bat/Bowl', 'Pick Opening Pair', 'Start Scoring'].map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center">{i + 1}</div>
                <span className="text-gray-300">{step}</span>
                {i < 5 && <ChevronRight className="w-3 h-3 text-gray-600" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-12 max-w-6xl mx-auto">
        <h2 className="text-3xl font-black text-center mb-8" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          What Players Say
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { name: 'Rohit S.', text: 'Finally an app that feels like CricHeroes for our local matches!', stars: 5 },
            { name: 'Arjun P.', text: 'The coin flip animation is epic! Our boys love the tournament feature.', stars: 5 },
            { name: 'Vikram M.', text: 'Orange Cap and Purple Cap tracking is exactly what we needed!', stars: 5 },
          ].map(t => (
            <div key={t.name} className="gs-card p-5">
              <div className="flex text-amber-400 mb-3">
                {Array(t.stars).fill(0).map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
              </div>
              <p className="text-gray-300 text-sm mb-3">"{t.text}"</p>
              <div className="text-gray-500 text-sm font-semibold">— {t.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 max-w-lg mx-auto text-center">
        <h2 className="text-4xl font-black mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          Ready to Score?
        </h2>
        <p className="text-gray-400 mb-8">Join thousands of cricket lovers tracking every ball.</p>
        <button
          onClick={() => navigate('auth')}
          className="gs-btn-primary text-xl px-10 py-5 w-full"
        >
          Get Started — It's Free
        </button>
      </section>

      <footer className="border-t border-gray-800 px-6 py-6 text-center text-gray-600 text-sm">
        <div className="font-black text-xl mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
          GULLY<span className="text-amber-500">SCORE</span>
        </div>
        &copy; 2026 GullyScore. Live the game. Share the glory.
      </footer>
    </div>
  );
}
