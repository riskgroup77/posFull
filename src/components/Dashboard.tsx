import React, { useState, useMemo } from 'react';
import { Product, Category, Customer, Sale, Debt, User } from '../types';
import { toDateStr, monthPrefix, monthNameUz, lastNDays } from '../utils/dates';
import { 
  TrendingUp, 
  ShoppingCart, 
  DollarSign, 
  Wallet, 
  AlertTriangle, 
  Package, 
  Users, 
  Plus, 
  ArrowUpRight, 
  FileText, 
  Calendar,
  X,
  Sparkles,
  Search,
  CheckCircle,
  Bell
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';

interface DashboardProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  sales: Sale[];
  debts: Debt[];
  currentUser: User;
  setActiveTab: (tab: string) => void;
  onQuickAddProduct: () => void;
  onQuickAddCustomer: () => void;
}

export default function Dashboard({ 
  products,
  categories,
  customers, 
  sales, 
  debts, 
  currentUser,
  setActiveTab,
  onQuickAddProduct,
  onQuickAddCustomer
}: DashboardProps) {
  const [timeFilter, setTimeFilter] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Format currency
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  const todayStr = toDateStr();
  const weekStartStr = lastNDays(7)[0];
  const currentMonth = monthPrefix();

  // Filters sales by date range
  const filteredSales = useMemo(() => {
    return sales.filter(sale => {
      const saleDate = sale.dateTime.split('T')[0];
      if (timeFilter === 'today') {
        return saleDate === todayStr;
      } else if (timeFilter === 'week') {
        return saleDate >= weekStartStr && saleDate <= todayStr;
      } else if (timeFilter === 'month') {
        return saleDate.startsWith(currentMonth);
      }
      return true;
    });
  }, [sales, timeFilter, todayStr, weekStartStr, currentMonth]);

  // Statistics calculation
  const stats = useMemo(() => {
    // Today's stats specifically
    const todaySales = sales.filter(s => s.dateTime.split('T')[0] === todayStr && s.status === 'completed');
    const todaySalesSum = todaySales.reduce((sum, s) => sum + s.finalAmount, 0);
    const todayTxCount = todaySales.length;

    const todayCashSum = todaySales.reduce((sum, s) => sum + s.cashPaid, 0);
    const todayDebtSum = todaySales.reduce((sum, s) => sum + s.debtAmount, 0);

    // Month's stats specifically
    const monthSales = sales.filter(s => s.dateTime.startsWith(currentMonth) && s.status === 'completed');
    const monthSalesSum = monthSales.reduce((sum, s) => sum + s.finalAmount, 0);
    const monthTxCount = monthSales.length;

    // Total outstanding debt of all customers
    const totalDebt = customers.reduce((sum, c) => sum + c.currentDebt, 0);

    // Active & low stock products
    const activeProductsCount = products.filter(p => p.status === 'active').length;
    const lowStockProducts = products.filter(p => p.stock <= p.minStock && p.status === 'active');
    const lowStockCount = lowStockProducts.length;

    // Highest today sale
    const highestTodaySale = todaySales.length > 0 
      ? Math.max(...todaySales.map(s => s.finalAmount)) 
      : 0;

    return {
      todaySalesSum,
      todayTxCount,
      todayCashSum,
      todayDebtSum,
      monthSalesSum,
      monthTxCount,
      totalDebt,
      activeProductsCount,
      lowStockCount,
      lowStockProducts,
      highestTodaySale
    };
  }, [products, customers, sales, todayStr, currentMonth]);

  // Alert definitions: Overdue debts
  const overdueDebts = useMemo(() => {
    const today = new Date(todayStr);
    return debts.filter(d => {
      if (d.status === 'paid' || !d.dueDate) return false;
      const dueDate = new Date(d.dueDate);
      return dueDate < today;
    });
  }, [debts]);

  // Chart Data 1: Line chart for daily sales (last 7 days, June 20 - June 26)
  const dailySalesChartData = useMemo(() => {
    const dates = lastNDays(7);
    const daysMap = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
    
    return dates.map(dt => {
      const dateObj = new Date(dt);
      const dayName = daysMap[dateObj.getDay()];
      const daySales = sales.filter(s => s.dateTime.split('T')[0] === dt && s.status === 'completed');
      const totalAmount = daySales.reduce((sum, s) => sum + s.finalAmount, 0);
      const cashAmount = daySales.reduce((sum, s) => sum + s.cashPaid, 0);
      const debtAmount = daySales.reduce((sum, s) => sum + s.debtAmount, 0);

      return {
        sana: dt.split('-').slice(1).reverse().join('.'), // '20.06'
        Kuni: dayName,
        'Jami Savdo': totalAmount,
        'Naqd pul': cashAmount,
        'Nasiya (Qarz)': debtAmount,
      };
    });
  }, [sales]);

  // Chart Data 2: Pie chart for Payment Method share (all or filtered)
  const paymentMethodChartData = useMemo(() => {
    let cashSum = 0;
    let debtSum = 0;

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        cashSum += s.cashPaid;
        debtSum += s.debtAmount;
      }
    });

    return [
      { name: 'Naqd Pul', value: cashSum, color: '#10B981' }, // Green
      { name: 'Nasiya / Qarz', value: debtSum, color: '#F59E0B' } // Amber
    ];
  }, [filteredSales]);

  // Chart Data 3: Top-5 best selling products (based on total quantities sold)
  const topProductsChartData = useMemo(() => {
    const prodCountMap: { [prodName: string]: number } = {};
    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          prodCountMap[item.productName] = (prodCountMap[item.productName] || 0) + item.quantity;
        });
      }
    });

    const items = Object.keys(prodCountMap).map(name => ({
      name: name.length > 15 ? name.substring(0, 15) + '..' : name,
      'Sotilgan Soni': prodCountMap[name]
    }));

    return items.sort((a, b) => b['Sotilgan Soni'] - a['Sotilgan Soni']).slice(0, 5);
  }, [sales]);

  // Chart Data 4: Category Distribution of sales volume
  const categorySalesChartData = useMemo(() => {
    const catSalesMap: Record<string, number> = {};
    categories.forEach((c) => { catSalesMap[c.id] = 0; });
    catSalesMap['__other__'] = 0;

    sales.forEach(sale => {
      if (sale.status === 'completed') {
        sale.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const catId = product?.categoryId;
          if (catId && catSalesMap[catId] !== undefined) {
            catSalesMap[catId] += item.total;
          } else {
            catSalesMap['__other__'] += item.total;
          }
        });
      }
    });

    const catNameById = Object.fromEntries(categories.map((c) => [c.id, c.name]));
    return Object.entries(catSalesMap)
      .filter(([, value]) => value > 0)
      .map(([id, value]) => ({
        name: id === '__other__' ? 'Boshqa' : (catNameById[id] || 'Noma\'lum'),
        'Tushum': value,
      }));
  }, [sales, products, categories]);

  return (
    <div className="pos-page">
      
      {/* Header and Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="pos-page-title flex items-center gap-2">
            <span>Boshqaruv Paneli</span>
            <Sparkles className="h-5 w-5 text-blue-500" />
          </h2>
          <p className="pos-page-subtitle">
            Do'koningizning real vaqtdagi savdo va ombor ko'rsatkichlari.
          </p>
        </div>

        {/* Time Filters */}
        <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm max-w-fit">
          <button
            onClick={() => setTimeFilter('today')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'today' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Bugun
          </button>
          <button
            onClick={() => setTimeFilter('week')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'week' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hafta
          </button>
          <button
            onClick={() => setTimeFilter('month')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'month' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Oy
          </button>
          <button
            onClick={() => setTimeFilter('all')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              timeFilter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Barchasi
          </button>
        </div>
      </div>

      {/* Low Stock or Overdue Debt Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stats.lowStockCount > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5 animate-bounce" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-amber-800">Kam qolgan mahsulotlar ogohlantirishi</h4>
              <p className="text-xs text-amber-700 mt-1">
                Omborda <span className="font-bold">{stats.lowStockCount} ta</span> mahsulot belgilangan minimal qoldiqdan past darajada qoldi!
              </p>
              <button 
                onClick={() => setActiveTab('warehouse')}
                className="text-xs font-bold text-blue-600 hover:underline mt-2 flex items-center space-x-1 cursor-pointer"
              >
                <span>Qoldiqlarni to'ldirish</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {overdueDebts.length > 0 && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl flex items-start space-x-3 shadow-sm">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-bold text-red-800">Muddati o'tgan qarzlar bor</h4>
              <p className="text-xs text-red-700 mt-1">
                <span className="font-bold">{overdueDebts.length} ta</span> nasiya kelishuvining to'lov muddati yakunlandi va qarz hali yopilmagan.
              </p>
              <button 
                onClick={() => setActiveTab('customers')}
                className="text-xs font-bold text-blue-600 hover:underline mt-2 flex items-center space-x-1 cursor-pointer"
              >
                <span>Mijozlar qarzlarini ko'rish</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales */}
        <div className="pos-card-hover p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bugungi Sotuv</p>
            <h3 className="text-xl font-extrabold text-slate-800">{formatMoney(stats.todaySalesSum)}</h3>
            <p className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-1">
              <TrendingUp className="h-3 w-3" />
              <span>{stats.todayTxCount} ta tranzaksiya</span>
            </p>
          </div>
          <div className="h-12 w-12 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center border border-blue-100">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* Month Sales */}
        <div className="pos-card-hover p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Oylik Sotuv ({monthNameUz()})</p>
            <h3 className="text-xl font-extrabold text-slate-800">{formatMoney(stats.monthSalesSum)}</h3>
            <p className="text-[10px] text-slate-500 font-semibold">{stats.monthTxCount} ta oylik tranzaksiyalar</p>
          </div>
          <div className="h-12 w-12 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center border border-emerald-100">
            <ShoppingCart className="h-6 w-6" />
          </div>
        </div>

        {/* Total Outstanding Debt */}
        <div className="pos-card-hover p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jami Nasiya (Qarz)</p>
            <h3 className="text-xl font-extrabold text-red-600">{formatMoney(stats.totalDebt)}</h3>
            <p className="text-[10px] text-amber-600 font-semibold">Tizimdagi barcha faol qarzlar</p>
          </div>
          <div className="h-12 w-12 bg-red-50 text-red-600 rounded-lg flex items-center justify-center border border-red-100">
            <Wallet className="h-6 w-6" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="pos-card-hover p-5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ombor Holati</p>
            <h3 className="text-xl font-extrabold text-slate-800">{stats.activeProductsCount} xil tovar</h3>
            <p className="text-[10px] text-rose-600 font-semibold flex items-center space-x-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{stats.lowStockCount} ta tovar kam qoldi</span>
            </p>
          </div>
          <div className="h-12 w-12 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center border border-indigo-100">
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-100/60 p-4 rounded-xl border border-slate-200/50">
        <div className="text-center sm:border-r border-slate-200 py-2">
          <span className="text-xs text-slate-500 block">Bugun Naqd Tushum</span>
          <span className="text-lg font-extrabold text-emerald-600 block mt-1">{formatMoney(stats.todayCashSum)}</span>
        </div>
        <div className="text-center sm:border-r border-slate-200 py-2">
          <span className="text-xs text-slate-500 block">Bugun Nasiyaga Berilgan</span>
          <span className="text-lg font-extrabold text-amber-600 block mt-1">{formatMoney(stats.todayDebtSum)}</span>
        </div>
        <div className="text-center py-2">
          <span className="text-xs text-slate-500 block">Bugungi Eng Katta Savdo</span>
          <span className="text-lg font-extrabold text-blue-600 block mt-1">{formatMoney(stats.highestTodaySale)}</span>
        </div>
      </div>

      {/* Main Charts & Actions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Sales Trend (2/3 width on large screens) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-800">So'nggi 7 kunlik sotuv dinamikasi</h4>
            <span className="text-xs text-slate-400">Kunlik jami tushum</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySalesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="sana" tick={{ fontSize: 10, fill: '#64748B', fontWeight: 600 }} stroke="#E2E8F0" />
                <YAxis tick={{ fontSize: 10, fill: '#64748B' }} stroke="#E2E8F0" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Jami Savdo" stroke="#2563EB" strokeWidth={3} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Naqd pul" stroke="#10B981" strokeWidth={2} strokeDasharray="3 3" />
                <Line type="monotone" dataKey="Nasiya (Qarz)" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods (1/3 width) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-800">To'lov turlari taqsimoti</h4>
            <p className="text-[10px] text-slate-400 mt-1">Ushbu davrdagi tushumlar ulushi (Naqd vs Nasiya)</p>
          </div>
          <div className="h-48 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentMethodChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentMethodChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatMoney(value)} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Summary Label */}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Jami</span>
              <span className="text-sm font-black text-slate-800">
                {formatMoney(paymentMethodChartData.reduce((acc, curr) => acc + curr.value, 0))}
              </span>
            </div>
          </div>
          <div className="space-y-1.5 text-xs">
            {paymentMethodChartData.map((entry, index) => (
              <div key={index} className="flex items-center justify-between font-semibold">
                <div className="flex items-center space-x-1.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }}></span>
                  <span className="text-slate-600">{entry.name}</span>
                </div>
                <span className="text-slate-800">{formatMoney(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top-5 Products Sales Bar (1/3 width) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800">Eng ko'p sotilgan tovarlar (TOP-5)</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsChartData} layout="vertical" margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} width={80} />
                <Tooltip />
                <Bar dataKey="Sotilgan Soni" fill="#4F46E5" radius={[0, 4, 4, 0]} barSize={16}>
                  {topProductsChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={['#2563EB', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE'][index % 5]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Sales Bar (1/3 width) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-4">
          <h4 className="text-sm font-bold text-slate-800">Kategoriyalar bo'yicha tushum</h4>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySalesChartData} margin={{ top: 10, right: 5, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748B', fontWeight: 600 }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748B' }} />
                <Tooltip formatter={(value: any) => formatMoney(value)} />
                <Bar dataKey="Tushum" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions (1/3 width) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-sm space-y-5">
          <h4 className="text-sm font-bold text-slate-800">Tezkor Amallar</h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('pos')}
              className="flex flex-col items-center justify-center p-4 border border-blue-100 bg-blue-50/50 hover:bg-blue-50 hover:border-blue-300 rounded-xl text-center group transition-all cursor-pointer"
            >
              <ShoppingCart className="h-7 w-7 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-blue-800">Yangi Sotuv</span>
              <span className="text-[9px] text-blue-500 mt-0.5">Tezkor kassa</span>
            </button>

            <button
              onClick={onQuickAddProduct}
              className="flex flex-col items-center justify-center p-4 border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 hover:border-emerald-300 rounded-xl text-center group transition-all cursor-pointer"
            >
              <Plus className="h-7 w-7 text-emerald-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-emerald-800">Mahsulot Qo'shish</span>
              <span className="text-[9px] text-emerald-500 mt-0.5">Omborga yangi</span>
            </button>

            <button
              onClick={onQuickAddCustomer}
              className="flex flex-col items-center justify-center p-4 border border-amber-100 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-300 rounded-xl text-center group transition-all cursor-pointer"
            >
              <Users className="h-7 w-7 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-amber-800">Mijoz Qo'shish</span>
              <span className="text-[9px] text-amber-500 mt-0.5">Mijoz ro'yxati</span>
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="flex flex-col items-center justify-center p-4 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 hover:border-indigo-300 rounded-xl text-center group transition-all cursor-pointer"
            >
              <FileText className="h-7 w-7 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold text-indigo-800">Hisobotlar</span>
              <span className="text-[9px] text-indigo-500 mt-0.5">Moliyaviy tahlil</span>
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs space-y-1 text-slate-600">
            <span className="font-bold text-slate-700 block mb-1">Xodim eslatmasi:</span>
            <p>1. Shtrix-kod skanerini kassa sahifasida ulang yoki kodni qo'lda kiriting.</p>
            <p>2. Yangi sotuv kiritilganda ombor qoldiqlari avtomatik hisobdan chiqariladi.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
