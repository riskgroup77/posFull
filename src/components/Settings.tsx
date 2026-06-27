import React, { useState } from 'react';
import { StoreSettings, User } from '../types';
import { 
  Settings, 
  Users, 
  Trash2, 
  Save, 
  Shield, 
  Lock, 
  FileText, 
  Plus, 
  UserX, 
  AlertTriangle,
  RefreshCw,
  Info
} from 'lucide-react';

interface SettingsProps {
  settings: StoreSettings;
  users: User[];
  currentUser: User;
  onUpdateSettings: (settings: StoreSettings) => void;
  onAddUser: (user: User, password: string) => void;
  onUpdateUser: (user: User) => void;
  onClearAllData: () => void;
}

export default function SettingsComponent({
  settings,
  users,
  currentUser,
  onUpdateSettings,
  onAddUser,
  onUpdateUser,
  onClearAllData
}: SettingsProps) {
  // Navigation tabs within Settings
  const [tab, setTab] = useState<'store' | 'users' | 'security' | 'database'>('store');

  // Store form field state
  const [storeName, setStoreName] = useState(settings.storeName);
  const [address, setAddress] = useState(settings.address || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [taxRate, setTaxRate] = useState(String(settings.taxRateDefault));
  const [receiptFooter, setReceiptFooter] = useState(settings.receiptFooter || '');
  const [defaultLimit, setDefaultLimit] = useState(String(settings.defaultDebtLimit));
  const [minStockDefault, setMinStockDefault] = useState(String(settings.minStockThresholdDefault));

  // Staff creation form state
  const [staffName, setStaffName] = useState('');
  const [staffUsername, setStaffUsername] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState<'admin' | 'manager' | 'seller'>('seller');

  const handleUpdateStoreSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    onUpdateSettings({
      ...settings,
      storeName: storeName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      taxRateDefault: parseFloat(taxRate) || 0,
      receiptFooter: receiptFooter.trim(),
      defaultDebtLimit: parseFloat(defaultLimit) || 0,
      minStockThresholdDefault: parseFloat(minStockDefault) || 5
    });

    alert("Tizim sozlamalari muvaffaqiyatli saqlandi!");
  };

  const handleCreateStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffName.trim() || !staffUsername.trim() || !staffPassword.trim()) {
      alert("Iltimos, barcha maydonlarni to'ldiring!");
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.email.toLowerCase() === staffUsername.toLowerCase());
    if (exists) {
      alert("Xato: Bunday loginli xodim allaqachon mavjud!");
      return;
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      name: staffName.trim(),
      email: staffUsername.trim().toLowerCase(),
      role: staffRole,
      status: 'active'
    };

    onAddUser(newUser, staffPassword);
    setStaffName('');
    setStaffUsername('');
    setStaffPassword('');
    alert("Yangi xodim qo'shildi va faollashtirildi!");
  };

  const handleToggleUserStatus = (user: User) => {
    if (user.id === currentUser.id) {
      alert("Xatolik: O'zingizning holatingizni o'zgartira olmaysiz!");
      return;
    }

    const newStatus = user.status === 'active' ? 'blocked' : 'active';
    onUpdateUser({
      ...user,
      status: newStatus
    });
    alert(`Xodim holati ${newStatus === 'active' ? 'Faol' : 'Bloklangan'} deb belgilandi.`);
  };

  const handleResetSimulatedDb = () => {
    if (currentUser.role !== 'admin') {
      alert("Xato: Faqat administrator ma'lumotlarni tozalashi mumkin!");
      return;
    }

    const firstCheck = confirm("DIQQAT! Barcha kiritilgan savdolar, tovarlar, qarzdorlar va hisobotlar to'liq o'chiriladi va boshlang'ich holatiga qaytariladi! Ishonchingiz komilmi?");
    if (firstCheck) {
      const secondCheck = confirm("Ushbu harakat butunlay qaytarilmasdir! Haqiqatdan ham davom etishni xohlaysizmi?");
      if (secondCheck) {
        onClearAllData();
        alert("Barcha ma'lumotlar tozalandi!");
      }
    }
  };

  return (
    <div className="w-full max-w-full py-6 font-sans space-y-6 select-none">
      
      {/* Title */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-4">
        <Settings className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Tizim & Do'kon Sozlamalari</h1>
          <p className="text-slate-500 text-sm mt-0.5">Xodimlar ruxsatlari, soliq stavkalari, chek sozlamalari va ma'lumotlar bazasi boshqaruvi.</p>
        </div>
      </div>

      {/* Grid: left tabs menu, right configurations */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Left tabs (1/4 col) */}
        <div className="space-y-1.5 md:col-span-1">
          <button
            onClick={() => setTab('store')}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left flex items-center space-x-2 cursor-pointer transition-colors ${
              tab === 'store' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Settings className="h-4 w-4 shrink-0" />
            <span>Do'kon Sozlamalari</span>
          </button>
          
          <button
            onClick={() => setTab('users')}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left flex items-center space-x-2 cursor-pointer transition-colors ${
              tab === 'users' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="h-4 w-4 shrink-0" />
            <span>Xodimlar & Rollar</span>
          </button>

          <button
            onClick={() => setTab('security')}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left flex items-center space-x-2 cursor-pointer transition-colors ${
              tab === 'security' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Shield className="h-4 w-4 shrink-0" />
            <span>Huquqlar Matritsasi</span>
          </button>

          <button
            onClick={() => setTab('database')}
            className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold text-left flex items-center space-x-2 cursor-pointer transition-colors ${
              tab === 'database' ? 'bg-blue-600 text-white shadow-sm' : 'bg-white border text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            <span>Ma'lumotlar Boshqaruvi</span>
          </button>
        </div>

        {/* Right content view (3/4 cols) */}
        <div className="md:col-span-3">
          
          {/* TAB 1: DO'KON SOZLAMALARI */}
          {tab === 'store' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-black text-slate-800 flex items-center space-x-1 border-b pb-3">
                <Settings className="h-5 w-5 text-blue-600" />
                <span>Do'kon asosiy parametrlari</span>
              </h3>

              <form onSubmit={handleUpdateStoreSettings} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Savdo nuqtasi nomi *</label>
                    <input
                      type="text"
                      required
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Muloqot telefoni</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Yuridik manzil</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Soliq stavkasi (%) (VAT)</label>
                    <input
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Boshlang'ich nasiya limiti (so'm)</label>
                    <input
                      type="number"
                      value={defaultLimit}
                      onChange={(e) => setDefaultLimit(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Kam qolganlik ogohlantirish chegarasi (dona)</label>
                    <input
                      type="number"
                      value={minStockDefault}
                      onChange={(e) => setMinStockDefault(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Sotuv cheki pastki qismi yozuvi (Footer text)</label>
                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) => setReceiptFooter(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-500"
                    placeholder="Xaridingiz uchun tashakkur! Savdo cheki nusxasini saqlang."
                  />
                </div>

                {currentUser.role !== 'seller' ? (
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer flex items-center space-x-1 transition-colors"
                  >
                    <Save className="h-4 w-4" />
                    <span>Sozlamalarni Saqlash</span>
                  </button>
                ) : (
                  <p className="text-[11px] text-amber-600 font-bold bg-amber-50 p-2 border border-amber-100 rounded-lg">
                    Sotuvchi (seller) darajasidagi xodimlarga do'kon sozlamalarini o'zgartirish ruxsat etilmaydi.
                  </p>
                )}
              </form>
            </div>
          )}

          {/* TAB 2: XODIMLAR & ROLLAR */}
          {tab === 'users' && (
            <div className="space-y-6">
              
              {/* Create Staff (only admin) */}
              {currentUser.role === 'admin' && (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
                  <h3 className="text-sm font-black text-slate-800 flex items-center space-x-1">
                    <Plus className="h-5 w-5 text-blue-600" />
                    <span>Yangi xodimni ro'yxatdan o'tkazish</span>
                  </h3>

                  <form onSubmit={handleCreateStaff} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Ism va familiya *</label>
                      <input
                        type="text"
                        required
                        placeholder="Masalan: Sardor Alimov"
                        value={staffName}
                        onChange={(e) => setStaffName(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Foydalanuvchi logini *</label>
                      <input
                        type="text"
                        required
                        placeholder="sardor1"
                        value={staffUsername}
                        onChange={(e) => setStaffUsername(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Parol *</label>
                      <input
                        type="password"
                        required
                        placeholder="••••••"
                        value={staffPassword}
                        onChange={(e) => setStaffPassword(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Lavozim huquqi</label>
                      <select
                        value={staffRole}
                        onChange={(e) => setStaffRole(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-bold focus:outline-none"
                      >
                        <option value="seller">Sotuvchi (Seller)</option>
                        <option value="manager">Menejer (Manager)</option>
                        <option value="admin">Administrator (Admin)</option>
                      </select>
                    </div>
                    
                    <button
                      type="submit"
                      className="sm:col-span-4 w-full sm:w-fit px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg cursor-pointer"
                    >
                      Xodimni Yaratish
                    </button>
                  </form>
                </div>
              )}

              {/* Staff Table */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-slate-50">
                  <span className="text-xs font-bold text-slate-800">Tizim foydalanuvchilari ro'yxati</span>
                </div>
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
                  <thead className="bg-slate-100 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-6 py-3">Xodim ismi</th>
                      <th className="px-6 py-3 hidden sm:table-cell">Login</th>
                      <th className="px-6 py-3">Roli</th>
                      <th className="px-6 py-3 hidden sm:table-cell">Holat</th>
                      {currentUser.role === 'admin' && <th className="px-6 py-3 text-center">Amal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <span className="font-extrabold text-slate-900 block">{u.name}</span>
                          <span className="text-[10px] text-slate-400 block sm:hidden font-mono">{u.email}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-[11px] text-slate-500 hidden sm:table-cell">{u.email}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border capitalize ${
                            u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-100' :
                            u.role === 'manager' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                            'bg-green-50 text-green-700 border-green-100'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 hidden sm:table-cell">
                          <span className={`inline-block h-2 w-2 rounded-full mr-1 ${u.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          <span className="text-slate-600">{u.status === 'active' ? 'Faol' : 'Bloklangan'}</span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                                u.id === currentUser.id ? 'opacity-30 cursor-not-allowed bg-slate-100 text-slate-400' :
                                u.status === 'active' ? 'bg-rose-50 text-rose-700 border-rose-100 hover:bg-rose-100' :
                                'bg-green-50 text-green-700 border-green-100 hover:bg-green-100'
                              }`}
                              disabled={u.id === currentUser.id}
                            >
                              {u.status === 'active' ? 'Bloklash' : 'Aktivlashtirish'}
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: ROLE PERMISSIONS MATRIX */}
          {tab === 'security' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center space-x-1.5 border-b pb-3">
                <Lock className="h-5 w-5 text-blue-600" />
                <span>Ruxsatlar va Huquqlar Matritsasi</span>
              </h3>

              <div className="overflow-x-auto border rounded-xl">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
                  <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-5 py-3">Modul ruxsati / Amal turi</th>
                      <th className="px-5 py-3 text-center">Admin</th>
                      <th className="px-5 py-3 text-center">Menejer</th>
                      <th className="px-5 py-3 text-center">Sotuvchi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">POS oynasida sotuv qilish & kvitansiya chop etish</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Nasiya (qarz) to'lovini qabul qilish va hisobdan tushirish</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Chegirmalar kiritish (maksimal chegarasiz)</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Limitli</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Omborga yangi mahsulot va kirim qo'shish</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Mijozlar limiti va uning sozlamalarini o'zgartirish</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Sotilgan tovarlar foyda-zarar tahlili (Finance)</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                    </tr>
                    <tr className="hover:bg-slate-50/40">
                      <td className="px-5 py-3">Barcha ma'lumotlarni o'chirish / Tizimni nollash</td>
                      <td className="px-5 py-3 text-center text-green-600">✓ Ruxsat</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                      <td className="px-5 py-3 text-center text-red-500">✗ Taqiqlangan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: DATABASE / WIPE DATA */}
          {tab === 'database' && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-6">
              <h3 className="text-sm font-black text-rose-800 flex items-center space-x-1 border-b pb-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <span>Xavfli Sozlamalar & Nollash</span>
              </h3>

              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-2 text-xs text-rose-800">
                <span className="font-bold flex items-center">
                  <Info className="h-4 w-4 mr-1 shrink-0 text-rose-600" />
                  Diqqat qiling: Ushbu amal qaytarilmas!
                </span>
                <p>Tizimni dastlabki toza holatiga qaytarish (Barcha savdolar, nasiyalar, xaridlar va tahrirlangan mahsulotlar o'chib ketadi, faqat default test ma'lumotlari qoladi). Faqat sinov va test maqsadlarida foydalaning.</p>
              </div>

              {currentUser.role === 'admin' ? (
                <button
                  onClick={handleResetSimulatedDb}
                  className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer flex items-center space-x-1.5 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Barcha ma'lumotlarni o'chirish (Reset DB)</span>
                </button>
              ) : (
                <div className="bg-slate-50 p-4 border rounded-xl text-center text-slate-400 text-xs font-bold">
                  Ushbu amaldan foydalanish uchun sizga "admin" lavozimi talab etiladi. Hozirgi profilingiz: "{currentUser.role}"
                </div>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
