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
  ChevronDown
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

  const getTabs = () => {
    const role = currentUser.role;
    if (role === UserRole.ADMIN) {
      return [
        { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
        { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
        { id: 'warehouse', label: 'Ombor', icon: Package },
        { id: 'customers', label: 'Mijozlar', icon: Users },
        { id: 'reports', label: 'Hisobotlar', icon: BarChart3 },
        { id: 'settings', label: 'Sozlamalar', icon: Settings }
      ];
    } else if (role === UserRole.MANAGER) {
      return [
        { id: 'dashboard', label: 'Bosh sahifa', icon: LayoutDashboard },
        { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
        { id: 'warehouse', label: 'Ombor', icon: Package },
        { id: 'customers', label: 'Mijozlar', icon: Users },
        { id: 'reports', label: 'Hisobotlar', icon: BarChart3 }
      ];
    } else {
      // Seller
      return [
        { id: 'pos', label: 'Sotuv (POS)', icon: ShoppingCart },
        { id: 'warehouse', label: 'Ombor qoldiqlari', icon: Package },
        { id: 'customers', label: 'Mijozlar va Qarzlar', icon: Users }
      ];
    }
  };

  const tabs = getTabs();

  // If active tab is not in allowed list for the role, set it to the first available tab
  useEffect(() => {
    if (!tabs.find(t => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [currentUser, activeTab]);

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return { name: 'Admin', color: 'text-red-400 border-red-500/30 bg-red-500/10' };
      case UserRole.MANAGER:
        return { name: 'Menejer', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
      case UserRole.SELLER:
        return { name: 'Kassir', color: 'text-green-400 border-green-500/30 bg-green-500/10' };
      default:
        return { name: 'Xodim', color: 'text-slate-400 border-slate-500/30 bg-slate-500/10' };
    }
  };

  const roleLabel = getRoleLabel(currentUser.role);

  return (
    <>
      {/* Desktop Sidebar Navigation */}
      <aside className="hidden md:flex w-64 bg-[#0F172A] flex-col shrink-0 select-none border-r border-slate-800">
        {/* Brand / Logo Header */}
        <div className="p-6 border-b border-slate-700/50 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
            <Store className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-white font-bold text-lg tracking-tight truncate">
            {settings.storeName || 'Nukus POS'}
          </h1>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none outline-none ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
                }`}
              >
                <IconComponent className="w-5 h-5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Details */}
        <div className="p-4 border-t border-slate-700/50 relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none cursor-pointer text-left border-none bg-transparent"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-base shrink-0 border border-slate-600">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-sm text-white font-semibold leading-tight truncate">{currentUser.name}</p>
                <p className={`text-[10px] font-bold tracking-wide border rounded px-1.5 py-0.2 mt-1 inline-block ${roleLabel.color}`}>
                  {roleLabel.name}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute left-4 right-4 bottom-18 bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-40 ring-1 ring-black ring-opacity-5">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-400">Tizim foydalanuvchisi</p>
                  <p className="text-sm font-bold text-slate-800 truncate">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                </div>

                {/* Demo switch panel */}
                <div className="p-1 bg-slate-50 border-b border-slate-100">
                  <div className="px-3 py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                    Rollar o'rtasida o'tish (Demo)
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    {currentUser.role !== UserRole.ADMIN && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.ADMIN }));
                        }}
                        className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span>Admin rejimiga o'tish</span>
                      </button>
                    )}
                    {currentUser.role !== UserRole.MANAGER && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.MANAGER }));
                        }}
                        className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        <span>Menejer rejimiga o'tish</span>
                      </button>
                    )}
                    {currentUser.role !== UserRole.SELLER && (
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.SELLER }));
                        }}
                        className="px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>Kassir rejimiga o'tish</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center space-x-2 transition-colors cursor-pointer font-semibold border-none bg-transparent"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Top Navigation */}
      <nav className="md:hidden bg-[#0F172A] text-white w-full flex flex-col shrink-0 select-none border-b border-slate-850">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
              <Store className="h-4 w-4 text-white" />
            </div>
            <span className="font-extrabold text-sm tracking-tight text-white">
              {settings.storeName || 'Nukus POS'}
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer border-none bg-transparent"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile menu overlay / drawer */}
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />

            {/* Side Drawer */}
            <div className="fixed inset-y-0 left-0 z-55 w-72 max-w-[85vw] bg-[#0F172A] text-white shadow-2xl flex flex-col p-5 overflow-y-auto select-none">
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-5 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 shadow-md">
                    <Store className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-extrabold text-base tracking-tight text-white">
                    {settings.storeName || 'Nukus POS'}
                  </span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer border-none bg-transparent"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <nav className="flex-1 py-6 space-y-1.5">
                {tabs.map((tab) => {
                  const IconComponent = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none outline-none text-left ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-bold'
                          : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium bg-transparent'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Bottom Profile Details */}
              <div className="pt-4 border-t border-slate-800">
                <div className="px-3 py-2.5 bg-slate-900/40 rounded-xl border border-slate-800/60 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-sm shrink-0 border border-slate-600">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <p className="text-xs text-white font-bold leading-none truncate">{currentUser.name}</p>
                      <span className={`text-[9px] font-black tracking-wide border rounded px-1.5 py-0.2 mt-1.5 inline-block ${roleLabel.color}`}>
                        {roleLabel.name}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 truncate px-0.5">{currentUser.email}</div>
                </div>

                {/* Role Toggles inside mobile drawer (Demo) */}
                <div className="mb-4 bg-slate-900/30 rounded-lg p-2 border border-slate-800/40">
                  <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-1">
                    Demo rollar
                  </div>
                  <div className="flex flex-col space-y-0.5">
                    {currentUser.role !== UserRole.ADMIN && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.ADMIN }));
                        }}
                        className="px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                        <span>Admin</span>
                      </button>
                    )}
                    {currentUser.role !== UserRole.MANAGER && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.MANAGER }));
                        }}
                        className="px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                        <span>Menejer</span>
                      </button>
                    )}
                    {currentUser.role !== UserRole.SELLER && (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          window.dispatchEvent(new CustomEvent('demo-switch-role', { detail: UserRole.SELLER }));
                        }}
                        className="px-2.5 py-1.5 text-left text-[11px] text-slate-300 hover:text-white hover:bg-slate-800 rounded flex items-center space-x-1.5 w-full cursor-pointer font-medium border-none bg-transparent"
                      >
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        <span>Kassir</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg flex items-center space-x-2.5 transition-colors cursor-pointer font-bold border-none bg-transparent"
                >
                  <LogOut className="h-4.5 w-4.5" />
                  <span>Tizimdan chiqish</span>
                </button>
              </div>
            </div>
          </>
        )}
      </nav>
    </>
  );
}
