import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { login } from '../api';
import { ApiError } from '../api/client';
import { Lock, Mail, Store, AlertCircle, ShieldAlert } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

const QUICK_CREDENTIALS: Record<UserRole, { email: string; password: string }> = {
  [UserRole.ADMIN]: { email: 'admin@pos.uz', password: 'admin123' },
  [UserRole.MANAGER]: { email: 'manager@pos.uz', password: 'manager123' },
  [UserRole.SELLER]: { email: 'seller@pos.uz', password: 'seller123' },
};

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);

  const doLogin = async (loginEmail: string, loginPassword: string) => {
    if (isLocked) {
      setError("Tizim vaqtincha bloklangan (Urinishlar soni ko'payib ketdi).");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const user = await login(loginEmail.trim().toLowerCase(), loginPassword);
      onLoginSuccess(user);
    } catch (err) {
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      if (nextAttempts >= 3) {
        setIsLocked(true);
        setError("Noto'g'ri parol! 3 marta xato kiritildi. Tizim vaqtincha qulflanadi.");
      } else {
        const msg = err instanceof ApiError ? err.message : 'Kirishda xatolik';
        setError(`${msg}. Qolgan urinishlar: ${3 - nextAttempts}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  const handleQuickLogin = (role: UserRole) => {
    const creds = QUICK_CREDENTIALS[role];
    doLogin(creds.email, creds.password);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center space-x-3 text-blue-600">
          <Store className="h-12 w-12" />
          <span className="text-3xl font-extrabold tracking-tight text-slate-900">Nukus POS</span>
        </div>
        <h2 className="mt-6 text-center text-2xl font-bold tracking-tight text-slate-800">
          Tizimga kirish
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Savdo va Ombor Boshqaruv Tizimi
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-md sm:rounded-xl sm:px-10 border border-slate-100">
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div className="text-sm text-red-700 font-medium">{error}</div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                E-pochta manzili
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="text"
                  required
                  placeholder="seller@pos.uz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Parol
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLocked || loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50"
              >
                {loading ? 'Kirish...' : 'Kirish'}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs text-slate-500 uppercase">
                <span className="bg-white px-2">Tezkor kirish</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(UserRole.ADMIN)}
                className="flex flex-col items-center justify-center p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-xs font-semibold hover:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <ShieldAlert className="h-5 w-5 text-red-500 mb-1" />
                Admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(UserRole.MANAGER)}
                className="flex flex-col items-center justify-center p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-xs font-semibold hover:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Store className="h-5 w-5 text-amber-500 mb-1" />
                Menejer
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin(UserRole.SELLER)}
                className="flex flex-col items-center justify-center p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-700 text-xs font-semibold hover:border-blue-500 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Lock className="h-5 w-5 text-green-500 mb-1" />
                Sotuvchi
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
