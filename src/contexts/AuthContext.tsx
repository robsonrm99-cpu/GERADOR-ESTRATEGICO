import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CustomUser {
  uid: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: CustomUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (name: string, email: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CustomUser | null>(() => {
    const saved = localStorage.getItem('valoriza_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAdmin, setIsAdmin] = useState<boolean>(() => {
    const saved = localStorage.getItem('valoriza_isAdmin');
    return saved === 'true';
  });

  const [loading] = useState(false);

  useEffect(() => {
    if (user) {
      const cleanEmail = user.email.toLowerCase();
      const isAdm = cleanEmail === 'robson.rm99@gmail.com';
      if (isAdm !== isAdmin) {
        setIsAdmin(isAdm);
        localStorage.setItem('valoriza_isAdmin', String(isAdm));
      }
    }
  }, [user]);

  const login = async (name: string, email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = name.trim();
      const uid = 'user_' + cleanEmail.replace(/[^a-z0-9]/g, '_');
      
      const role = cleanEmail === 'robson.rm99@gmail.com' ? 'admin' : 'user';
      
      // Store user list locally in a mock DB
      const usersRaw = localStorage.getItem('valoriza_users_db');
      let localUsers = usersRaw ? JSON.parse(usersRaw) : {};
      
      let finalName = cleanName;
      let finalRole = role;

      if (!localUsers[uid]) {
        localUsers[uid] = {
          uid,
          email: cleanEmail,
          name: cleanName,
          role: role,
          createdAt: new Date().toISOString()
        };
        localStorage.setItem('valoriza_users_db', JSON.stringify(localUsers));
      } else {
        const storedUser = localUsers[uid];
        finalName = storedUser.name || cleanName;
        finalRole = storedUser.role || role;
      }

      const isAdm = finalRole === 'admin';
      const loggedUser: CustomUser = {
        uid,
        email: cleanEmail,
        displayName: finalName
      };

      setUser(loggedUser);
      setIsAdmin(isAdm);
      
      localStorage.setItem('valoriza_user', JSON.stringify(loggedUser));
      localStorage.setItem('valoriza_isAdmin', String(isAdm));
      
      return true;
    } catch (error) {
      console.error("Login process failed:", error);
      return false;
    }
  };

  const logout = async () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('valoriza_user');
    localStorage.removeItem('valoriza_isAdmin');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, login, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
