/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, loginWithGoogle, logout, loginComplexAccount, sendComplexPasswordReset } from './lib/firebase';
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
  Timestamp,
  where
} from 'firebase/firestore';
import { 
  Users, MapPin, Swords, Building2,
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
import { Groups, TeamMatches, Venues } from './Community';
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
function MetricCard({ title, value, icon: Icon, colorClass = "text-[#E1E4E8]" }: { title: string, value: string | number, icon: any, colorClass?: string }) {
  return (
    <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-xl hover:border-[#484f58] transition-colors group max-md:p-4">
      <div className="flex justify-between items-start mb-4 max-md:mb-3">
        <div className="p-2 bg-[#0D1117] rounded-lg group-hover:bg-[#1c2128] transition-colors">
          <Icon className="w-5 h-5 text-[#8B949E]" />
        </div>
      </div>
      <div>
        <p className="text-[#8B949E] text-[10px] font-mono uppercase tracking-widest mb-1">{title}</p>
        <p className={`text-2xl font-bold tracking-tight max-md:text-xl ${colorClass}`}>{value}</p>
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
            <span className="text-[9px] text-[#8B949E] uppercase tracking-widest font-mono">Calificación</span>
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
          className="p-2 text-[#8B949E] hover:text-[#58A6FF] hover:bg-[#58A6FF]/10 rounded-lg transition-colors max-md:p-2.5"
          title="Edit match"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        <button 
          onClick={() => onDelete(match.id)}
          className="p-2 text-[#8B949E] hover:text-[#f85149] hover:bg-[#f85149]/10 rounded-lg transition-colors max-md:p-2.5"
          title="Delete match"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accountType, setAccountType] = useState<'player' | 'complex' | null>(null);
  const [loginMode, setLoginMode] = useState<'choose' | 'complex'>('choose');
  const [complexEmail, setComplexEmail] = useState('');
  const [complexPassword, setComplexPassword] = useState('');
  const [complexPasswordConfirm, setComplexPasswordConfirm] = useState('');
  const [complexRegisterMode, setComplexRegisterMode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [venueBookings, setVenueBookings] = useState<any[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<MatchEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'diary' | 'calendar' | 'profile' | 'groups' | 'teamMatches' | 'venues'>('dashboard');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  // Día seleccionado en el calendario mobile (solo se usa en pantallas < 768 px)
  const [selectedDay, setSelectedDay] = useState(new Date());

  // En celulares, al cambiar de sección volvemos arriba (en escritorio no cambia nada).
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      window.scrollTo({ top: 0 });
    }
  }, [activeTab]);

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
    let unsubscribeData: (() => void) | null = null;
    let cancelled = false;

    const unsubscribeAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setProfile(null);
      setMatches([]);
      setVenueBookings([]);
      setAccountType(null);
      if (unsubscribeData) { unsubscribeData(); unsubscribeData = null; }

      if (!u) { setLoading(false); return; }
      setLoading(true);

const isGooglePlayer = u.providerData.some(
  p => p.providerId === 'google.com'
);

if (isGooglePlayer) {
  setProfile({
    uid: u.uid,
    displayName: u.displayName || 'Jugador',
    email: u.email || '',
    photoURL: u.photoURL || '',
    positions: [],
    myTeams: [],
    favoriteTeam: '',
    birthDate: ''
  } as UserProfile);
}

      try {
        const typeRef = doc(db, 'accountTypes', u.uid);
        let typeSnap = await getDoc(typeRef);
  
        if (!typeSnap.exists()) {
          const isGooglePlayer = u.providerData.some(p => p.providerId === 'google.com');
          if (!isGooglePlayer) {
            await logout();
            setAuthError('Esta cuenta no está habilitada para administrar complejos. Contactá al administrador de FutData.');
            setLoading(false);
            return;
          }
          await setDoc(typeRef, { role: 'player', email: u.email || '', createdAt: serverTimestamp() });
          typeSnap = await getDoc(typeRef);
        }
        const role = typeSnap.data()?.role === 'complex' ? 'complex' : 'player';
        if (cancelled) return;
        setAccountType(role);

        if (role === 'complex') {
          setLoading(false);
          return;
        }

        // Los datos de Google funcionan como perfil base. Si Firestore no responde,
        // el jugador igualmente puede entrar y ver/editar su información básica.
        const googleProfile = {
          uid: u.uid,
          displayName: u.displayName || 'Jugador',
          email: u.email || '',
          photoURL: u.photoURL || '',
          positions: [],
          myTeams: [],
          favoriteTeam: '',
          birthDate: ''
        };
        setProfile(googleProfile as UserProfile);

        try {
          const userRef = doc(db, 'users', u.uid);
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile = {
              ...googleProfile,
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile as any);
          } else {
            // Conserva los datos adicionales guardados y completa los datos faltantes
            // con la información disponible en la cuenta de Google.
            setProfile({ ...googleProfile, ...userDoc.data(), uid: u.uid } as UserProfile);
          }
        } catch (err) {
          console.error('No se pudo cargar el perfil desde Firestore. Se usarán los datos de Google:', err);
          setProfile(googleProfile as UserProfile);
        }

        const matchesQuery = query(collection(db, 'users', u.uid, 'matches'), orderBy('date', 'desc'));
        const stopMatches = onSnapshot(matchesQuery, (snapshot) => {
          setMatches(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MatchEntry)));
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.LIST, `users/${u.uid}/matches`);
          setLoading(false);
        });
        const bookingsQuery = query(collection(db, 'bookings'), where('participantIds', 'array-contains', u.uid));
        const stopBookings = onSnapshot(bookingsQuery, (snapshot) => {
          setVenueBookings(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter((b:any) => b.status !== 'cancelled'));
        }, (err) => console.error('No se pudieron cargar las reservas del calendario:', err));
        unsubscribeData = () => { stopMatches(); stopBookings(); };
      } catch (err) {
        console.error('No se pudo determinar el tipo de cuenta:', err);
        setAuthError('No se pudo verificar el tipo de cuenta. Revisá las reglas de Firestore.');
        setLoading(false);
      }
    });

    const timer = setTimeout(() => setLoading(false), 7000);
    return () => {
      cancelled = true;
      unsubscribeAuth();
      if (unsubscribeData) unsubscribeData();
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
    const authInput = 'w-full bg-[#0D1117] border border-[#30363D] rounded-xl px-4 py-3 text-white outline-none focus:border-[#238636]';
    async function handleComplexAuth() {
      setAuthBusy(true); setAuthError(''); setAuthNotice('');
      try {
        if (complexEmail.trim().toLowerCase() !== 'complejo') {
          throw new Error('El usuario de acceso es Complejo.');
        }
        if (!complexPassword) throw new Error('Ingresá la contraseña.');
        await loginComplexAccount('complejofd@gmail.com', complexPassword);
      } catch (err: any) {
        const code = err?.code || '';
        console.error('[FutData] Error al iniciar sesión del complejo:', code, err);
        setAuthError(
          code === 'auth/invalid-credential' || code === 'auth/wrong-password'
            ? 'La cuenta existe, pero Firebase rechazó la contraseña. Usá “Recuperar contraseña” para establecer una nueva.'
            : code === 'auth/user-not-found'
              ? 'No se encontró complejofd@gmail.com en el proyecto Firebase conectado a esta aplicación.'
              : code === 'auth/operation-not-allowed'
                ? 'Está deshabilitado el proveedor Correo electrónico/Contraseña en Firebase Authentication.'
                : code === 'auth/too-many-requests'
                  ? 'Firebase bloqueó temporalmente los intentos. Esperá unos minutos y volvé a probar.'
                  : err?.message || 'No se pudo ingresar.'
        );
      } finally { setAuthBusy(false); }
    }
    return (
      <div className="min-h-screen bg-[#0A0C10] flex flex-col items-center justify-center p-6 text-center">
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-[15vw] leading-[0.82] font-black uppercase tracking-tighter text-[#161B22] mb-6 select-none">FutData</motion.h1>
        <p className="text-[#8B949E] max-w-xl mb-10 text-lg max-md:text-base max-md:mb-8">Una plataforma para organizar partidos, administrar complejos y conectar jugadores.</p>

        {loginMode === 'choose' ? (
          <div className="w-full max-w-xl flex flex-col items-center">
            <button
              onClick={async () => {
                try {
                  setAuthError('');
                  await loginWithGoogle();
                } catch (e: any) {
                  setAuthError(e.message || 'No se pudo ingresar con Google.');
                }
              }}
              className="w-full max-w-lg bg-[#238636] hover:bg-[#2ea043] border border-[#2ea043] rounded-2xl px-8 py-7 text-left transition-all shadow-xl shadow-[#238636]/15 group max-md:px-5 max-md:py-5"
            >
              <div className="flex items-center gap-5 max-md:gap-4">
                <div className="w-14 h-14 shrink-0 rounded-xl bg-white flex items-center justify-center text-[#4285F4] text-2xl font-black max-md:w-12 max-md:h-12">G</div>
                <div className="flex-1 max-md:min-w-0">
                  <span className="block text-2xl font-black text-white max-md:text-xl">Ingresar con Google</span>
                  <span className="block text-sm text-white/80 mt-1">Accedé a FutData como jugador</span>
                </div>
                <span className="text-3xl text-white group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>

            <p className="text-xs text-[#8B949E] mt-5">Registrate o ingresá con tu cuenta de Google. Es gratis.</p>

            <div className="mt-14 pt-5 border-t border-[#30363D] w-full max-w-sm">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6E7681] mb-2">¿Administrás un complejo?</p>
              <button
                onClick={() => { setLoginMode('complex'); setAuthError(''); }}
                className="text-xs text-[#8B949E] hover:text-[#7ee2a3] underline underline-offset-4 transition-colors max-md:text-sm max-md:py-2 max-md:px-3"
              >
                Acceso para complejos
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full max-w-md bg-[#161B22] border border-[#30363D] rounded-2xl p-6 text-left space-y-4 max-md:p-5">
            <button className="text-sm text-[#7ee2a3] max-md:py-2" onClick={() => { setLoginMode('choose'); setAuthError(''); }}>← Volver</button>
            <div><h2 className="text-2xl font-black">Acceso de complejos</h2><p className="text-sm text-[#8B949E] mt-1">Ingresá con las credenciales habilitadas por FutData.</p></div>
            <input className={authInput} type="text" autoComplete="username" placeholder="Usuario" value={complexEmail} onChange={e => setComplexEmail(e.target.value)} />
            <input className={authInput} type="password" autoComplete="current-password" placeholder="Contraseña" value={complexPassword} onChange={e => setComplexPassword(e.target.value)} />
            {authError && <p className="text-sm text-[#f85149]" role="alert">{authError}</p>}
            {authNotice && <p className="text-sm text-[#7ee2a3]" role="status">{authNotice}</p>}
            <button disabled={authBusy} onClick={handleComplexAuth} className="w-full bg-[#238636] hover:bg-[#2ea043] disabled:opacity-50 rounded-xl py-3 font-bold">{authBusy ? 'Ingresando...' : 'Ingresar'}</button>
            <button type="button" disabled={authBusy} onClick={async () => { setAuthError(''); setAuthNotice(''); setAuthBusy(true); try { await sendComplexPasswordReset(); setAuthNotice('Enviamos un enlace para crear una nueva contraseña a complejofd@gmail.com. Revisá también Spam.'); } catch (err: any) { console.error('[FutData] Error al enviar recuperación:', err?.code, err); setAuthError(err?.message || 'No se pudo enviar el correo de recuperación.'); } finally { setAuthBusy(false); } }} className="w-full text-sm text-[#7ee2a3] hover:underline disabled:opacity-50">Recuperar contraseña</button>
            <p className="text-xs text-[#8B949E]">Las cuentas de complejos son creadas y habilitadas exclusivamente por FutData.</p>
          </div>
        )}
        {authError && loginMode === 'choose' && <p className="text-sm text-[#f85149] mt-5">{authError}</p>}
      </div>
    );
  }

  if (accountType === 'complex') {
    return <div className="min-h-screen bg-[#0A0C10] text-[#E1E4E8] flex font-sans max-md:flex-col">
      {/* Barra superior del complejo (solo mobile) */}
      <div className="md:hidden sticky top-0 z-30 bg-[#161B22]/95 backdrop-blur border-b border-[#30363D] pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 shrink-0 bg-[#238636] rounded-xl flex items-center justify-center font-black text-lg">F</div>
            <span className="text-lg font-black uppercase tracking-tight truncate">FutData <span className="text-[#7ee2a3]">Complejos</span></span>
          </div>
          <button onClick={logout} className="shrink-0 flex items-center gap-1.5 text-sm text-[#8B949E] border border-[#30363D] rounded-lg px-3 py-2 active:text-red-400" aria-label="Cerrar sesión">
            <LogOut size={16}/>Salir
          </button>
        </div>
      </div>
      <aside className="w-16 md:w-64 border-r border-[#30363D] flex flex-col fixed h-full bg-[#161B22] z-20 max-md:hidden">
        <div className="p-4 md:p-6 flex items-center"><div className="w-10 h-10 bg-[#238636] rounded-xl flex items-center justify-center font-black text-xl">F</div><span className="ml-3 text-xl font-black uppercase tracking-tight hidden md:block">FutData <span className="text-[#7ee2a3]">Complejos</span></span></div>
        <nav className="flex-1 px-3 mt-8"><div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-[#238636]/15 text-[#7ee2a3]"><Building2 size={19}/><span className="hidden md:block font-bold text-sm">Agenda del complejo</span></div></nav>
        <div className="p-4 border-t border-[#30363D]"><p className="text-xs text-[#8B949E] truncate hidden md:block mb-3">{user.email}</p><button onClick={logout} className="flex items-center gap-2 text-sm text-[#8B949E] hover:text-red-400"><LogOut size={16}/><span className="hidden md:block">Cerrar sesión</span></button></div>
      </aside>
      <main className="flex-1 ml-16 md:ml-64 p-4 sm:p-6 md:p-10 max-md:ml-0 max-md:min-w-0 max-md:pb-[calc(2rem+env(safe-area-inset-bottom))]"><header className="mb-8 border-b border-[#30363D] pb-6 max-md:mb-5 max-md:pb-4"><p className="text-xs uppercase tracking-[0.2em] text-[#7ee2a3] font-mono mb-2 max-md:mb-1">Portal de establecimientos</p><h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight max-md:text-3xl">Agenda del complejo</h1><p className="text-[#8B949E] mt-2 max-md:text-sm">Administrá tus canchas y todos los turnos desde un solo lugar.</p></header><Venues user={user} mode="owner"/></main>
    </div>;
  }

  return (
    <div className="min-h-screen bg-[#0A0C10] text-[#E1E4E8] flex font-sans selection:bg-[#238636]/30 selection:text-white max-md:flex-col">

      {/* Barra superior (solo mobile) */}
      <div className="md:hidden sticky top-0 z-30 bg-[#161B22]/95 backdrop-blur border-b border-[#30363D] pt-[env(safe-area-inset-top)]">
        <div className="h-14 px-4 flex items-center justify-between">
          <button onClick={() => setActiveTab('dashboard')} className="flex items-center gap-2" aria-label="Ir al inicio">
            <div className="w-8 h-8 bg-[#238636] rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-[#238636]/20">F</div>
            <span className="text-xl font-black uppercase tracking-tighter text-white font-display">FutData</span>
          </button>
          <button onClick={() => setActiveTab('profile')} aria-label="Ir al perfil" className="p-1 -m-1">
            <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} alt="" referrerPolicy="no-referrer" className={`w-8 h-8 rounded-full border ${activeTab === 'profile' ? 'border-[#238636]' : 'border-[#30363D]'}`} />
          </button>
        </div>
      </div>

      {/* Sidebar - Navigation Rail */}
      <aside className="w-16 md:w-64 border-r border-[#30363D] flex flex-col fixed h-full bg-[#161B22] z-20 max-md:hidden">
        <div className="p-4 md:p-6 flex justify-center md:justify-start">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-[#238636] rounded-xl flex items-center justify-center font-bold text-lg md:text-xl text-white shadow-lg shadow-[#238636]/20">F</div>
          <h1 className="ml-3 text-2xl font-black uppercase tracking-tighter text-white hidden md:block font-display">FutData</h1>
        </div>

        <nav className="flex-1 px-2 md:px-4 flex flex-col gap-2 mt-8">
          <NavItem 
            icon={LayoutDashboard} 
            label="Inicio" 
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
          <NavItem icon={Users} label="Grupos" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          <NavItem icon={Swords} label="Partidos" active={activeTab === 'teamMatches'} onClick={() => setActiveTab('teamMatches')} />
          <NavItem icon={MapPin} label="Canchas" active={activeTab === 'venues'} onClick={() => setActiveTab('venues')} />
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
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-16 md:ml-64 p-4 sm:p-6 md:p-10 relative max-md:ml-0 max-md:min-w-0 max-md:pb-28">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-[#30363D] pb-10 max-md:gap-3 max-md:mb-5 max-md:pb-4">
          <div>
            <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 text-white font-display max-md:text-3xl max-md:mb-1">
              {activeTab === 'teamMatches'
                ? <><span className="max-md:hidden">Partidos</span><span className="md:hidden">Rivales</span></>
                : activeTab === 'dashboard' ? 'Inicio' : activeTab === 'diary' ? 'Diario de partidos' : activeTab === 'calendar' ? 'Calendario' : activeTab === 'profile' ? 'Perfil' : activeTab === 'groups' ? 'Grupos' : activeTab === 'venues' ? 'Canchas' : 'Inicio'}
            </h2>
            <p className="text-[#8B949E] font-mono text-[10px] uppercase tracking-[0.2em]">
              Temporada 2026 • {matches.length} partidos jugados
            </p>
          </div>
          {(['dashboard','diary','calendar'].includes(activeTab)) && <button 
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#238636] text-white rounded-lg font-bold hover:bg-[#2ea043] transition-all shadow-lg shadow-[#238636]/20 active:translate-y-px border border-[#238636]/30 max-md:hidden"
          >
            <Plus className="w-5 h-5" />
            <span>Registrar partido</span>
          </button>}
        </header>

        {/* Mobile: sub-secciones de Inicio (Resumen / Calendario / Diario) */}
        {(['dashboard','diary','calendar'].includes(activeTab)) && (
          <div className="md:hidden grid grid-cols-3 gap-1 p-1 mb-5 bg-[#161B22] border border-[#30363D] rounded-xl">
            {([['dashboard', 'Resumen', LayoutDashboard], ['calendar', 'Calendario', Calendar], ['diary', 'Diario', HistoryIcon]] as const).map(([tab, label, Icon]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${activeTab === tab ? 'bg-[#238636] text-white shadow-lg shadow-[#238636]/20' : 'text-[#8B949E]'}`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Mobile: botón flotante para registrar partido */}
        {(['dashboard','diary','calendar'].includes(activeTab)) && (
          <button
            onClick={handleOpenAddModal}
            aria-label="Registrar partido"
            className="md:hidden fixed right-4 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 w-14 h-14 rounded-full bg-[#238636] text-white flex items-center justify-center shadow-xl shadow-[#238636]/30 border border-[#2ea043] active:scale-95 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'groups' && <Groups user={user} />}
          {activeTab === 'teamMatches' && <TeamMatches user={user} />}
          {activeTab === 'venues' && <Venues user={user} mode="player" />}
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-md:grid-cols-2 max-md:gap-3"
            >
              <MetricCard title="Calificación promedio" value={(stats.avgRating / (stats.totalMatches || 1)).toFixed(1)} icon={TrendingUp} colorClass="text-[#238636]" />
              <MetricCard title="Goles Totales" value={stats.totalGoals} icon={Trophy} />
              <MetricCard title="Asistencias" value={stats.totalAssists} icon={UserIcon} />
              <MetricCard title="Partidos" value={stats.totalMatches} icon={Calendar} />

              <div className="col-span-full grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6 max-md:gap-3 max-md:mt-0">
                <div className="lg:col-span-2 bg-[#161B22] border border-[#30363D] p-6 rounded-xl max-md:p-4 max-md:min-w-0">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B949E] mb-8 max-md:mb-4">Tendencia de Rendimiento</h3>
                  <div className="h-[300px] max-md:h-[220px] max-md:-ml-4">
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

                <div className="bg-[#161B22] border border-[#30363D] p-6 rounded-xl flex flex-col max-md:p-4">
                  <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B949E] mb-8 max-md:mb-4">Historial de resultados</h3>
                  <div className="flex-1 flex flex-col justify-center gap-6 max-md:gap-4">
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
                        className="w-full bg-[#0A0C10] border border-[#30363D] rounded-lg pl-9 pr-4 py-1.5 text-xs focus:outline-none focus:border-[#238636] transition-colors text-[#E1E4E8] max-md:py-2.5 max-md:text-sm"
                      />
                    </div>
                    <button
                      onClick={() => setShowFilters(!showFilters)}
                      className={`flex items-center gap-2 p-1.5 px-3 text-xs rounded-lg transition-colors border max-md:p-2.5 max-md:px-3.5 ${showFilters ? 'bg-[#238636] text-white border-[#238636]' : 'text-[#8B949E] hover:text-[#E1E4E8] border-[#30363D]'}`}
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
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs max-md:py-2 max-md:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Asist. Mín.</label>
                        <input 
                          type="number" min="0" value={filters.minAssists} 
                          onChange={e => setFilters({...filters, minAssists: Number(e.target.value)})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs max-md:py-2 max-md:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Calificación mín.</label>
                        <input 
                          type="number" min="0" max="10" step="0.5" value={filters.minRating} 
                          onChange={e => setFilters({...filters, minRating: Number(e.target.value)})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-xs max-md:py-2 max-md:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Desde</label>
                        <input 
                          type="date" value={filters.startDate} 
                          onChange={e => setFilters({...filters, startDate: e.target.value})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-[10px] max-md:py-2 max-md:text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-[#8B949E] uppercase">Hasta</label>
                        <input 
                          type="date" value={filters.endDate} 
                          onChange={e => setFilters({...filters, endDate: e.target.value})}
                          className="w-full bg-[#0A0C10] border border-[#30363D] rounded px-2 py-1 text-[10px] max-md:py-2 max-md:text-sm"
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
                <div className="p-6 border-b border-[#30363D] flex items-center justify-between bg-[#0D1117] max-md:p-4 max-md:gap-2">
                  <h3 className="text-xl font-bold text-white uppercase tracking-tight max-md:text-base">
                    {format(currentMonth, 'MMMM yyyy')}
                  </h3>
                  <div className="flex gap-2 max-md:shrink-0">
                    <button 
                      onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                      className="p-2 hover:bg-[#30363D] rounded-lg text-[#8B949E] hover:text-white transition-colors border border-[#30363D]"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => { setCurrentMonth(new Date()); setSelectedDay(new Date()); }}
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
                <div className="p-4 bg-[#0D1117]/50 max-md:p-2 max-md:pb-0">
                  <div className="grid grid-cols-7 mb-2 max-md:mb-1">
                    {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                      <div key={day} className="text-center py-2 text-[10px] font-mono text-[#8B949E] uppercase tracking-widest font-bold max-md:tracking-normal">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-px bg-[#30363D] border border-[#30363D] rounded-lg overflow-hidden max-md:hidden">
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
                        const dayBookings = venueBookings.filter((b:any) => b.date === format(day, 'yyyy-MM-dd'));

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
                              {dayBookings.map((b:any) => (
                                <div key={b.id} className="w-full text-left p-1 rounded text-[9px] font-bold text-white bg-[#238636] truncate shadow-sm" title={`${b.format} · ${b.complexName} · ${b.courtName}`}>
                                  {b.startTime} · {b.format} · {b.complexName}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Calendario mobile: grilla compacta con puntos + detalle del día elegido */}
                {(() => {
                  const monthStart = startOfMonth(currentMonth);
                  const calendarDays = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(endOfMonth(monthStart)) });
                  const matchesOn = (day: Date) => matches.filter(m => {
                    const mDate = m.date instanceof Timestamp ? m.date.toDate() : m.date;
                    return mDate instanceof Date && isSameDay(mDate, day);
                  });
                  const bookingsOn = (day: Date) => venueBookings.filter((b: any) => b.date === format(day, 'yyyy-MM-dd'));
                  const resultOf = (m: MatchEntry) => m.scoreFor > m.scoreAgainst ? 'W' : m.scoreFor < m.scoreAgainst ? 'L' : 'D';
                  const dotColor = (r: string) => r === 'W' ? 'bg-[#238636]' : r === 'L' ? 'bg-[#f85149]' : 'bg-[#d29922]';
                  const selMatches = matchesOn(selectedDay);
                  const selBookings = bookingsOn(selectedDay).sort((a: any, b: any) => String(a.startTime).localeCompare(String(b.startTime)));
                  const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

                  return (
                    <div className="md:hidden">
                      <div className="grid grid-cols-7 gap-1 px-2 pb-3 bg-[#0D1117]/50">
                        {calendarDays.map((day, idx) => {
                          const dm = matchesOn(day);
                          const dayB = bookingsOn(day);
                          const isSelected = isSameDay(day, selectedDay);
                          const isToday = isSameDay(day, new Date());
                          return (
                            <button
                              key={idx}
                              onClick={() => { setSelectedDay(day); if (!isSameMonth(day, monthStart)) setCurrentMonth(day); }}
                              className={`h-12 rounded-lg flex flex-col items-center justify-center gap-1 border transition-colors ${isSelected ? 'border-[#238636] bg-[#238636]/15' : 'border-transparent bg-[#0D1117]'} ${!isSameMonth(day, monthStart) ? 'opacity-30' : ''}`}
                              aria-label={`${format(day, 'd/M/yyyy')}: ${dm.length} partidos, ${dayB.length} reservas`}
                            >
                              <span className={`text-xs font-mono leading-none ${isToday ? 'bg-[#238636] text-white px-1.5 py-0.5 rounded-full' : isSelected ? 'text-white font-bold' : 'text-[#8B949E]'}`}>
                                {format(day, 'd')}
                              </span>
                              <span className="flex gap-0.5 h-1.5">
                                {dm.slice(0, 3).map(m => <span key={m.id} className={`w-1.5 h-1.5 rounded-full ${dotColor(resultOf(m))}`} />)}
                                {dayB.slice(0, Math.max(0, 3 - dm.length)).map((b: any) => <span key={b.id} className="w-1.5 h-1.5 rounded-full bg-[#58A6FF]" />)}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div className="border-t border-[#30363D] p-4 space-y-2">
                        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#8B949E]">
                          {weekDays[selectedDay.getDay()]} {format(selectedDay, 'd/M/yyyy')}
                        </p>
                        {selMatches.length === 0 && selBookings.length === 0 && (
                          <p className="text-sm text-[#8B949E] py-2">Sin partidos ni reservas este día.</p>
                        )}
                        {selBookings.map((b: any) => (
                          <div key={b.id} className="flex items-center gap-3 bg-[#0D1117] border border-[#30363D] rounded-xl p-3">
                            <div className="w-1 self-stretch rounded-full bg-[#58A6FF]" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-white">{b.startTime}{b.endTime ? ` – ${b.endTime}` : ''} · {b.format}</p>
                              <p className="text-xs text-[#8B949E] truncate">{b.complexName} · {b.courtName}</p>
                            </div>
                            <MapPin className="w-4 h-4 text-[#8B949E] shrink-0" />
                          </div>
                        ))}
                        {selMatches.map(m => {
                          const r = resultOf(m);
                          return (
                            <button key={m.id} onClick={() => handleEditMatch(m)} className="w-full flex items-center gap-3 bg-[#0D1117] border border-[#30363D] rounded-xl p-3 text-left active:border-[#484f58]">
                              <span className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center text-xs font-black text-white ${dotColor(r)}`}>{r}</span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-white truncate">vs {m.opponent || 'Casual Match'}</p>
                                <p className="text-xs text-[#8B949E]">{m.scoreFor}-{m.scoreAgainst} · {m.goals} G · {m.assists} A · Calif. {Number(m.rating || 0).toFixed(1)}</p>
                              </div>
                              <Edit2 className="w-4 h-4 text-[#8B949E] shrink-0" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

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
                  <div className="flex items-center gap-2 md:hidden">
                    <div className="w-3 h-3 rounded bg-[#58A6FF]" />
                    <span className="text-[10px] font-mono text-[#8B949E] uppercase">Reserva</span>
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
                <div className="p-8 border-b border-[#30363D] bg-[#0D1117] max-md:p-5">
                  <div className="flex flex-col sm:flex-row items-center gap-6 max-md:flex-col max-md:gap-3">
                    <div className="w-24 h-24 rounded-full border-4 border-[#30363D] overflow-hidden bg-[#0A0C10] flex-shrink-0 max-md:w-20 max-md:h-20">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt="Perfil" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#8B949E]">
                          <UserIcon className="w-12 h-12" />
                        </div>
                      )}
                    </div>
                    <div className="text-center sm:text-left max-md:text-center max-md:min-w-0 max-md:w-full">
                      <h3 className="text-2xl font-bold text-white mb-1 max-md:text-xl">{profile.displayName}</h3>
                      <p className="text-[#8B949E] font-mono text-sm uppercase tracking-wider max-md:text-xs max-md:break-all">{profile.email}</p>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleUpdateProfile} className="p-8 space-y-8 max-md:p-5 max-md:space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-mono text-[#8B949E] uppercase tracking-widest pl-1 font-bold">Nombre de Jugador</label>
                    <input 
                      type="text"
                      value={profile.displayName}
                      onChange={(e) => setProfile({...profile, displayName: e.target.value})}
                      className="w-full bg-[#0A0C10] border-2 border-[#30363D] focus:border-[#238636] rounded-xl px-4 py-3 text-[#E1E4E8] outline-none transition-all font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-md:gap-5">
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

                {/* Mobile: cerrar sesión (en escritorio está en la barra lateral) */}
                <div className="md:hidden px-5 pb-5">
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full py-3 rounded-xl border border-[#30363D] text-[#f85149] font-bold flex items-center justify-center gap-2 active:bg-[#f85149]/10"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal Add Match */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 max-md:items-end max-md:p-0">
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
                className="relative w-full max-w-2xl bg-[#161B22] border border-[#30363D] shadow-2xl rounded-2xl overflow-hidden max-md:rounded-b-none max-md:border-b-0"
              >
                <div className="p-6 border-b border-[#30363D] flex justify-between items-center bg-[#0D1117] max-md:p-4 max-md:pl-5">
                  <h3 className="text-xl font-bold uppercase tracking-tight text-white max-md:text-lg">
                    {editingMatch ? 'Editar Partido' : 'Registro de Partido'}
                  </h3>
                  <button onClick={() => { setIsAddModalOpen(false); setEditingMatch(null); }} aria-label="Cerrar" className="text-[#8B949E] hover:text-white transition-colors max-md:p-2 max-md:-m-2">
                    <X className="w-6 h-6" />
                  </button>
                </div>
                
                <form onSubmit={handleUpsertMatch} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar max-md:p-5 max-md:gap-y-5 max-md:max-h-[82vh] max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
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
                      <span>Calificación personal</span>
                      <span className="text-[#238636] font-bold">{formData.rating}</span>
                    </label>
                    <input 
                      type="range" min="1" max="10" step="0.5" 
                      value={formData.rating}
                      onChange={e => setFormData({...formData, rating: Number(e.target.value)})}
                      className="w-full accent-[#238636] cursor-pointer max-md:h-8"
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

      {/* Barra de navegación inferior (solo mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#161B22]/95 backdrop-blur border-t border-[#30363D] pb-[env(safe-area-inset-bottom)]" aria-label="Navegación principal">
        <div className="flex">
          <MobileNavItem icon={LayoutDashboard} label="Inicio" active={['dashboard', 'calendar', 'diary'].includes(activeTab)} onClick={() => setActiveTab('dashboard')} />
          <MobileNavItem icon={Users} label="Grupos" active={activeTab === 'groups'} onClick={() => setActiveTab('groups')} />
          <MobileNavItem icon={Swords} label="Rivales" active={activeTab === 'teamMatches'} onClick={() => setActiveTab('teamMatches')} />
          <MobileNavItem icon={MapPin} label="Canchas" active={activeTab === 'venues'} onClick={() => setActiveTab('venues')} />
          <MobileNavItem icon={UserIcon} label="Perfil" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
        </div>
      </nav>
    </div>
  );
}

function MobileNavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 min-w-0 flex flex-col items-center justify-center gap-1 pt-2 pb-1.5 min-h-[60px] transition-colors ${active ? 'text-[#7ee2a3]' : 'text-[#8B949E] active:text-[#E1E4E8]'}`}
    >
      <span className={`px-4 py-1 rounded-full transition-colors ${active ? 'bg-[#238636]/20' : ''}`}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wide truncate">{label}</span>
    </button>
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
          className="w-8 h-8 flex items-center justify-center hover:bg-[#161B22] rounded-md transition-colors text-[#8B949E] hover:text-[#E1E4E8] max-md:w-10 max-md:h-10 max-md:text-lg"
        >
          -
        </button>
        <span className="flex-1 text-center font-bold text-sm text-[#E1E4E8]">{value}</span>
        <button 
          type="button"
          onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)}
          className="w-8 h-8 flex items-center justify-center hover:bg-[#161B22] rounded-md transition-colors text-[#8B949E] hover:text-[#E1E4E8] max-md:w-10 max-md:h-10 max-md:text-lg"
        >
          +
        </button>
      </div>
    </div>
  );
}
