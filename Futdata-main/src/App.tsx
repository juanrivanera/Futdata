/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { auth, db, loginWithGoogle, logout, loginComplexAccount } from './lib/firebase';
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
