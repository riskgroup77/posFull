import React, { useState, useMemo } from 'react';
import { Customer, Debt, DebtPayment, User, StoreSettings, Sale } from '../types';
import { 
  Users, 
  UserPlus, 
  Phone, 
  MapPin, 
  AlertCircle, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  History, 
  X, 
  Edit, 
  Search, 
  PlusCircle, 
  TrendingUp, 
  ChevronRight,
  Printer
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  sales: Sale[];
  currentUser: User;
  settings: StoreSettings;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onRepayDebt: (customerId: string, amount: number) => void;
}

export default function Customers({
  customers,
  debts,
  debtPayments,
  sales,
  currentUser,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onRepayDebt
}: CustomersProps) {
  // Main Customers views
  const [searchQuery, setSearchQuery] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'debtors' | 'nodebt'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Sidebars and modals
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  
  // Repayment form
  const [repayAmount, setRepayAmount] = useState('');
  const [showRepayReceipt, setShowRepayReceipt] = useState(false);
  const [lastPaymentReceived, setLastPaymentReceived] = useState<{
    customerName: string;
    amount: number;
    prevDebt: number;
    newDebt: number;
    dateTime: string;
  } | null>(null);

  // Form states for adding/editing customers
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custNotes, setCustNotes] = useState('');
  const [custLimit, setCustLimit] = useState('');
  const [custStatus, setCustStatus] = useState<'active' | 'inactive'>('active');
  const [custAllowDebt, setCustAllowDebt] = useState(true);

  // Currency utility
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Specific customer's debt log
  const customerDebts = useMemo(() => {
    if (!selectedCustomerId) return [];
    return debts.filter(d => d.customerId === selectedCustomerId);
  }, [debts, selectedCustomerId]);

  // Specific customer's payment history
  const customerPayments = useMemo(() => {
    if (!selectedCustomerId) return [];
    return debtPayments.filter(p => p.customerId === selectedCustomerId);
  }, [debtPayments, selectedCustomerId]);

  // Specific customer's purchase history
  const customerSales = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales.filter(s => s.customerId === selectedCustomerId);
  }, [sales, selectedCustomerId]);

  // Filters customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchQuery));
      const matchDebt = debtFilter === 'all' || 
                        (debtFilter === 'debtors' && c.currentDebt > 0) || 
                        (debtFilter === 'nodebt' && c.currentDebt === 0);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchDebt && matchStatus;
    });
  }, [customers, searchQuery, debtFilter, statusFilter]);

  // Open add/edit modal
  const handleOpenModal = (customer: Customer | null) => {
    if (customer) {
      setEditingCustomer(customer);
      setCustName(customer.name);
      setCustPhone(customer.phone || '');
      setCustAddress(customer.address || '');
      setCustNotes(customer.notes || '');
      setCustLimit(String(customer.debtLimit));
      setCustStatus(customer.status);
      setCustAllowDebt(customer.allowDebt !== false);
    } else {
      setEditingCustomer(null);
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      setCustNotes('');
      setCustLimit(String(settings.defaultDebtLimit));
      setCustStatus('active');
      setCustAllowDebt(true);
    }
    setShowAddModal(true);
  };

  // Submit customer form
  const handleCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim()) {
      alert("Mijoz ismini kiritishingiz shart!");
      return;
    }

    const limitNum = parseFloat(custLimit) || 0;

    if (editingCustomer) {
      onUpdateCustomer({
        ...editingCustomer,
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        address: custAddress.trim() || undefined,
        notes: custNotes.trim() || undefined,
        debtLimit: limitNum,
        status: custStatus,
        allowDebt: custAllowDebt
      });
      alert("Mijoz ma'lumotlari yangilandi!");
    } else {
      const newCustomer: Customer = {
        id: `cust-${Date.now()}`,
        name: custName.trim(),
        phone: custPhone.trim() || undefined,
        address: custAddress.trim() || undefined,
        notes: custNotes.trim() || undefined,
        debtLimit: limitNum,
        currentDebt: 0,
        totalSales: 0,
        status: 'active',
        allowDebt: custAllowDebt
      };
      onAddCustomer(newCustomer);
      alert("Yangi mijoz qo'shildi!");
    }

    setShowAddModal(false);
  };

  // Submit debt repayment
  const handleRepaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId || !selectedCustomer) return;

    const repayNum = parseFloat(repayAmount) || 0;
    if (repayNum <= 0) {
      alert("To'lov miqdori musbat son bo'lishi shart!");
      return;
    }

    if (repayNum > selectedCustomer.currentDebt) {
      alert(`Xato: To'lov miqdori jami qarzdan oshib ketdi! Jami qarz: ${formatMoney(selectedCustomer.currentDebt)}`);
      return;
    }

    // Call state action
    onRepayDebt(selectedCustomerId, repayNum);

    // Save payment context for print receipt
    setLastPaymentReceived({
      customerName: selectedCustomer.name,
      amount: repayNum,
      prevDebt: selectedCustomer.currentDebt,
      newDebt: selectedCustomer.currentDebt - repayNum,
      dateTime: new Date().toISOString()
    });

    setRepayAmount('');
    setShowRepayReceipt(true);
  };

  // Top Debtors list analysis (TOP 10)
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter(c => c.currentDebt > 0)
      .sort((a, b) => b.currentDebt - a.currentDebt)
      .slice(0, 10);
  }, [customers]);

  return (
    <div className="w-full max-w-full py-6 font-sans space-y-6 select-none">
      
      {/* Print styles for Payment slip */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #repayment-slip, #repayment-slip * {
            visibility: visible;
          }
          #repayment-slip {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 4mm;
            font-family: monospace;
            font-size: 11px;
            color: #000;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 border-b border-slate-200 pb-4 no-print">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
            <Users className="h-6 w-6 text-blue-600" />
            <span>Mijozlar Bazasi & Nasiya Daftari</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Mijozlar hisob-kitoblari, nasiya qarzlarini qabul qilish va qarz limitlari boshqaruvi.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal(null)}
          className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer self-start"
        >
          <UserPlus className="h-4 w-4" />
          <span>Yangi Mijoz Qo'shish</span>
        </button>
      </div>

      {/* Main Grid split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 no-print">
        
        {/* LEFT COLUMN: Search, Filters, and Customers Table (8/12 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Filters row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Mijoz ismi yoki telefon raqami..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={debtFilter}
                onChange={(e) => setDebtFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha Mijozlar</option>
                <option value="debtors">Nasiyasi borlar</option>
                <option value="nodebt">Qarzsizlar</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha Holatlar</option>
                <option value="active">Faol</option>
                <option value="inactive">Nofaol / Blok</option>
              </select>
            </div>
          </div>

          {/* Customers Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-5 py-3">Foydalanuvchi</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Telefon</th>
                  <th className="px-5 py-3 text-right">Joriy qarz</th>
                  <th className="px-5 py-3 text-right hidden md:table-cell">Jami xaridlar</th>
                  <th className="px-5 py-3 hidden sm:table-cell">Nasiya limiti</th>
                  <th className="px-5 py-3 hidden md:table-cell">Holat</th>
                  <th className="px-5 py-3 text-center">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                      selectedCustomerId === c.id ? 'bg-blue-50/35 border-l-4 border-l-blue-600' : ''
                    }`}
                    onClick={() => setSelectedCustomerId(c.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-700 border flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.charAt(0)}
                        </div>
                        <div>
                          <span className="text-slate-900 font-extrabold block">{c.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal block">{c.address || 'Manzil kiritilmagan'}</span>
                          {c.phone && <span className="text-[10px] text-slate-400 block sm:hidden">{c.phone}</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-normal text-slate-500 hidden sm:table-cell">{c.phone || '-'}</td>
                    <td className="px-5 py-3.5 text-right font-black">
                      <span className={c.currentDebt > 0 ? 'text-red-600' : 'text-slate-800'}>
                        {formatMoney(c.currentDebt)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-500 font-medium hidden md:table-cell">{formatMoney(c.totalSales)}</td>
                    <td className="px-5 py-3.5 hidden sm:table-cell">
                      <div className="text-slate-500 font-bold">{formatMoney(c.debtLimit)}</div>
                      <div className="mt-0.5">
                        {c.allowDebt !== false ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Nasiya mumkin
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            Taqiqlangan
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={`inline-block h-2 w-2 rounded-full mr-1 ${c.status === 'active' ? 'bg-green-500' : 'bg-red-400'}`}></span>
                      <span className="text-slate-600">{c.status === 'active' ? 'Faol' : 'Nofaol'}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center space-x-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 text-slate-400 hover:text-amber-600 border border-slate-100 hover:border-amber-200 bg-white rounded cursor-pointer"
                          title="Tahrirlash"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomerId(c.id);
                            // Highlight or trigger sidebar view
                          }}
                          className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[9px] font-bold border border-blue-100 hover:bg-blue-100 cursor-pointer"
                        >
                          Qarz hisobi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 bg-white">
                      Bunday xususiyatli mijoz topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Specific Customer's Debt Repay & Account Details (4/12 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-6 h-fit">
          {selectedCustomer ? (
            <div className="space-y-6">
              
              {/* Header profile */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">{selectedCustomer.name}</h3>
                  <div className="flex items-center text-[10px] text-slate-400 font-semibold space-x-2 mt-1">
                    {selectedCustomer.phone && (
                      <span className="flex items-center">
                        <Phone className="h-3 w-3 mr-0.5" />
                        {selectedCustomer.phone}
                      </span>
                    )}
                    {selectedCustomer.address && (
                      <span className="flex items-center">
                        <MapPin className="h-3 w-3 mr-0.5" />
                        {selectedCustomer.address.split(',')[0]}
                      </span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedCustomerId(null)}
                  className="text-slate-300 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Credit permission banner */}
              <div className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                selectedCustomer.allowDebt !== false
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-100'
              }`}>
                <div className="flex items-center space-x-1.5">
                  <span className={`h-2 w-2 rounded-full ${selectedCustomer.allowDebt !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="font-bold">Nasiya (qarz) holati:</span>
                </div>
                <span className="font-extrabold uppercase text-[10px] tracking-wide">
                  {selectedCustomer.allowDebt !== false ? "Ruxsat berilgan" : "Taqiqlangan"}
                </span>
              </div>

              {/* Debt KPI card */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Joriy Qarz</span>
                  <span className={`text-lg font-black block ${selectedCustomer.currentDebt > 0 ? 'text-red-600' : 'text-slate-800'}`}>
                    {formatMoney(selectedCustomer.currentDebt)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Limit qoldig'i</span>
                  <span className="text-xs font-bold text-slate-600 block">
                    {formatMoney(selectedCustomer.debtLimit - selectedCustomer.currentDebt)}
                  </span>
                </div>
              </div>

              {/* Repay Debt form */}
              {selectedCustomer.currentDebt > 0 ? (
                <div className="border border-slate-100 p-4 rounded-xl bg-slate-50/30 space-y-3">
                  <span className="text-xs font-extrabold text-slate-800 block">Qarz to'lovini qabul qilish</span>
                  <form onSubmit={handleRepaySubmit} className="space-y-3">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-slate-400 text-xs font-bold">UZS:</span>
                      <input
                        type="number"
                        required
                        min="1"
                        placeholder="Masalan: 50000"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                        className="w-full pl-12 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div className="flex space-x-1.5">
                      <button
                        type="button"
                        onClick={() => setRepayAmount(String(selectedCustomer.currentDebt))}
                        className="px-2.5 py-1.5 border bg-white border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer"
                      >
                        To'liq yopish
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer text-center"
                      >
                        To'lovni Tasdiqlash
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-green-50/50 border border-green-100 p-3.5 rounded-xl flex items-center space-x-2 text-green-700 text-xs font-bold">
                  <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
                  <span>Ushbu mijozning qarzi yo'q!</span>
                </div>
              )}

              {/* Account History details */}
              <div className="space-y-3 text-xs">
                <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px] block">Moliyaviy tarix qismlari</span>
                
                {/* Specific active pending debts */}
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block flex items-center">
                    <Clock className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    Nasiyaga olingan cheklar ({customerDebts.filter(d => d.status === 'pending').length} ta)
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-1.5 border rounded-lg">
                    {customerDebts.filter(d => d.status === 'pending').map((d) => {
                      const isOverdue = d.dueDate ? new Date(d.dueDate) < new Date('2026-06-26') : false;
                      return (
                        <div key={d.id} className="flex justify-between items-center py-1 border-b border-slate-200/50 text-[10px]">
                          <div>
                            <span className="font-bold text-slate-700">Chek #{d.receiptNo}</span>
                            <span className="text-slate-400 block font-normal">{new Date(d.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-extrabold text-red-600 block">{formatMoney(d.remainingAmount)}</span>
                            {d.dueDate && (
                              <span className={`text-[8px] font-bold px-1 rounded block ${isOverdue ? 'bg-red-100 text-red-700' : 'text-slate-400'}`}>
                                Muddat: {d.dueDate} {isOverdue ? '(Overdue)' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {customerDebts.filter(d => d.status === 'pending').length === 0 && (
                      <span className="text-slate-400 italic block py-2 text-center text-[10px]">Hech qanday faol qarz cheki yo'q</span>
                    )}
                  </div>
                </div>

                {/* Specific payments log */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-xs font-bold text-slate-700 block flex items-center">
                    <History className="h-3.5 w-3.5 text-slate-400 mr-1" />
                    Qarz qaytarilgan to'lovlar logi ({customerPayments.length} ta)
                  </span>
                  <div className="max-h-32 overflow-y-auto space-y-1 bg-slate-50 p-1.5 border rounded-lg">
                    {customerPayments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-1 border-b border-slate-200/50 text-[10px]">
                        <div>
                          <span className="font-bold text-slate-800">Qarz to'lovi</span>
                          <span className="text-slate-400 block font-normal">{new Date(p.dateTime).toLocaleDateString()}</span>
                        </div>
                        <span className="font-extrabold text-green-600">{formatMoney(p.amount)}</span>
                      </div>
                    ))}
                    {customerPayments.length === 0 && (
                      <span className="text-slate-400 italic block py-2 text-center text-[10px]">Hech qanday qarz to'lovi qayd etilmagan</span>
                    )}
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <Users className="h-10 w-10 mx-auto text-slate-200" />
              <p className="text-xs font-bold">Mijoz tanlanmagan</p>
              <p className="text-[10px] text-slate-400">Nasiya daftari va qarz to'lovlarini qabul qilish uchun chap tomondagi jadvaldan mijozni bosing.</p>
            </div>
          )}
        </div>

      </div>

      {/* OVERLAY 1: REPAYMENT SLIP PREVIEW MODAL */}
      {showRepayReceipt && lastPaymentReceived && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={() => setShowRepayReceipt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-4">
              <div className="h-10 w-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">To'lov muvaffaqiyatli qabul qilindi!</h3>
              <p className="text-xs text-slate-400 mt-1">Nasiya kvitansiyasi</p>
            </div>

            {/* Simulated Repay Receipt block */}
            <div id="repayment-slip" className="border-2 border-dashed border-slate-300 p-4 rounded-lg bg-slate-50/50 text-xs font-mono text-slate-800 leading-relaxed whitespace-pre shadow-inner">
{`══════════════════════════════
    ${settings.storeName.toUpperCase()}
  QARZ TO'LOV KVITANSIYASI
══════════════════════════════
Mijoz: ${lastPaymentReceived.customerName}
Sana: ${new Date(lastPaymentReceived.dateTime).toLocaleString('uz-UZ').replace(',', '')}
Xodim: ${currentUser.name}
──────────────────────────────
To'langan qarz summasi:
UZS: ${new Intl.NumberFormat('uz-UZ').format(lastPaymentReceived.amount)} so'm
──────────────────────────────
Avvalgi qarz: ${new Intl.NumberFormat('uz-UZ').format(lastPaymentReceived.prevDebt)} so'm
Qolgan qarz:  ${new Intl.NumberFormat('uz-UZ').format(lastPaymentReceived.newDebt)} so'm
──────────────────────────────
To'lovingiz uchun rahmat!
══════════════════════════════`}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => window.print()}
                className="flex items-center justify-center space-x-1 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Chop etish</span>
              </button>

              <button
                onClick={() => setShowRepayReceipt(false)}
                className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer text-center"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD / EDIT CUSTOMER DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-4">
              <UserPlus className="h-5 w-5 text-blue-600" />
              <span>{editingCustomer ? 'Mijoz tahrirlash' : "Yangi mijoz qo'shish"}</span>
            </h3>

            <form onSubmit={handleCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Mijoz to'liq ismi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Bekzod Karimov"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Telefon raqami</label>
                <input
                  type="text"
                  placeholder="Masalan: +998 90 123-45-67"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Manzil</label>
                <input
                  type="text"
                  placeholder="Yashash mahallasi yoki ko'chasi"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nasiya limiti (so'm)</label>
                  <input
                    type="number"
                    placeholder="Masalan: 1000000"
                    value={custLimit}
                    onChange={(e) => setCustLimit(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
                {editingCustomer && (
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Holati</label>
                    <select
                      value={custStatus}
                      onChange={(e) => setCustStatus(e.target.value as any)}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none"
                    >
                      <option value="active">Faol</option>
                      <option value="inactive">Nofaol / Blok</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <input
                  type="checkbox"
                  id="custAllowDebt"
                  checked={custAllowDebt}
                  onChange={(e) => setCustAllowDebt(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="custAllowDebt" className="text-xs font-bold text-slate-700 cursor-pointer select-none">
                  Nasiyaga (qarzga) savdo qilishga ruxsat berish
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Eslatma / Izoh</label>
                <textarea
                  placeholder="Mijoz haqida maxsus tafsilotlar yoki to'lov kunlari ehtiyoji..."
                  value={custNotes}
                  onChange={(e) => setCustNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs min-h-[60px]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
