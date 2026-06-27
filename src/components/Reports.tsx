import React, { useState, useMemo } from 'react';
import { Sale, Product, Customer, DebtPayment, User } from '../types';
import { toDateStr, daysAgo } from '../utils/dates';
import {
  FileText,
  TrendingUp, 
  Coins, 
  Package, 
  Users, 
  Printer, 
  Download, 
  Calendar,
  DollarSign,
  TrendingDown,
  Percent,
  Calculator,
  Grid
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Cell, 
  Legend 
} from 'recharts';

interface ReportsProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  debtPayments: DebtPayment[];
  currentUser: User;
}

export default function Reports({ sales, products, customers, debtPayments, currentUser }: ReportsProps) {
  // Report focus sub-tabs
  const [reportType, setReportType] = useState<'sales' | 'finance' | 'warehouse' | 'customers'>('sales');
  
  // Custom date ranges
  const [startDate, setStartDate] = useState(() => daysAgo(6));
  const [endDate, setEndDate] = useState(() => toDateStr());

  // Currency utility
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  // 1. FILTERED SALES
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      const sDate = s.dateTime.split('T')[0];
      return sDate >= startDate && sDate <= endDate;
    });
  }, [sales, startDate, endDate]);

  // 2. FINANCIAL STATS (Jami aylanma, Naqd, Nasiya, Foyda)
  const financialSummary = useMemo(() => {
    let totalRevenue = 0;
    let totalCashReceived = 0;
    let totalDebtIssued = 0;
    let totalCostOfGoods = 0;
    let completedTxCount = 0;
    let returnedTxCount = 0;

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        completedTxCount++;
        totalRevenue += s.finalAmount;
        totalCashReceived += s.cashPaid;
        totalDebtIssued += s.debtAmount;

        // Calculate supply cost for profit
        s.items.forEach(item => {
          const product = products.find(p => p.id === item.productId);
          const supplyPrice = product ? product.supplyPrice : Math.round(item.price * 0.7);
          totalCostOfGoods += supplyPrice * item.quantity;
        });
      } else {
        returnedTxCount++;
      }
    });

    // Debt repayments collected during this period
    const repaymentsCollected = debtPayments
      .filter(dp => {
        const dpDate = dp.dateTime.split('T')[0];
        return dpDate >= startDate && dpDate <= endDate;
      })
      .reduce((sum, dp) => sum + dp.amount, 0);

    const netProfit = totalRevenue - totalCostOfGoods;
    const profitMargin = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalCashReceived,
      totalDebtIssued,
      repaymentsCollected,
      totalCostOfGoods,
      netProfit,
      profitMargin,
      completedTxCount,
      returnedTxCount
    };
  }, [filteredSales, products, debtPayments, startDate, endDate]);

  // 3. PRODUCT SALES ANALYSIS (Best and worst sellers)
  const productPerformance = useMemo(() => {
    const productStats: { [id: string]: { name: string; qty: number; revenue: number; profit: number } } = {};
    
    // Seed all products so we see worst sellers too
    products.forEach(p => {
      productStats[p.id] = { name: p.name, qty: 0, revenue: 0, profit: 0 };
    });

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        s.items.forEach(item => {
          if (!productStats[item.productId]) {
            productStats[item.productId] = { name: item.productName, qty: 0, revenue: 0, profit: 0 };
          }
          const stats = productStats[item.productId];
          stats.qty += item.quantity;
          stats.revenue += item.total;

          // Calculate margin profit specifically
          const product = products.find(p => p.id === item.productId);
          const supplyPrice = product ? product.supplyPrice : Math.round(item.price * 0.7);
          const itemCost = supplyPrice * item.quantity;
          stats.profit += (item.total - itemCost);
        });
      }
    });

    const list = Object.keys(productStats).map(id => ({
      id,
      ...productStats[id]
    }));

    const bestSellers = [...list].sort((a, b) => b.qty - a.qty);
    const worstSellers = [...list].filter(p => p.qty === 0);

    return {
      bestSellers,
      worstSellers
    };
  }, [filteredSales, products]);

  // 4. CASHIER PERFORMANCE REPORT
  const cashierSummary = useMemo(() => {
    const cashiers: { [name: string]: { rev: number; count: number } } = {};

    filteredSales.forEach(s => {
      if (s.status === 'completed') {
        if (!cashiers[s.sellerName]) {
          cashiers[s.sellerName] = { rev: 0, count: 0 };
        }
        cashiers[s.sellerName].rev += s.finalAmount;
        cashiers[s.sellerName].count++;
      }
    });

    return Object.keys(cashiers).map(name => ({
      name,
      'Sotuv summasi': cashiers[name].rev,
      'Tranzaksiyalar': cashiers[name].count
    }));
  }, [filteredSales]);

  // 5. DAILY REVENUE LOG FOR CHARTS
  const dailyReportData = useMemo(() => {
    // Generate dates between start and end
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dateList: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dateList.push(d.toISOString().split('T')[0]);
    }

    return dateList.map(dt => {
      const daySales = sales.filter(s => s.dateTime.split('T')[0] === dt && s.status === 'completed');
      const revenue = daySales.reduce((sum, s) => sum + s.finalAmount, 0);
      const cash = daySales.reduce((sum, s) => sum + s.cashPaid, 0);
      const debt = daySales.reduce((sum, s) => sum + s.debtAmount, 0);
      
      return {
        sana: dt.split('-').slice(1).reverse().join('.'), // '20.06'
        'Jami Tushum': revenue,
        'Naqd qism': cash,
        'Nasiya qism': debt
      };
    });
  }, [sales, startDate, endDate]);

  // Export to CSV representation
  const handleExportCSV = () => {
    let rows: any[] = [];
    let filename = '';

    if (reportType === 'sales') {
      filename = 'sotuv_tahlili_hisoboti.csv';
      rows = [
        ['Chek №', 'Sana', 'Sotuvchi', 'Mijoz', 'Summa', 'To\'lov turi', 'Holat'],
        ...filteredSales.map(s => [
          s.receiptNo, s.dateTime, s.sellerName, s.customerName || 'Umumiy', s.finalAmount, s.paymentType, s.status
        ])
      ];
    } else if (reportType === 'finance') {
      filename = 'moliyaviy_sarhisob.csv';
      rows = [
        ['Ko\'rsatkich nomi', 'Qiymat (so\'m)'],
        ['Jami Savdo Tushumi (Revenue)', financialSummary.totalRevenue],
        ['Naqd To\'lovlar', financialSummary.totalCashReceived],
        ['Berilgan Nasiyalar', financialSummary.totalDebtIssued],
        ['Yig\'ilgan Nasiya To\'lovlari', financialSummary.repaymentsCollected],
        ['Sotilgan Tovar Tannarxi (Cost)', financialSummary.totalCostOfGoods],
        ['Net Foyda (Profit)', financialSummary.netProfit],
        ['Foyda Rentabelligi (%)', `${financialSummary.profitMargin}%`]
      ];
    } else if (reportType === 'warehouse') {
      filename = 'tovar_ombor_tahlili.csv';
      rows = [
        ['Tovar nomi', 'Sotilgan donasi', 'Yaratgan Tushumi', 'Yaratgan Foydasi'],
        ...productPerformance.bestSellers.map(p => [p.name, p.qty, p.revenue, p.profit])
      ];
    } else {
      filename = 'mijozlar_qarz_analizi.csv';
      rows = [
        ['Mijoz ismi', 'Telefon', 'Mavjud Qarzi', 'Jami qilgan Savdolari'],
        ...customers.map(c => [c.name, c.phone || 'Kiritilmagan', c.currentDebt, c.totalSales])
      ];
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let contentHtml = '';
    const dateRangeStr = `${startDate.split('-').reverse().join('.')} - ${endDate.split('-').reverse().join('.')}`;

    if (reportType === 'sales') {
      contentHtml = `
        <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-family: sans-serif;">Sotuv Tahlili Hisoboti</h1>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">Sana oralig'i: <strong>${dateRangeStr}</strong></p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Chek №</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Sana / Vaqt</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Sotuvchi</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Mijoz</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Jami summa</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">To'lov turi</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Holat</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(s => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold; color: #2563eb;">#${s.receiptNo}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${new Date(s.dateTime).toLocaleString('uz-UZ').replace(',', '')}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${s.sellerName}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${s.customerName || 'Umumiy'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatMoney(s.finalAmount)}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-transform: uppercase;">${s.paymentType === 'cash' ? 'Naqd' : s.paymentType === 'debt' ? 'Nasiya' : 'Aralash'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${s.status === 'completed' ? 'Yakunlangan' : 'Qaytarilgan'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div style="margin-top: 20px; text-align: right; font-size: 12px; font-weight: bold; font-family: sans-serif;">
          Jami sotuvlar soni: ${filteredSales.length} ta | Jami tushum: ${formatMoney(filteredSales.reduce((sum, s) => sum + (s.status === 'completed' ? s.finalAmount : 0), 0))}
        </div>
      `;
    } else if (reportType === 'finance') {
      contentHtml = `
        <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-family: sans-serif;">Moliyaviy Sarhisob Hisoboti</h1>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">Sana oralig'i: <strong>${dateRangeStr}</strong></p>
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 10px; border: 1px solid #e2e8f0;">Ko'rsatkich nomi</th>
              <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: right;">Qiymat</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Jami Savdo Tushumi (Revenue)</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatMoney(financialSummary.totalRevenue)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Naqd To'lovlar</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-weight: bold;">${formatMoney(financialSummary.totalCashReceived)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Berilgan Nasiyalar</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #ca8a04; font-weight: bold;">${formatMoney(financialSummary.totalDebtIssued)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Yig'ilgan Nasiya To'lovlari</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #2563eb; font-weight: bold;">${formatMoney(financialSummary.repaymentsCollected)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Sotilgan Tovar Tannarxi (Cost)</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-weight: bold;">${formatMoney(financialSummary.totalCostOfGoods)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold;">Net Foyda (Profit)</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; font-size: 14px; color: #16a34a;">${formatMoney(financialSummary.netProfit)}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px; border: 1px solid #e2e8f0;">Foyda Rentabelligi (%)</td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${financialSummary.profitMargin}%</td>
            </tr>
          </tbody>
        </table>
      `;
    } else if (reportType === 'warehouse') {
      contentHtml = `
        <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-family: sans-serif;">Ombor Tovar Sotuv Tahlili</h1>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">Sana oralig'i: <strong>${dateRangeStr}</strong></p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Tovar nomi</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Sotilgan miqdor</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Jami tushum</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Yaratgan foyda</th>
            </tr>
          </thead>
          <tbody>
            ${productPerformance.bestSellers.filter(p => p.qty > 0).map(p => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${p.name}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">${p.qty} dona</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatMoney(p.revenue)}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #16a34a;">${formatMoney(p.profit)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      contentHtml = `
        <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-family: sans-serif;">Nasiya & Mijozlar Hisoboti</h1>
        <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">Hisobot yaratilgan sana: <strong>${new Date().toLocaleDateString('uz-UZ')}</strong></p>
        <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: sans-serif;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Mijoz ismi</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0;">Telefon</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Joriy qarzi</th>
              <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Jami xaridlar</th>
            </tr>
          </thead>
          <tbody>
            ${customers.map(c => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${c.name}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0;">${c.phone || '-'}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${c.currentDebt > 0 ? '#dc2626' : '#1e293b'}">${formatMoney(c.currentDebt)}</td>
                <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatMoney(c.totalSales)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Nukus POS - Hisobot</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: #334155; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #334155; padding-bottom: 15px; margin-bottom: 25px; }
            .logo { font-size: 22px; font-weight: 900; color: #2563eb; }
            .meta { text-align: right; font-size: 11px; color: #64748b; }
            .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; font-size: 11px; color: #94a3b8; }
            @media print {
              body { padding: 10px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Nukus POS</div>
            <div class="meta">
              <p style="margin: 0;">Sana: ${new Date().toLocaleString('uz-UZ')}</p>
              <p style="margin: 5px 0 0 0;">Yaratdi: ${currentUser.name}</p>
            </div>
          </div>
          
          ${contentHtml}
          
          <div class="footer">
            Nukus POS tizimidan yuklab olingan rasmiy hisobot. &copy; ${new Date().getFullYear()}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Top Debtors list analysis (TOP 10)
  const topDebtors = useMemo(() => {
    return [...customers]
      .filter(c => c.currentDebt > 0)
      .sort((a, b) => b.currentDebt - a.currentDebt)
      .slice(0, 10);
  }, [customers]);

  return (
    <div className="pos-page print:bg-white">
      
      {/* Header and Filter Inputs */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 no-print">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="pos-page-title">Hisobotlar & Tahlillar</h2>
            <p className="pos-page-subtitle">
              Davriy daromad, tovarlar aylanmasi va moliyaviy foyda tahlili.
            </p>
          </div>
        </div>

        {/* Custom date selectors */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-xs">
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded text-xs font-semibold focus:outline-none"
            />
          </div>
          <span className="text-slate-400 text-xs">gacha</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 border border-slate-200 rounded text-xs font-semibold focus:outline-none"
          />

          <div className="flex gap-1.5 ml-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
              title="Excel / CSV formatida yuklab olish"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Excel/CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
              title="PDF formatida yuklab olish / Chop etish"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>PDF / Chop etish</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports focus menu (Sub tabs) */}
      <div className="flex bg-slate-100 p-1 rounded-xl border max-w-fit no-print">
        <button
          onClick={() => setReportType('sales')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportType === 'sales' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <TrendingUp className="h-4 w-4 inline mr-1.5" />
          Sotuv Tahlili
        </button>
        <button
          onClick={() => setReportType('finance')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportType === 'finance' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="h-4 w-4 inline mr-1.5" />
          Moliyaviy Hisobot (Foyda)
        </button>
        <button
          onClick={() => setReportType('warehouse')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportType === 'warehouse' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="h-4 w-4 inline mr-1.5" />
          Ombor Tovar Tahlili
        </button>
        <button
          onClick={() => setReportType('customers')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
            reportType === 'customers' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4 inline mr-1.5" />
          Nasiya & Mijozlar Hisoboti
        </button>
      </div>

      {/* REPORT VIEW 1: SALES ANALYSIS */}
      {reportType === 'sales' && (
        <div className="space-y-6">
          
          {/* Main Sales Trend chart */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Sana bo'yicha daromad harakati dinamikasi</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyReportData}>
                  <XAxis dataKey="sana" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value: any) => formatMoney(value)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Jami Tushum" stroke="#2563EB" strokeWidth={3} />
                  <Line type="monotone" dataKey="Naqd qism" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="Nasiya qism" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Cashier contribution chart */}
            <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-slate-800">Kassirlar / Xodimlar sotuv hajmi</h4>
              <div className="h-60">
                {cashierSummary.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cashierSummary} margin={{ left: -15 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <Tooltip formatter={(value: any) => formatMoney(value)} />
                      <Bar dataKey="Sotuv summasi" fill="#3B82F6" barSize={25} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                    Hech qanday sotuv kiritilmagan
                  </div>
                )}
              </div>
            </div>

            {/* General detailed metrics table */}
            <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-3">Tahliliy ko'rsatkichlar</h4>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Joriy davrdagi sotuvlar soni:</span>
                    <span className="text-slate-900 font-bold">{financialSummary.completedTxCount} ta</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">Qaytarilgan sotuvlar:</span>
                    <span className="text-rose-600 font-bold">{financialSummary.returnedTxCount} ta</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-slate-500">O'rtacha chek summasi:</span>
                    <span className="text-slate-900 font-bold">
                      {formatMoney(financialSummary.completedTxCount > 0 ? Math.round(financialSummary.totalRevenue / financialSummary.completedTxCount) : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kassada naqd pul ulushi (%):</span>
                    <span className="text-emerald-600 font-extrabold">
                      {financialSummary.totalRevenue > 0 ? Math.round((financialSummary.totalCashReceived / financialSummary.totalRevenue) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => window.print()}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center justify-center space-x-1 cursor-pointer mt-4"
              >
                <Printer className="h-4 w-4" />
                <span>Ushbu tahlilni chop etish</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* REPORT VIEW 2: FINANCIAL / PROFIT REPORT */}
      {reportType === 'finance' && (
        <div className="space-y-6">
          
          {/* Profit overview metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border p-5 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jami Daromad</span>
              <span className="text-xl font-black text-slate-800 block mt-1">
                {formatMoney(financialSummary.totalRevenue)}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Yangi savdolardan tushgan mablag'</span>
            </div>

            <div className="bg-white border p-5 rounded-xl shadow-xs">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sotilgan Tovar Tannarxi (Cost)</span>
              <span className="text-xl font-black text-slate-500 block mt-1">
                {formatMoney(financialSummary.totalCostOfGoods)}
              </span>
              <span className="text-[9px] text-slate-400 mt-1 block">Ombor sotib olish narxlari summasi</span>
            </div>

            <div className="bg-white border p-5 rounded-xl shadow-xs border-emerald-200 bg-emerald-50/25">
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">Sof Foyda (Gross Profit)</span>
              <span className="text-xl font-black text-emerald-700 block mt-1">
                {formatMoney(financialSummary.netProfit)}
              </span>
              <span className="text-[9px] text-emerald-600/75 mt-1 block font-bold">Qo'shimcha qiymat foydasi</span>
            </div>

            <div className="bg-white border p-5 rounded-xl shadow-xs border-indigo-200 bg-indigo-50/25">
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">Foyda Rentabelligi</span>
              <span className="text-xl font-black text-indigo-700 block mt-1">
                {financialSummary.profitMargin}%
              </span>
              <span className="text-[9px] text-indigo-600/75 mt-1 block font-bold">O'rtacha daromad marjasi</span>
            </div>

          </div>

          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800 flex items-center space-x-1">
              <Calculator className="h-5 w-5 text-blue-600" />
              <span>Naqd pul va Nasiya oqimi sarhisobi</span>
            </h4>
            <div className="space-y-3.5 text-xs font-semibold max-w-xl">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Yangi to'langan naqd pullar:</span>
                <span className="text-emerald-600 font-extrabold">{formatMoney(financialSummary.totalCashReceived)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Mijozlar qarziga berilgan nasiya summasi:</span>
                <span className="text-red-600 font-extrabold">{formatMoney(financialSummary.totalDebtIssued)}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Davr ichida yig'ilgan nasiya qarz to'lovlari:</span>
                <span className="text-blue-600 font-extrabold">{formatMoney(financialSummary.repaymentsCollected)}</span>
              </div>
              <div className="flex justify-between text-slate-900 border-t pt-2 font-black text-sm">
                <span>Kassadagi haqiqiy jami naqd tushum:</span>
                <span>{formatMoney(financialSummary.totalCashReceived + financialSummary.repaymentsCollected)}</span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* REPORT VIEW 3: WAREHOUSE STOCK PERFORMANCE */}
      {reportType === 'warehouse' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Best sellers */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Eng ko'p sotilgan mahsulotlar</h4>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Mahsulot nomi</th>
                    <th className="px-4 py-2 text-center">Sotilgan soni</th>
                    <th className="px-4 py-2 text-right">Tushum summasi</th>
                    <th className="px-4 py-2 text-right hidden sm:table-cell">Yaratgan foyda</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700 divide-y divide-slate-100">
                  {productPerformance.bestSellers.filter(p => p.qty > 0).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-800">{p.name}</td>
                      <td className="px-4 py-2.5 text-center bg-blue-50/30 text-blue-700">{p.qty} ta</td>
                      <td className="px-4 py-2.5 text-right text-slate-900 font-black">{formatMoney(p.revenue)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-black hidden sm:table-cell">{formatMoney(p.profit)}</td>
                    </tr>
                  ))}
                  {productPerformance.bestSellers.filter(p => p.qty > 0).length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Hali hech qanday sotuv amalga oshirilmagan
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Worst/Zero sellers */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Ushbu davrda sotilmagan mahsulotlar</h4>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-2">Mahsulot nomi</th>
                    <th className="px-4 py-2 hidden sm:table-cell">Barcode</th>
                    <th className="px-4 py-2 text-center">Mavjud qoldiq</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700 divide-y divide-slate-100">
                  {productPerformance.worstSellers.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-800 font-bold">{p.name}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-400 hidden sm:table-cell">{p.id}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="bg-slate-50 border border-slate-150 rounded px-2 py-0.5 text-slate-600">
                          {products.find(prod => prod.id === p.id)?.stock || 0} dona
                        </span>
                      </td>
                    </tr>
                  ))}
                  {productPerformance.worstSellers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400">
                        Barcha tovarlar faol sotilmoqda!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* REPORT VIEW 4: DEBTERS & OUTSTANDING DEBTS */}
      {reportType === 'customers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Debt Summary lists */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm md:col-span-2 space-y-4">
            <h4 className="text-sm font-bold text-slate-800">Eng katta qarzli (Nasiya) mijozlar</h4>
            <div className="overflow-x-auto border border-slate-100 rounded-lg">
              <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-500 text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-2">Mijoz ismi</th>
                    <th className="px-4 py-2 hidden sm:table-cell">Telefon</th>
                    <th className="px-4 py-2 text-right">Mavjud qarz summasi</th>
                    <th className="px-4 py-2 text-right hidden md:table-cell">Nasiya limiti</th>
                    <th className="px-4 py-2 text-center hidden lg:table-cell">Xaridlar soni</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700 divide-y divide-slate-100">
                  {topDebtors.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        <div>{c.name}</div>
                        {c.phone && <div className="text-[10px] text-slate-400 block sm:hidden">{c.phone}</div>}
                      </td>
                      <td className="px-4 py-2.5 font-normal text-slate-400 hidden sm:table-cell">{c.phone || '-'}</td>
                      <td className="px-4 py-2.5 text-right text-red-600 font-black">{formatMoney(c.currentDebt)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500 font-medium hidden md:table-cell">{formatMoney(c.debtLimit)}</td>
                      <td className="px-4 py-2.5 text-center text-slate-800 hidden lg:table-cell">{c.totalSales > 0 ? 'Mavjud' : 'Yo\'q'}</td>
                    </tr>
                  ))}
                  {topDebtors.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tizimda hech qanday qarzdor mijoz mavjud emas!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Debt KPI stats side */}
          <div className="bg-white border p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3">Nasiya portfeli tahlili</h4>
              <div className="space-y-3 text-xs font-semibold">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Nasiyasi bor jami mijozlar:</span>
                  <span className="text-red-600 font-bold">
                    {customers.filter(c => c.currentDebt > 0).length} ta
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Mijozlarning jami qarzi:</span>
                  <span className="text-red-700 font-extrabold">
                    {formatMoney(customers.reduce((sum, c) => sum + c.currentDebt, 0))}
                  </span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">To'liq yopilgan qarzlar soni:</span>
                  <span className="text-green-600 font-bold">
                    {debtPayments.length} ta tranzaksiya
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">O'rtacha qarz limiti:</span>
                  <span className="text-slate-900 font-bold">
                    {formatMoney(customers.length > 0 ? Math.round(customers.reduce((sum, c) => sum + c.debtLimit, 0) / customers.length) : 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-50 rounded-xl text-[11px] text-red-700 border border-red-100">
              <span className="font-bold block mb-1">Eslatma!</span>
              <span>Nasiya qarzlarni yig'ish tizimi do'kon likvidligi uchun o'ta muhim. Qarz muddati yakunlangan mijozlarni qizil belgi bilan mijozlar bo'limida ko'ring va xabar bering.</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
