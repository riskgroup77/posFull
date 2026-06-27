import React, { useState, useEffect } from 'react';
import { User, UserRole, StoreSettings } from '../types';
import {
  Store,
  LogOut,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Menu,
  X,
  ChevronDown,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  settings: StoreSettings;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Navbar({ currentUser, settings, activeTab, setActiveTab, onLogout }: NavbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const getTabs = () => {
    const role = currentUser.role;
    if (role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
        { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
        { id: 'warehouse', label: 'Ombor', icon: Package },
        { id: 'customers', label: 'Mijozlar', icon: Users },
        { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
        { id: 'settings', label: 'Sozlamalar', icon: Settings },
      ];
    }
    if (role === UserRole.MANAGER) {
      return [
        { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
        { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
        { id: 'warehouse', label: 'Ombor', icon: Package },
        { id: 'customers', label: 'Mijozlar', icon: Users },
        { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
      ];
    }
    return [
      { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
      { id: 'warehouse', label: 'Ombor qoldiqlari', icon: Package },
      { id: 'customers', label: 'Mijozlar va Qarzlar', icon: Users },
    ];
  };

  const tabs = getTabs();

  useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [currentUser, activeTab, tabs, setActiveTab]);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { name: 'Admin', color: 'text-red-600 bg-red-50 border-red-100' };
      case UserRole.MANAGER:
        return { name: 'Menejer', color: 'text-amber-600 bg-amber-50 border-amber-100' };
      case UserRole.SELLER:
        return { name: 'Kassir', color: 'text-emerald-600 bg-emerald-50 border-emerald-100' };
      default:
        return { name: 'Xodim', color: 'text-slate-600 bg-slate-50 border-slate-100' };
    }
  };

  const roleLabel = getRoleLabel(currentUser.role);

  const navButton = (tab: { id: string; label: string; icon: React.ComponentType<{ className?: string }> }, onClick?: () => void) => {
    const IconComponent = tab.icon;
    const isActive = activeTab === tab.id;
    return (
      <button
        key={tab.id}
        onClick={() => {
          setActiveTab(tab.id);
          onClick?.();
        }}
        className={`pos-nav-item ${isActive ? 'pos-nav-item-active' : 'pos-nav-item-inactive'}`}
      >
        <IconComponent className="w-[18px] h-[18px] shrink-0" />
        <span>{tab.label}</span>
      </button>
    );
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[260px] bg-white flex-col shrink-0 select-none border-r border-slate-200/80 shadow-sm">
        <div className="px-5 py-5 border-b border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">
            <Store className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-slate-900 font-bold text-base tracking-tight truncate leading-tight">
              {settings.storeName || 'Nukus POS'}
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Savdo tizimi</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {tabs.map((tab) => navButton(tab))}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-2">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors focus:outline-none cursor-pointer text-left border border-transparent hover:border-slate-100 bg-transparent"
            >
              <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div className="truncate min-w-0">
                  <p className="text-sm text-slate-800 font-semibold leading-tight truncate">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
                <div className="absolute left-0 right-0 bottom-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-40">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Profil</p>
                    <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                    <span className={`text-[10px] font-bold border rounded-md px-1.5 py-0.5 mt-1 inline-block ${roleLabel.color}`}>
                      {roleLabel.name}
                    </span>
                  </div>

                  <div className="p-1.5 bg-slate-50/80 border-b border-slate-100">
                    <div className="px-2 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                      Rollar (Demo)
                    </div>
                    {currentUser.role !== UserRole.ADMIN && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.ADMIN }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-white rounded-lg flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Admin
                      </button>
                    )}
                    {currentUser.role !== UserRole.MANAGER && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.MANAGER }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-white rounded-lg flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        Menejer
                      </button>
                    )}
                    {currentUser.role !== UserRole.SELLER && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.SELLER }));
                        }}
                        className="w-full px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-white rounded-lg flex items-center gap-1.5 cursor-pointer border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Kassir
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer font-semibold border-none bg-transparent rounded-b-xl"
                  >
                    <LogOut className="h-4 w-4" />
                    Chiqish
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between px-2 py-1">
            <button
              type="button"
              onClick={() => setDarkMode(false)}
              className={`p-1.5 rounded-lg transition-colors border-none cursor-pointer ${!darkMode ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Sun className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setDarkMode(true)}
              className={`p-1.5 rounded-lg transition-colors border-none cursor-pointer ${darkMode ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:bg-slate-50'}`}
            >
              <Moon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <nav className="md:hidden bg-white w-full flex flex-col shrink-0 select-none border-b border-slate-200 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              {settings.storeName || 'Nukus POS'}
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg cursor-pointer border-none bg-transparent"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-[60] w-72 max-w-[85vw] bg-white shadow-2xl flex flex-col overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Store className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-slate-900">Nukus POS</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:bg-slate-50 rounded-lg border-none bg-transparent cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 p-3 space-y-0.5">
                {tabs.map((tab) => navButton(tab, () => setMobileMenuOpen(false)))}
              </nav>

              <div className="p-4 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-3">
                  <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{currentUser.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 font-semibold border border-red-100 bg-transparent cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Chiqish
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
