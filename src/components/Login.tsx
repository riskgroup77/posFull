import React, { useState } from 'react';
import { User } from '../types';
import { login } from '../api';
import { ApiError } from '../api/client';
import { Lock, Mail, Store, AlertCircle } from 'lucide-react';
import AppFooter from './AppFooter';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex flex-col font-sans">
      <div className="flex-1 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-600/25">
              <Store className="h-7 w-7 text-white" />
            </div>
            <div>
              <span className="text-2xl font-extrabold tracking-tight text-slate-900 block leading-tight">Nukus POS</span>
              <span className="text-xs text-slate-500 font-medium">Savdo va Ombor Boshqaruvi</span>
            </div>
          </div>
          <h2 className="mt-8 text-center text-xl font-bold tracking-tight text-slate-800">
            Tizimga kirish
          </h2>
          <p className="mt-1.5 text-center text-sm text-slate-500">
            Hisobingizga kiring va ishni boshlang
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white/90 backdrop-blur-sm py-8 px-5 shadow-xl shadow-slate-200/50 sm:rounded-2xl sm:px-10 border border-white/80">
            {error && (
              <div className="mb-5 bg-red-50 border border-red-100 p-4 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="text-sm text-red-700 font-medium">{error}</div>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  E-pochta manzili
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
                    className="pos-input pl-11"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Parol
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
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
                    className="pos-input pl-11"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLocked || loading}
                className="w-full pos-btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                {loading ? 'Kirish...' : 'Kirish'}
              </button>
            </form>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
