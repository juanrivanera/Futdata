export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  birthDate?: string;
  positions?: string[];
  favoriteTeam?: string;
  myTeams?: string[];
  createdAt?: any;
}

export interface MatchEntry {
  id: string;
  date: any; // Firestore Timestamp
  opponent?: string;
  goals: number;
  assists: number;
  scoreFor: number;
  scoreAgainst: number;
  rating: number;
  yellowCards: number;
  redCards: number;
  injury: boolean;
  notes?: string;
  createdAt: any;
  updatedAt: any;
  userId: string;
}

export interface PlayerStats {
  totalMatches: number;
  totalGoals: number;
  totalAssists: number;
  avgRating: number;
  wins: number;
  draws: number;
  losses: number;
}
