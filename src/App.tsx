/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  Trophy, 
  Calendar, 
  History as HistoryIcon, 
  User as UserIcon, 
  Plus, 
  LogOut, 
  TrendingUp,
  LayoutDashboard,
  Search,
  Filter,
  X,
  AlertCircle,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MatchEntry, PlayerStats, UserProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/errorHandling';
import { 
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth
} from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

// --- Components ---

function MetricCard({ title, value, icon: Icon, colorClass = "text-[#E1E4E8]" }: { title: string, value: string | number, icon: any, colorClass?: string }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-xl hover:border-[#484f58] transition-colors group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-[#0D1117] rounded-lg group-hover:bg-[#1c2128] transition-colors">
          <Icon className="w-5 h-5 text-[#8B949E]" />
        </div>
      </div>
      <div>
        <p className="text-[#8B949E] text-[10px] font-mono uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-bold tracking-tight ${colorClass}`}>{value}</p>
      </div>
    </div>
  );
}

function MatchCard({ match, onDelete, onEdit }: { match: MatchEntry, onDelete: (id: string) => void, onEdit: (match: MatchEntry) => void }) {
  const result = match.scoreFor > match.scoreAgainst ? 'W' : match.scoreFor < match.scoreAgainst ? 'L' : 'D';
  const resultColor = result === 'W' ? 'text-[#238636]' : result === 'L' ? 'text-[#f85149]' : 'text-[#d29922]';
  const resultBg = result === 'W' ? 'bg-[#238636]/10' : result === 'L' ? 'bg-[#f85149]/10' : 'bg-[#d29922]/10';

  const date = match.date instanceof Timestamp ? match.date.toDate() : new Date();

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="group flex flex-col sm:grid sm:grid-cols-[1fr_auto] gap-4 p-4 border-b border-[#30363D] hover:bg-[#0D1117] transition-colors"
    >
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="text-[10px] sm:text-xs font-mono text-[#8B949E] uppercase whitespace-nowrap">{format(date, 'MMM dd, yyyy')}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${result === 'W' ? 'border-[#238636]/30' : result === 'L' ? 'border-[#f85149]/30' : 'border-[#d29922]/30'} ${resultBg} ${resultColor} shrink-0`}>{result}</span>
          <span className="text-sm font-semibold text-[#E1E4E8] truncate">vs {match.opponent || "Casual Match"}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[9px] text-[#8B949E] uppercase tracking-widest font-mono">Rating</span>
            <div className="bg-[#238636]/10 text-[#238636] px-2 py-0.5 rounded text-[10px] font-bold border border-[#238636]/20">
              {match.rating.toFixed(1)}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#8B949E] uppercase tracking-widest font-mono">Goles</span>
            <span className="text-xs font-bold text-[#E1E4E8]">{match.goals}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-[#8B949E] uppercase tracking-widest font-mono">Asist.</span>
            <span className="text-xs font-bold text-[#E1E4E8]">{match.assists}</span>
          </div>
        </div>
        {match.notes && <p className="text-xs text-[#8B949E] italic mt-1 line-clamp-1 border-l-2 border-[#30363D] pl-2">"{match.notes}"</p>}
      </div>
      <div className="flex items-center gap-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity bg-[#161B22] sm:bg-transparent p-1 rounded-lg self-end sm:self-center">
        <button 
          onClick={() => onEdit(match)}
          className="p-2 text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#58A6FF]/10 rounded-lg transition-colors"
          title="Edit match"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(match.id)}
          className="p-2 text-[#8B949E] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded-lg transition-colors"
          title="Delete match"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diary' | 'stats' | 'calendar' | 'profile'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    minGoals: 0,
    minAssists: 0,
    minRating: 0,
    injuryOnly: false,
    hasYellow: false,
    hasRed: false,
    startDate: '',
    endDate: '',
  });

  const INITIAL_FORM_STATE = {
    date: format(new Date(), 'yyyy-MM-dd'),
    opponent: '',
    goals: 0,
    assists: 0,
    scoreFor: 0,
    scoreAgainst: 0,
    rating: 7.0,
    yellowCards: 0,
    redCards: 0,
    injury: false,
    notes: ''
  };

  // Form State
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  useEffect(() => {
    let unsubscribeMatches: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (unsubscribeMatches) {
        unsubscribeMatches();
        unsubscribeMatches = null;
      }

      if (u) {
        try {
          const userRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Player',
              email: u.email || '',
              photoURL: u.photoURL || '',
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile as any);
          } else {
            setProfile({ uid: u.uid, ...userDoc.data() } as UserProfile);
          }
        } catch (err) {
          console.error("User initialization error:", err);
          // Don't throw here to avoid hanging the app
        }

        const matchesQuery = query(
          collection(db, 'users', u.uid, 'matches'),
          orderBy('date', 'desc')
        );

        unsubscribeMatches = onSnapshot(matchesQuery, (snapshot) => {
          const m = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry));
          setMatches(m);
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/matches`);
          setLoading(false);
        });
      } else {
        setMatches([]);
        setLoading(false);
      }
    });

    // Fallback timer to ensure loading screen doesn't hang forever
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      unsubscribeAuth();
      if (unsubscribeMatches) unsubscribeMatches();
      clearTimeout(timer);
    };
  }, []);

  const stats = useMemo<PlayerStats>(() => {
    if (matches.length === 0) return { totalMatches: 0, totalGoals: 0, totalAssists: 0, avgRating: 0, wins: 0, draws: 0, losses: 0 };
    
    return matches.reduce((acc, m) => {
      acc.totalMatches++;
      acc.totalGoals += (m.goals || 0);
      acc.totalAssists += (m.assists || 0);
      acc.avgRating += (m.rating || 0);
      if (m.scoreFor > m.scoreAgainst) acc.wins++;
      else if (m.scoreFor < m.scoreAgainst) acc.losses++;
      else acc.draws++;
      return acc;
    }, { 
      totalMatches: 0, 
      totalGoals: 0, 
      totalAssists: 0, 
      avgRating: 0, 
      wins: 0, 
      draws: 0, 
      losses: 0 
    });
  }, [matches]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    setIsSaving(true);
    setProfileSaveSuccess(false);
    setProfileSaveError(null);
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, {
        ...profile,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setProfileSaveSuccess(true);
      setTimeout(() => setProfileSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Profile update error:", err);
      setProfileSaveError("No se pudieron guardar los cambios. Revisa los permisos.");
    } finally {
      setIsSaving(false);
    }
  };

  const chartData = useMemo(() => {
    return [...matches].reverse().map(m => {
      let dateStr = '?';
      if (m.date instanceof Timestamp) {
        dateStr = format(m.date.toDate(), 'MMM dd');
      } else if (m.date instanceof Date) {
        dateStr = format(m.date, 'MMM dd');
      }
      return {
        date: dateStr,
        rating: m.rating || 0,
        goals: m.goals || 0
      };
    }).slice(-10);
  }, [matches]);

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      const matchesSearch = (m.opponent || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                           (m.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesGoals = (m.goals || 0) >= filters.minGoals;
      const matchesAssists = (m.assists || 0) >= filters.minAssists;
      const matchesRating = (m.rating || 0) >= filters.minRating;
      const matchesInjury = !filters.injuryOnly || !!m.injury;
      const matchesYellow = !filters.hasYellow || (m.yellowCards || 0) > 0;
      const matchesRed = !filters.hasRed || (m.redCards || 0) > 0;

      let matchesDate = true;
      if (filters.startDate || filters.endDate) {
        const d = m.date instanceof Timestamp ? m.date.toDate() : new Date();
        const dStr = format(d, 'yyyy-MM-dd');
        if (filters.startDate && dStr < filters.startDate) matchesDate = false;
        if (filters.endDate && dStr > filters.endDate) matchesDate = false;
      }

      return matchesSearch && matchesGoals && matchesAssists && matchesRating && matchesInjury && matchesYellow && matchesRed && matchesDate;
    });
  }, [matches, searchQuery, filters]);

  const handleUpsertMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      // Split YYYY-MM-DD to avoid UTC shift
      const [year, month, day] = formData.date.split('-').map(Number);
      const matchDate = new Date(year, month - 1, day, 12, 0, 0); // Noon local time to be safe

      const data = {
        ...formData,
        date: Timestamp.fromDate(matchDate),
        goals: Number(formData.goals),
        assists: Number(formData.assists),
        scoreFor: Number(formData.scoreFor),
        scoreAgainst: Number(formData.scoreAgainst),
        rating: Number(formData.rating),
        yellowCards: Number(formData.yellowCards),
        redCards: Number(formData.redCards),
        userId: user.uid,
        updatedAt: serverTimestamp()
      };

      if (editingMatch) {
         await setDoc(doc(db, 'users', user.uid, 'matches', editingMatch.id), data, { merge: true });
      } else {
         await addDoc(collection(db, 'users', user.uid, 'matches'), {
           ...data,
           createdAt: serverTimestamp()
         });
      }

      setIsAddModalOpen(false);
      setEditingMatch(null);
      setFormData(INITIAL_FORM_STATE);
    } catch (err) {
      console.error("Save match error:", err);
      // We don't want to throw here because it stops the finally block in some cases or hangs the UI
      // Better to handle the error feedback here if needed
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditMatch = (match: MatchEntry) => {
    let d = new Date();
    if (match.date instanceof Timestamp) {
      d = match.date.toDate();
    } else if (match.date instanceof Date) {
      d = match.date;
    }

    setEditingMatch(match);
    setFormData({
      date: format(d, 'yyyy-MM-dd'),
      opponent: match.opponent || '',
      goals: match.goals || 0,
      assists: match.assists || 0,
      scoreFor: match.scoreFor || 0,
      scoreAgainst: match.scoreAgainst || 0,
      rating: match.rating || 7.0,
      yellowCards: match.yellowCards || 0,
      redCards: match.redCards || 0,
      injury: !!match.injury,
      notes: match.notes || ''
    });
    setIsAddModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingMatch(null);
    setFormData(INITIAL_FORM_STATE);
    setIsAddModalOpen(true);
  };

  const handleDeleteMatch = async (id: string) => {
    if (!user) return;
    // Removed window.confirm for better iframe compatibility, 
    // though usually it's fine, some browsers block it.
    // If the user really needs it, I can add a custom modal later.
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'matches', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/matches/${id}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.1, 1] }} 
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-[#238636] font-black text-4xl uppercase tracking-tighter"
        >
          FutData
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center p-6 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[15vw] leading-[0.82] font-black uppercase tracking-tighter text-[#161B22] mb-8 select-none"
        >
          FutData
        </motion.h1>
        <p className="text-[#8B949E] max-w-md mb-12 text-lg">
          Tu diario de fútbol definitivo. Registra partidos, analiza estadísticas y mejora tu rendimiento.
        </p>
        <button 
          onClick={loginWithGoogle}
          className="flex items-center gap-3 px-8 py-4 bg-[#E1E4E8] text-[#0A0C10] rounded-full font-bold hover:bg-white transition-all transform hover:scale-105 active:scale-95 shadow-xl shadow-white/5"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Ingresar con Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E1E4E8] flex font-sans selection:bg-[#238636]/30 selection:text-white">
      
      {/* Sidebar - Navigation Rail */}
      <aside className="w-16 md:w-64 border-r border-[#30363D] flex flex-col fixed h-full bg-[#161B22] z-20">
        <div className="p-4 md:p-6 flex justify-center md:justify-start">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#238636] rounded-xl flex items-center justify-center font-bold text-lg md:text-xl text-white shadow-lg shadow-[#238636]/20">F</div>
          <h1 className="ml-3 text-2xl font-black uppercase tracking-tighter text-white hidden md:block font-display">FutData</h1>
        </div>

        <nav className="flex-1 px-2 md:px-4 flex flex-col gap-2 mt-8">
          <NavItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeTab === 'dashboard'} 
            onClick={() => setActiveTab('dashboard')} 
          />
          <NavItem 
            icon={Calendar} 
            label="Calendario" 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')} 
          />
          <NavItem 
            icon={HistoryIcon} 
            label="Diario" 
            active={activeTab === 'diary'} 
            onClick={() => setActiveTab('diary')} 
          />
          <NavItem 
            icon={TrendingUp} 
            label="Análisis" 
            active={activeTab === 'stats'} 
            onClick={() => setActiveTab('stats')} 
          />
          <NavItem 
            icon={UserIcon} 
            label="Perfil" 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
          />
        </nav>

        <div className="p-4 border-t border-[#30363D]">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#0D1117] transition-colors group relative border border-transparent hover:border-[#30363D]">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt={user.displayName || ""} className="w-8 h-8 rounded-full border border-[#30363D]" />
            <div className="flex-1 min-w-0 hidden md:block">
              <p className="text-xs font-bold truncate text-[#E1E4E8]">{user.displayName}</p>
              <p className="text-[10px] text-[#8B949E] truncate">{user.email}</p>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-[#8B949E] hover:text-[#f85149] transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 md:ml-64 p-4 sm:p-6 md:p-10 relative">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#30363D] pb-10">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 text-white font-display">
              {activeTab === 'dashboard' ? 'Overview' : activeTab === 'diary' ? 'Match Diary' : activeTab === 'calendar' ? 'Calendario' : activeTab === 'profile' ? 'Perfil' : 'Analytics'}
            </h2>
            <p className="text-[#8B949E] font-mono text-[10px] uppercase tracking-[0.2em]">
              Temporada 2026 • {matches.length} partidos jugados
            </p>
          </div>
          <button 
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#238636] text-white rounded-lg font-bold hover:bg-[#2ea043] transition-all shadow-lg shadow-[#238636]/20 active:translate-y-px border border-[#238636]/30"
          >
            <Plus className="w-5 h-5" />
            <span>Registrar Partido</span>
          </button>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            >
              <MetricCard title="Promedio Rating" value={(stats.avgRating / (stats.totalMatches || 1)).toFixed(1)} icon={TrendingUp} colorClass="text-[#238636]" />
              <MetricCard title="Goles Totales" value={stats.totalGoals} icon={Trophy} />
              <MetricCard title="Asistencias" value={stats.totalAssists} icon={UserIcon} />
              <MetricCard title="Partidos" value={stats.totalMatches} icon={Calendar} />

              <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                <div className="lg:col-span-2 bg-[#161B22] border border-[#30363D] p-6 rounded-xl">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B949E] mb-8">Tendencia de Rendimiento</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                        <XAxis 
                          dataKey="date" 
                          stroke="#8B949E" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="#8B949E" 
                          fontSize={10} 
                          tickLine={false} 
                          axisLine={false}
                          domain={[0, 10]}
                        />
                        <Tooltip 
                          contentStyle={{ background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', fontSize: '10px', color: '#E1E4E8' }}
                          itemStyle={{ color: '#238636' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="rating" 
                          stroke="#238636" 
                          strokeWidth={3} 
                          dot={{ r: 4, fill: '#238636', strokeWidth: 0 }}
                          activeDot={{ r: 6, strokeWidth: 0 }} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-xl flex flex-col">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B949E] mb-8">Record de Resultados</h3>
                  <div className="flex-1 flex flex-col justify-center gap-6">
                    <ResultBar label="Victorias" count={stats.wins} total={stats.totalMatches} color="emerald" />
                    <ResultBar label="Empates" count={stats.draws} total={stats.totalMatches} color="amber" />
                    <ResultBar label="Derrotas" count={stats.losses} total={stats.totalMatches} color="rose" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'diary' && (
            <motion.div 
              key="diary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl"
            >
              <div className="bg-[#161B22] border border-[#30363D] rounded-xl overflow-hidden backdrop-blur-sm">
                <div className="p-4 border-b border-[#30363D] flex flex-col gap-4 bg-[#0D1117]">
                  <div className="flex justify-between items-center gap-4">
                    <div className="relative flex-1 max-w-xs">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8B949E]" />
                      <input 
                        type="text" 
                        placeholder="Buscar oponente..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0C10] border border-[#30363D] rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-[#238636] transition-colors text-[#E1E4E8]"
                      />
                    </div>
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 p-1.5 px-3 text-xs rounded-lg transition-colors border ${showFilters ? 'bg-[#238636] text-white border-[#238636]' : 'text-[#8B949E] hover:text-[#E1E4E8] border-[#30363D]'}`}
                    >
                      <Filter className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Filtros</span>
                    </button>
                  </div>

                  {showFilters && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      className="grid grid-cols-2 sm:grid-cols-3 gap-4 pb-2"
                    >
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Goles Mín.</label>
                        <input 
                          type="number" min="0" value={filters.minGoals} 
                          onChange={e => setFilters({...filters, minGoals: Number(e.target.value)})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Asist. Mín.</label>
                        <input 
                          type="number" min="0" value={filters.minAssists} 
                          onChange={e => setFilters({...filters, minAssists: Number(e.target.value)})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Rating Mín.</label>
                        <input 
                          type="number" min="0" max="10" step="0.5" value={filters.minRating} 
                          onChange={e => setFilters({...filters, minRating: Number(e.target.value)})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Desde</label>
                        <input 
                          type="date" value={filters.startDate} 
                          onChange={e => setFilters({...filters, startDate: e.target.value})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-[10px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Hasta</label>
                        <input 
                          type="date" value={filters.endDate} 
                          onChange={e => setFilters({...filters, endDate: e.target.value})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-[10px]"
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" checked={filters.injuryOnly}
                          onChange={e => setFilters({...filters, injuryOnly: e.target.checked})}
                          id="f-injury"
                        />
                        <label htmlFor="f-injury" className="text-[10px] text-[#8B949E] uppercase cursor-pointer">Solo Lesiones</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" checked={filters.hasYellow}
                          onChange={e => setFilters({...filters, hasYellow: e.target.checked})}
                          id="f-yellow"
                        />
                        <label htmlFor="f-yellow" className="text-[10px] text-[#8B949E] uppercase cursor-pointer">Amarillas</label>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <input 
                          type="checkbox" checked={filters.hasRed}
                          onChange={e => setFilters({...filters, hasRed: e.target.checked})}
                          id="f-red"
                        />
                        <label htmlFor="f-red" className="text-[10px] text-[#8B949E] uppercase cursor-pointer">Rojas</label>
                      </div>
                      <div className="flex items-end justify-end mt-2">
                        <button 
                          onClick={() => {
                            setFilters({
                              minGoals: 0,
                              minAssists: 0,
                              minRating: 0,
                              injuryOnly: false,
                              hasYellow: false,
                              hasRed: false,
                              startDate: '',
                              endDate: '',
                            });
                            setSearchQuery('');
                          }}
                          className="text-[9px] font-mono text-[#f85149] hover:underline uppercase"
                        >
                          Limpiar Filtros
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
                <div className="divide-y divide-[#30363D]/50">
                  {filteredMatches.length === 0 ? (
                    <div className="p-12 text-center text-[#8B949E]">
                      <HistoryIcon className="w-12 h-12 text-[#30363D] mx-auto mb-4" />
                      <p>{matches.length === 0 ? "No hay partidos registrados aún." : "No se encontraron partidos con esos filtros."}</p>
                      {matches.length === 0 && (
                        <button 
                          onClick={handleOpenAddModal}
                          className="mt-4 text-[#58A6FF] hover:underline text-sm font-medium"
                        >
                          Registra tu primer partido
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredMatches.map(m => (
                      <MatchCard key={m.id} match={m} onDelete={handleDeleteMatch} onEdit={handleEditMatch} />
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'calendar' && (
            <motion.div 
              key="calendar"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl"
            >
              <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-2xl">
                {/* Calendar Header */}
                <div className="p-6 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117]">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors border border-[#30363D]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest text-[#8B949E] hover:text-white hover:bg-[#30363D] rounded-lg border border-[#30363D] transition-colors"
                    >
                      Hoy
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                      className="p-2 hover:bg-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors border border-[#30363D]"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="p-4 bg-[#0D1117]/50">
                  <div className="grid grid-cols-7 mb-2">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                      <div key={day} className="text-center py-2 text-[10px] font-mono text-[#8B949E] uppercase tracking-widest font-bold">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-[#30363D] border border-[#30363D] rounded-lg overflow-hidden">
                    {(() => {
                      const monthStart = startOfMonth(currentMonth);
                      const monthEnd = endOfMonth(monthStart);
                      const startDate = startOfWeek(monthStart);
                      const endDate = endOfWeek(monthEnd);
                      const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                      return calendarDays.map((day, idx) => {
                        const dayMatches = matches.filter(m => {
                          const mDate = m.date instanceof Timestamp ? m.date.toDate() : m.date;
                          return isSameDay(mDate, day);
                        });

                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const isToday = isSameDay(day, new Date());

                        return (
                          <div 
                            key={idx} 
                            className={`min-h-[80px] sm:min-h-[100px] p-2 bg-[#0D1117] transition-colors flex flex-col gap-1 ${!isCurrentMonth ? 'opacity-30' : ''}`}
                          >
                            <span className={`text-[10px] font-mono ${isToday ? 'bg-[#238636] text-white px-1.5 py-0.5 rounded-full w-fit' : 'text-[#8B949E]'}`}>
                              {format(day, 'd')}
                            </span>
                            
                            <div className="flex flex-col gap-1 mt-1">
                              {dayMatches.map(m => {
                                const result = m.scoreFor > m.scoreAgainst ? 'W' : m.scoreFor < m.scoreAgainst ? 'L' : 'D';
                                const colorClass = result === 'W' ? 'bg-[#238636]' : result === 'L' ? 'bg-[#f85149]' : 'bg-[#d29922]';
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => handleEditMatch(m)}
                                    className={`w-full text-left p-1 rounded text-[9px] font-bold text-white ${colorClass} hover:brightness-110 transition-all truncate shadow-sm`}
                                    title={`vs ${m.opponent || 'Casual'}`}
                                  >
                                    {result}: {m.scoreFor}-{m.scoreAgainst}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Legend */}
                <div className="p-4 bg-[#0D1117] border-t border-[#30363D] flex flex-wrap gap-4 justify-center sm:justify-start">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#238636]" />
                    <span className="text-[10px] font-mono text-[#8B949E] uppercase">Victoria</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#d29922]" />
                    <span className="text-[10px] font-mono text-[#8B949E] uppercase">Empate</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-[#f85149]" />
                    <span className="text-[10px] font-mono text-[#8B949E] uppercase">Derrota</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'stats' && (
             <motion.div 
               key="stats"
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, y: -20 }}
               className="grid grid-cols-1 lg:grid-cols-2 gap-8"
             >
               <div className="bg-[#161B22] border border-[#30363D] p-8 rounded-xl shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[#8B949E] mb-6">Aportación Ofensiva</h3>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#30363D" vertical={false} />
                        <XAxis dataKey="date" stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                        <YAxis stroke="#8B949E" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip 
                          cursor={{ fill: '#0D1117' }}
                          contentStyle={{ background: '#0D1117', border: '1px solid #30363D', borderRadius: '8px', fontSize: '10px' }}
                        />
                        <Bar dataKey="goals" fill="#238636" radius={[2, 2, 0, 0]} name="Goles" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               <div className="bg-[#161B22] border border-[#30363D] p-8 rounded-xl shadow-sm">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-[#8B949E] mb-6">Resumen de Disciplina</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0A0C10] rounded-xl border border-[#30363D] text-center">
                      <p className="text-[#8B949E] text-[10px] uppercase font-mono mb-2">Amarillas</p>
                      <p className="text-3xl font-bold text-[#d29922]">{matches.reduce((acc, m) => acc + (m.yellowCards || 0), 0)}</p>
                    </div>
                    <div className="p-4 bg-[#0A0C10] rounded-xl border border-[#30363D] text-center">
                      <p className="text-[#8B949E] text-[10px] uppercase font-mono mb-2">Rojas</p>
                      <p className="text-3xl font-bold text-[#f85149]">{matches.reduce((acc, m) => acc + (m.redCards || 0), 0)}</p>
                    </div>
                    <div className="p-4 bg-[#0A0C10] rounded-xl border border-[#30363D] text-center col-span-2">
                       <p className="text-[#8B949E] text-[10px] uppercase font-mono mb-2">Lesiones Reportadas</p>
                       <p className="text-3xl font-bold text-[#E1E4E8]">{matches.filter(m => m.injury).length}</p>
                    </div>
                  </div>
               </div>
             </motion.div>
          )}
          {activeTab === 'profile' && profile && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-2xl"
            >
              <div className="bg-[#161B22] border border-[#30363D] rounded-2xl overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-[#30363D] bg-[#0D1117]">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-24 h-24 rounded-full border-4 border-[#30363D] overflow-hidden bg-[#0A0C10] flex-shrink-0">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8B949E]">
                          <UserIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left">
                      <h3 className="text-2xl font-bold text-white mb-1">{profile.displayName}</h3>
                      <p className="text-[#8B949E] font-mono text-sm uppercase tracking-wider">{profile.email}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="p-8 space-y-8">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Nombre de Jugador</label>
                    <input 
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                      className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Fecha de Nacimiento</label>
                      <input 
                        type="date"
                        value={profile.birthDate || ''}
                        onChange={(e) => setProfile({...profile, birthDate: e.target.value})}
                        className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Equipo Favorito</label>
                      <input 
                        type="text"
                        placeholder="Club Atlético..."
                        value={profile.favoriteTeam || ''}
                        onChange={(e) => setProfile({...profile, favoriteTeam: e.target.value})}
                        className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium placeholder:text-[#30363D]"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Posiciones (Separadas por coma)</label>
                    <input 
                      type="text"
                      placeholder="Arquero, Central, Delantero..."
                      value={profile.positions?.join(', ') || ''}
                      onChange={(e) => setProfile({...profile, positions: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium placeholder:text-[#30363D]"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Equipos en los que juegas (Separados por coma)</label>
                    <input 
                      type="text"
                      placeholder="Los Picapiedras FC, Senior B..."
                      value={profile.myTeams?.join(', ') || ''}
                      onChange={(e) => setProfile({...profile, myTeams: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})}
                      className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium placeholder:text-[#30363D]"
                    />
                  </div>

                  {profileSaveSuccess && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#238636]/10 border border-[#238636]/30 text-[#238636] text-sm font-semibold rounded-xl text-center"
                    >
                      ¡Perfil actualizado con éxito!
                    </motion.div>
                  )}

                  {profileSaveError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-[#f85149]/10 border border-[#f85149]/30 text-[#f85149] text-sm font-semibold rounded-xl text-center"
                    >
                      {profileSaveError}
                    </motion.div>
                  )}

                  <div className="pt-4">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className={`w-full py-4 bg-[#238636] text-white rounded-xl font-bold hover:bg-[#2ea043] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#238636]/20 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Actualizar Perfil</span>
                          <UserIcon className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Add Match */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              />
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-[#161B22] border border-[#30363D] shadow-2xl rounded-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-[#30363D] flex justify-between items-center bg-[#0D1117]">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white">
                    {editingMatch ? 'Editar Partido' : 'Registro de Partido'}
                  </h3>
                  <button onClick={() => { setIsAddModalOpen(false); setEditingMatch(null); }} className="text-[#8B949E] hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleUpsertMatch} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest">Fecha</label>
                    <input 
                      type="date" 
                      required 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-[#0A0C10] border border-[#30363D] rounded-xl px-4 py-3 text-sm focus:border-[#238636] outline-none text-[#E1E4E8]"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest">Oponente (Opcional)</label>
                    <input 
                      type="text" 
                      placeholder="FC Barcelona, Amigos, Liga..."
                      value={formData.opponent}
                      onChange={e => setFormData({...formData, opponent: e.target.value})}
                      className="w-full bg-[#0A0C10] border border-[#30363D] rounded-xl px-4 py-3 text-sm focus:border-[#238636] outline-none text-[#E1E4E8]"
                    />
                  </div>

                  <div className="space-y-4 pt-4 border-t border-[#30363D] md:col-span-2">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <NumberInput label="Goles" value={formData.goals} onChange={v => setFormData({...formData, goals: v})} />
                      <NumberInput label="Asistencias" value={formData.assists} onChange={v => setFormData({...formData, assists: v})} />
                      <NumberInput label="Resultado (Mío)" value={formData.scoreFor} onChange={v => setFormData({...formData, scoreFor: v})} />
                      <NumberInput label="Resultado (Rival)" value={formData.scoreAgainst} onChange={v => setFormData({...formData, scoreAgainst: v})} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest flex justify-between">
                      <span>Rating Personal</span>
                      <span className="text-[#238636] font-bold">{formData.rating}</span>
                    </label>
                    <input 
                      type="range" min="1" max="10" step="0.5" 
                      value={formData.rating}
                      onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                      className="w-full accent-[#238636] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 items-end">
                     <NumberInput label="Amarillas" value={formData.yellowCards} onChange={v => setFormData({...formData, yellowCards: v})} max={2} />
                     <NumberInput label="Rojas" value={formData.redCards} onChange={v => setFormData({...formData, redCards: v})} max={1} />
                     <label className="flex items-center gap-2 mb-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={formData.injury}
                          onChange={e => setFormData({...formData, injury: e.target.checked})}
                          className="w-4 h-4 rounded border-[#30363D] bg-[#0A0C10] text-[#238636] focus:ring-[#238636]"
                        />
                        <span className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest group-hover:text-[#E1E4E8] transition-colors">Lesión?</span>
                     </label>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-mono text-[#8B949E] uppercase tracking-widest">Notas del Partido</label>
                    <textarea 
                      rows={3}
                      placeholder="Sensaciones, momentos claves, qué mejorar..."
                      value={formData.notes}
                      onChange={e => setFormData({...formData, notes: e.target.value})}
                      className="w-full bg-[#0A0C10] border border-[#30363D] rounded-xl px-4 py-3 text-sm focus:border-[#238636] outline-none resize-none text-[#E1E4E8]"
                    />
                  </div>

                  <div className="md:col-span-2 pt-4">
                    <button 
                      type="submit"
                      disabled={isSaving}
                      className={`w-full py-4 bg-[#238636] text-white rounded-xl font-bold hover:bg-[#2ea043] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#238636]/20 ${isSaving ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isSaving ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>{editingMatch ? 'Guardar Cambios' : 'Guardar Registro'}</span>
                          <Trophy className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </main>
    </div>
  );
}

// --- Helper Components ---

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-[#238636] text-white shadow-lg shadow-[#238636]/20' : 'text-[#8B949E] hover:text-[#E1E4E8] hover:bg-[#0D1117] border border-transparent'}`}
    >
      <Icon className={`w-5 h-5 ${active ? '' : 'group-hover:scale-110 transition-transform'}`} />
      <span className="text-sm font-bold hidden md:block">{label}</span>
    </button>
  );
}

function ResultBar({ label, count, total, color }: { label: string, count: number, total: number, color: 'emerald' | 'amber' | 'rose' }) {
  const percentage = total === 0 ? 0 : (count / total) * 100;
  const colorMap = {
    emerald: 'bg-[#238636]',
    amber: 'bg-[#d29922]',
    rose: 'bg-[#f85149]',
  };
  const textMap = {
    emerald: 'text-[#238636]',
    amber: 'text-[#d29922]',
    rose: 'text-[#f85149]',
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-[10px] font-bold text-[#8B949E] uppercase tracking-wider">{label}</span>
        <span className={`text-xs font-mono font-bold ${textMap[color]}`}>{count} <span className="text-[#30363D]">/ {total}</span></span>
      </div>
      <div className="h-1.5 w-full bg-[#0A0C10] border border-[#30363D] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          className={`h-full ${colorMap[color]} shadow-[0_0_8px_rgba(35,134,54,0.3)]`}
        />
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, max }: { label: string, value: number, onChange: (v: number) => void, max?: number }) {
  return (
    <div className="space-y-1">
      <label className="text-[9px] font-mono text-[#8B949E] uppercase tracking-[0.2em]">{label}</label>
      <div className="flex items-center gap-2 bg-[#0A0C10] border border-[#30363D] rounded-lg p-1">
        <button 
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-8 h-8 flex items-center justify-center hover:bg-[#161B22] rounded-md transition-colors text-[#8B949E] hover:text-[#E1E4E8]"
        >
          -
        </button>
        <span className="flex-1 text-center font-bold text-sm text-[#E1E4E8]">{value}</span>
        <button 
          type="button"
          onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
          className="w-8 h-8 flex items-center justify-center hover:bg-[#161B22] rounded-md transition-colors text-[#8B949E] hover:text-[#E1E4E8]"
        >
          +
        </button>
      </div>
    </div>
  );
}
