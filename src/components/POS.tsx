import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, Category, Customer, Sale, User, StoreSettings, SaleItem } from '../types';
import { 
  Search, 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  UserPlus, 
  CreditCard, 
  DollarSign, 
  UserCheck, 
  ShoppingBag, 
  X, 
  Printer, 
  Download, 
  History, 
  RefreshCcw, 
  Check, 
  AlertCircle,
  Camera
} from 'lucide-react';

interface POSProps {
  products: Product[];
  categories: Category[];
  customers: Customer[];
  sales: Sale[];
  currentUser: User;
  settings: StoreSettings;
  onAddSale: (sale: Sale) => void;
  onReturnSale: (saleId: string, reason: string) => void;
  onAddCustomer: (customer: Customer) => void;
  setActiveTab: (tab: string) => void;
}

export default function POS({ 
  products,
  categories,
  customers, 
  sales, 
  currentUser, 
  settings, 
  onAddSale, 
  onReturnSale, 
  onAddCustomer,
  setActiveTab
}: POSProps) {
  // POS States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<'sum' | 'percent'>('sum');
  const [paymentType, setPaymentType] = useState<'cash' | 'debt' | 'mixed'>('cash');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  
  // Cash & Split payment calculation
  const [cashReceived, setCashReceived] = useState<string>('');
  const [mixedCash, setMixedCash] = useState<string>('');
  const [mixedDebt, setMixedDebt] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');

  // Receipt & History Modals
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [createdSale, setCreatedSale] = useState<Sale | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Search filter
  const barcodeSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Focus barcode search on load
    barcodeSearchRef.current?.focus();
  }, []);

  // Format money
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  const categoryFilters = useMemo(() => {
    const cats = new Set(products.map(p => p.categoryId));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const categoryNameById = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  );

  const getCategoryName = (catId: string) => categoryNameById[catId] || 'Boshqa';

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery) ||
                          p.qrCodeData.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch && p.status === 'active';
    });
  }, [products, selectedCategory, searchQuery]);

  // QR / Barcode Search directly (simulate barcode scanner wedge entry)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    const found = products.find(p => p.barcode === code || p.qrCodeData === code);
    if (found) {
      if (found.stock <= 0) {
        alert("Xato: Ushbu tovar omborda qolmagan!");
      } else {
        addToCart(found);
      }
      setBarcodeInput('');
      setScannerError(null);
    } else {
      setScannerError("Skanerlangan tovar topilmadi! Qayta urinib ko'ring yoki qo'lda qidiring.");
    }
  };

  // Cart operations
  const addToCart = (product: Product) => {
    const existing = cart.find(item => item.product.id === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) {
        alert(`Uzr! Omborda faqat ${product.stock} ta tovar mavjud.`);
        return;
      }
      setCart(cart.map(item => 
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      if (product.stock <= 0) {
        alert("Xato: Ushbu tovar omborda qolmagan!");
        return;
      }
      setCart([...cart, { product, quantity: 1 }]);
    }
    // Automatically clear the search query once a product is found and added
    setSearchQuery('');
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      setCart(cart.filter(i => i.product.id !== productId));
    } else {
      if (newQty > item.product.stock) {
        alert(`Uzr! Omborda faqat ${item.product.stock} ta tovar mavjud.`);
        return;
      }
      setCart(cart.map(i => i.product.id === productId ? { ...i, quantity: newQty } : i));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setSelectedCustomerId('');
    setCashReceived('');
    setMixedCash('');
    setMixedDebt('');
  };

  // Cart math
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.product.salePrice * item.quantity, 0);
  }, [cart]);

  const calculatedDiscount = useMemo(() => {
    if (discountType === 'percent') {
      return Math.round((subtotal * discount) / 100);
    }
    return discount;
  }, [subtotal, discount, discountType]);

  const total = useMemo(() => {
    const t = subtotal - calculatedDiscount;
    return t < 0 ? 0 : t;
  }, [subtotal, calculatedDiscount]);

  // Split payment watcher
  useEffect(() => {
    if (paymentType === 'mixed') {
      const half = Math.round(total / 2);
      setMixedCash(String(half));
      setMixedDebt(String(total - half));
    }
  }, [paymentType, total]);

  // Change money calculator
  const changeDue = useMemo(() => {
    if (paymentType !== 'cash') return 0;
    const receivedNum = parseFloat(cashReceived.replace(/,/g, '')) || 0;
    const diff = receivedNum - total;
    return diff > 0 ? diff : 0;
  }, [cashReceived, total, paymentType]);

  // Selected Customer detail helper
  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Process checkout
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert("Xato: Savat bo'sh! Sotish uchun kamida bitta tovar tanlang.");
      return;
    }

    // Customer validation guards
    if (paymentType === 'debt' || paymentType === 'mixed') {
      if (!selectedCustomerId) {
        alert("Xato: Nasiya yoki Aralash to'lov uchun mijozni tanlash majburiydir!");
        return;
      }

      if (selectedCustomer?.status === 'inactive') {
        alert("Xato: Ushbu mijoz nofaol holatda. Nasiyaga savdo qilish taqiqlanadi!");
        return;
      }

      if (selectedCustomer?.allowDebt === false) {
        alert("Xato: Ushbu mijozga nasiya (qarz) berish taqiqlangan! Iltimos, naqd to'lov turini tanlang yoki boshqa mijozni belgilang.");
        return;
      }

      // Debt limit verification
      const pendingDebt = paymentType === 'debt' ? total : (parseFloat(mixedDebt) || 0);
      if (settings.limitBlockSales && selectedCustomer) {
        const potentialTotalDebt = selectedCustomer.currentDebt + pendingDebt;
        if (potentialTotalDebt > selectedCustomer.debtLimit) {
          alert(`Nasiya rad etildi! Mijoz qarzi (${formatMoney(selectedCustomer.currentDebt)}) va yangi qarz (${formatMoney(pendingDebt)}) jami limitdan (${formatMoney(selectedCustomer.debtLimit)}) oshib ketadi.`);
          return;
        }
      }

      // Date check
      if (settings.mandatoryDebtDueDate && !dueDate) {
        alert("Xato: Nasiya to'lov muddatini belgilash sozlamalar bo'yicha majburiydir!");
        return;
      }
    }

    // Capture calculated items
    const saleItems: SaleItem[] = cart.map((item, idx) => ({
      id: `sale-item-${Date.now()}-${idx}`,
      saleId: `sale-${Date.now()}`,
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.salePrice,
      total: item.product.salePrice * item.quantity
    }));

    let cashPaidValue = 0;
    let debtAmountValue = 0;

    if (paymentType === 'cash') {
      cashPaidValue = total;
    } else if (paymentType === 'debt') {
      debtAmountValue = total;
    } else {
      // Mixed
      cashPaidValue = parseFloat(mixedCash) || 0;
      debtAmountValue = parseFloat(mixedDebt) || 0;
    }

    const receiptNo = String(sales.length + 100001).substring(1);

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      receiptNo,
      dateTime: new Date().toISOString(),
      sellerId: currentUser.id,
      sellerName: currentUser.name,
      customerId: selectedCustomerId || undefined,
      customerName: selectedCustomer?.name || undefined,
      totalAmount: subtotal,
      discount: calculatedDiscount,
      finalAmount: total,
      paymentType,
      cashPaid: cashPaidValue,
      debtAmount: debtAmountValue,
      status: 'completed',
      items: saleItems
    };

    onAddSale(newSale);
    setCreatedSale(newSale);
    setShowCheckoutSuccess(true);
    clearCart();
  };

  // Close receipt & clean
  const handleCloseReceipt = () => {
    setShowCheckoutSuccess(false);
    setCreatedSale(null);
  };

  const printReceipt = () => {
    window.print();
  };

  const downloadPDFReceipt = (sale: Sale) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = sale.items.map(item => `
      <tr style="border-bottom: 1px dashed #cbd5e1; font-size: 11px;">
        <td style="padding: 6px 0; font-weight: bold; color: #1e293b;">${item.productName}</td>
        <td style="padding: 6px 0; text-align: center; color: #475569;">${item.quantity} ta</td>
        <td style="padding: 6px 0; text-align: right; color: #475569;">${formatMoney(item.price)}</td>
        <td style="padding: 6px 0; text-align: right; font-weight: bold; color: #1e293b;">${formatMoney(item.total)}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Nukus POS - Chek #${sale.receiptNo}</title>
          <style>
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 74mm;
              margin: 0 auto;
              padding: 20px 10px;
              color: #1e293b;
              font-size: 11px;
              line-height: 1.4;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #475569; margin: 8px 0; }
            .double-divider { border-top: 2px dashed #1e293b; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .footer { margin-top: 15px; font-size: 10px; color: #64748b; }
            @media print {
              body { width: 100%; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <div class="text-center">
            <h2 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 900; letter-spacing: 0.5px;">${settings.storeName.toUpperCase()}</h2>
            <p style="margin: 2px 0; font-size: 10px; color: #475569;">Manzil: ${settings.address}</p>
            <p style="margin: 2px 0; font-size: 10px; color: #475569;">Tel: ${settings.phone}</p>
          </div>
          
          <div class="double-divider"></div>
          
          <div>
            <p style="margin: 3px 0;"><span class="bold">Chek №:</span> #${sale.receiptNo}</p>
            <p style="margin: 3px 0;"><span class="bold">Sana:</span> ${new Date(sale.dateTime).toLocaleString('uz-UZ').replace(',', '')}</p>
            <p style="margin: 3px 0;"><span class="bold">Kassir:</span> ${sale.sellerName}</p>
            <p style="margin: 3px 0;"><span class="bold">Mijoz:</span> ${sale.customerName || 'Umumiy'}</p>
          </div>
          
          <div class="divider"></div>
          
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #1e293b; font-size: 10px; font-weight: bold;">
                <th style="text-align: left; padding-bottom: 4px;">Mahsulot</th>
                <th style="text-align: center; padding-bottom: 4px;">Miqdor</th>
                <th style="text-align: right; padding-bottom: 4px;">Narx</th>
                <th style="text-align: right; padding-bottom: 4px;">Jami</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="divider"></div>
          
          <table style="font-weight: bold;">
            <tr>
              <td style="padding: 2px 0;">Jami summa:</td>
              <td class="text-right">${formatMoney(sale.totalAmount)}</td>
            </tr>
            <tr>
              <td style="padding: 2px 0;">Chegirma:</td>
              <td class="text-right">${formatMoney(sale.discount)}</td>
            </tr>
            <tr style="font-size: 12px; color: #2563eb;">
              <td style="padding: 4px 0;">TO'LANADI:</td>
              <td class="text-right">${formatMoney(sale.finalAmount)}</td>
            </tr>
          </table>
          
          <div class="divider"></div>
          
          <table>
            <tr>
              <td style="padding: 2px 0; color: #16a34a; font-weight: bold;">Naqd to'lov:</td>
              <td class="text-right font-weight: bold; color: #16a34a;">${formatMoney(sale.cashPaid)}</td>
            </tr>
            ${sale.debtAmount > 0 ? `
            <tr>
              <td style="padding: 2px 0; color: #ca8a04; font-weight: bold;">Nasiya summasi:</td>
              <td class="text-right font-weight: bold; color: #ca8a04;">${formatMoney(sale.debtAmount)}</td>
            </tr>
            ` : ''}
          </table>
          
          <div class="double-divider"></div>
          
          <div class="text-center footer">
            <p style="margin: 0; font-weight: bold;">${settings.receiptFooter}</p>
            <p style="margin: 8px 0 0 0; font-size: 8px;">Nukus POS tizimi orqali yaratildi</p>
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

  // Sales list & return actions
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState('');

  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnSaleId || !returnReason.trim()) return;
    onReturnSale(returnSaleId, returnReason);
    setReturnSaleId(null);
    setReturnReason('');
    alert("Sotuv bekor qilindi va tovarlar omborga qaytarildi!");
  };

  return (
    <div className="pos-page select-none print:bg-white">
      
      {/* Print styles override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
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

      {/* Main Column Split */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 no-print w-full">
        
        {/* LEFT COLUMN: Products catalog and searching (7/12 cols) */}
        <div className="w-full lg:col-span-7 flex flex-col space-y-4">
          
          {/* Top Actions: Search & Scanner toggler */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                ref={barcodeSearchRef}
                type="text"
                placeholder="Nomi, kodi yoki shtrix kodini qidiring..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filteredProducts.length === 1) {
                      addToCart(filteredProducts[0]);
                    } else if (filteredProducts.length > 1) {
                      const exactMatch = filteredProducts.find(
                        p => p.barcode === searchQuery.trim() || p.name.toLowerCase() === searchQuery.trim().toLowerCase()
                      );
                      if (exactMatch) {
                        addToCart(exactMatch);
                      }
                    }
                  }
                }}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setBarcodeInput('');
                  setScannerError(null);
                  setShowScannerModal(true);
                }}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 text-sm font-bold transition-colors cursor-pointer"
                title="Barcode skanerlash"
              >
                <Scan className="h-5 w-5 text-blue-600" />
                <span className="hidden sm:inline">QR Skaner</span>
              </button>

              <button
                onClick={() => setShowHistoryModal(true)}
                className="flex items-center justify-center space-x-1.5 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 text-sm font-bold transition-colors cursor-pointer"
              >
                <History className="h-5 w-5 text-slate-600" />
                <span>Tarix</span>
              </button>
            </div>
          </div>

          {/* Categories Horizontal filters */}
          <div className="flex bg-white p-2 rounded-xl border border-slate-200 shadow-sm space-x-1 overflow-x-auto scrollbar-none">
            {categoryFilters.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-50'
                }`}
              >
                {cat === 'all' ? 'Barchasi' : getCategoryName(cat)}
              </button>
            ))}
          </div>

          {/* Catalog Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[580px] p-0.5 scrollbar-thin">
            {filteredProducts.map((prod) => {
              const inCart = cart.find(item => item.product.id === prod.id);
              const isLowStock = prod.stock <= prod.minStock;

              return (
                <div
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  className={`bg-white border rounded-xl p-3 shadow-sm hover:shadow transition-all relative cursor-pointer flex flex-col justify-between group ${
                    prod.stock <= 0 ? 'opacity-50 pointer-events-none' : ''
                  } ${inCart ? 'ring-2 ring-blue-500' : 'border-slate-200'}`}
                >
                  {/* Thumbnail */}
                  <div className="w-full h-24 rounded-lg overflow-hidden bg-slate-100 mb-2.5 relative">
                    {prod.image ? (
                      <img 
                        src={prod.image} 
                        alt={prod.name} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                        {prod.name.slice(0, 2)}
                      </div>
                    )}
                    {prod.stock <= 0 && (
                      <span className="absolute inset-0 bg-black/65 flex items-center justify-center text-[10px] font-bold text-white uppercase tracking-wide">
                        Qolmagan
                      </span>
                    )}
                    {isLowStock && prod.stock > 0 && (
                      <span className="absolute top-1 right-1 bg-amber-500 text-[8px] font-black text-white px-1 py-0.5 rounded uppercase">
                        Kam qoldi
                      </span>
                    )}
                  </div>

                  {/* Body details */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {getCategoryName(prod.categoryId)}
                      </p>
                      {(prod.shkaf || prod.polka) && (
                        <span className="text-[8px] font-bold text-blue-600 bg-blue-50/50 border border-blue-100 rounded px-1" title="Tovar joylashuvi">
                          📍 {prod.shkaf || ''}{prod.shkaf && prod.polka ? '/' : ''}{prod.polka || ''}
                        </span>
                      )}
                    </div>
                    <h5 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
                      {prod.name}
                    </h5>
                    <div className="flex items-center justify-between pt-1.5">
                      <span className="text-xs font-black text-slate-950">
                        {formatMoney(prod.salePrice)}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                        isLowStock ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {prod.stock} dona
                      </span>
                    </div>
                  </div>

                  {/* Quantity pill if in cart */}
                  {inCart && (
                    <span className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-blue-600 text-white font-bold text-[11px] flex items-center justify-center shadow-md animate-bounce">
                      {inCart.quantity}
                    </span>
                  )}
                </div>
              );
            })}
            
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-16 text-center text-slate-400 font-bold bg-white rounded-xl border border-dashed border-slate-300">
                <ShoppingBag className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">Hech qanday tovar topilmadi</p>
                <span className="text-xs font-normal text-slate-400 block mt-1">Qidiruv kalit so'zini o'zgartirib ko'ring</span>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Shopping Cart (5/12 cols) */}
        <div className="w-full lg:col-span-5 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col justify-between max-h-[600px] lg:max-h-[750px] overflow-hidden">
          
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <h3 className="font-extrabold text-sm text-slate-800 flex items-center space-x-1.5">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <span>Xarid Savati</span>
              <span className="bg-blue-100 text-blue-800 font-black text-xs px-2 py-0.5 rounded-full">
                {cart.reduce((s, i) => s + i.quantity, 0)} ta
              </span>
            </h3>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-slate-400 hover:text-red-600 text-xs font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Tozalash</span>
              </button>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin">
            {cart.map((item) => (
              <div key={item.product.id} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                <div className="flex-1">
                  <h6 className="text-xs font-bold text-slate-800 leading-snug">{item.product.name}</h6>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Donasi: {formatMoney(item.product.salePrice)}
                    </p>
                    {(item.product.shkaf || item.product.polka) && (
                      <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded px-1 flex items-center shrink-0">
                        📍 {item.product.shkaf || ''}{item.product.shkaf && item.product.polka ? ' / ' : ''}{item.product.polka || ''}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end space-x-2.5 w-full sm:w-auto">
                  {/* Incrementor */}
                  <div className="flex items-center space-x-1.5 bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/40">
                    <button
                      onClick={() => updateCartQuantity(item.product.id, -1)}
                      className="p-1 rounded bg-white text-slate-600 hover:bg-slate-200 cursor-pointer shadow-sm border border-slate-200/30"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-extrabold text-slate-800 w-5 text-center select-none">{item.quantity}</span>
                    <button
                      onClick={() => updateCartQuantity(item.product.id, 1)}
                      className="p-1 rounded bg-white text-slate-600 hover:bg-slate-200 cursor-pointer shadow-sm border border-slate-200/30"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right w-20">
                    <span className="text-xs font-black text-slate-950">
                      {formatMoney(item.product.salePrice * item.quantity)}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFromCart(item.product.id)}
                    className="p-1 text-slate-300 hover:text-rose-600 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-24 text-center text-slate-400">
                <ShoppingBag className="h-12 w-12 mx-auto mb-3 text-slate-200" />
                <p className="text-sm font-bold">Kassa bo'sh</p>
                <p className="text-xs text-slate-400 mt-1">Sotish uchun chap tomondan tovarlarni tanlang.</p>
              </div>
            )}
          </div>

          {/* Checkout Controls Area */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-4">
            
            {/* Customer select + add shortcut */}
            <div className="flex space-x-2">
              <div className="flex-1">
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">-- Mijozni tanlang (Nasiya uchun shart) --</option>
                  {customers.map((cust) => (
                    <option key={cust.id} value={cust.id}>
                      {cust.name} {cust.allowDebt === false ? '⛔ (Nasiya taqiqlangan)' : ''} {cust.currentDebt > 0 ? `(Qarzi: ${formatMoney(cust.currentDebt)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  const ism = prompt("Yangi mijoz ismini kiriting:");
                  if (ism) {
                    const tel = prompt("Telefon raqamini kiriting (masalan, +998 90 123-45-67):") || '';
                    const yangiMijoz: Customer = {
                      id: `cust-${Date.now()}`,
                      name: ism,
                      phone: tel,
                      debtLimit: settings.defaultDebtLimit,
                      currentDebt: 0,
                      totalSales: 0,
                      status: 'active',
                      allowDebt: true
                    };
                    onAddCustomer(yangiMijoz);
                    setSelectedCustomerId(yangiMijoz.id);
                  }
                }}
                className="p-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 cursor-pointer"
                title="Yangi mijoz qo'shish"
              >
                <UserPlus className="h-4 w-4" />
              </button>
            </div>

            {selectedCustomer && (
              <div className={`p-2 rounded-lg text-[11px] flex items-center justify-between border ${
                selectedCustomer.allowDebt !== false 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100'
                  : 'bg-rose-50 text-rose-800 border-rose-100'
              }`}>
                <div className="flex items-center space-x-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${selectedCustomer.allowDebt !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                  <span className="font-bold">Nasiya holati:</span>
                </div>
                <span className="font-extrabold uppercase text-[10px]">
                  {selectedCustomer.allowDebt !== false ? `Ruxsat etilgan` : 'Taqiqlangan ⛔'}
                </span>
              </div>
            )}

            {/* Discount Section */}
            <div className="flex items-center justify-between text-xs font-bold text-slate-600">
              <span>Chegirma qo'shish:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discount || ''}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-20 px-2 py-1 border border-slate-300 rounded text-right bg-white text-xs"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'sum' | 'percent')}
                  className="px-1.5 py-1 border border-slate-300 rounded bg-white text-xs"
                >
                  <option value="sum">so'm</option>
                  <option value="percent">%</option>
                </select>
              </div>
            </div>

            {/* Payment Mode Selector */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-600 block">To'lov usuli:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setPaymentType('cash')}
                  className={`py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                    paymentType === 'cash'
                      ? 'bg-green-600 border-green-700 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="h-4 w-4 mb-0.5" />
                  Naqd Pul
                </button>

                <button
                  onClick={() => {
                    if (!selectedCustomerId) {
                      alert("Nasiya to'lovi uchun mijoz tanlashingiz shart!");
                    }
                    setPaymentType('debt');
                  }}
                  className={`py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                    paymentType === 'debt'
                      ? 'bg-amber-500 border-amber-600 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <UserCheck className="h-4 w-4 mb-0.5" />
                  Nasiya
                </button>

                <button
                  onClick={() => {
                    if (!selectedCustomerId) {
                      alert("Aralash to'lov uchun mijoz tanlashingiz shart!");
                    }
                    setPaymentType('mixed');
                  }}
                  className={`py-1.5 rounded-lg border text-xs font-bold flex flex-col items-center justify-center cursor-pointer transition-all ${
                    paymentType === 'mixed'
                      ? 'bg-blue-600 border-blue-700 text-white shadow'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CreditCard className="h-4 w-4 mb-0.5" />
                  Aralash
                </button>
              </div>
            </div>

            {/* Detail forms depending on selected payments */}

            {paymentType === 'debt' && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-500">Mijoz qarziga yoziladigan summa:</span>
                  <span className="font-black text-amber-600 text-sm">{formatMoney(total)}</span>
                </div>
                {settings.mandatoryDebtDueDate && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Qaytarish muddati:</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {paymentType === 'mixed' && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Naqd qismi:</label>
                    <input
                      type="number"
                      value={mixedCash}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setMixedCash(e.target.value);
                        setMixedDebt(String(Math.max(0, total - val)));
                      }}
                      className="w-full px-2 py-1 border border-slate-300 rounded text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-600 mb-1">Nasiya qismi:</label>
                    <input
                      type="number"
                      value={mixedDebt}
                      disabled
                      className="w-full px-2 py-1 border border-slate-200 bg-slate-50 rounded text-xs font-bold text-amber-600"
                    />
                  </div>
                </div>
                {settings.mandatoryDebtDueDate && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nasiya qaytarish muddati:</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Calculations Breakdown */}
            <div className="border-t border-slate-200 pt-3 space-y-1.5 text-xs font-semibold text-slate-600">
              <div className="flex justify-between">
                <span>Jami tovarlar summasi:</span>
                <span className="text-slate-800 font-bold">{formatMoney(subtotal)}</span>
              </div>
              {calculatedDiscount > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Chegirma:</span>
                  <span>-{formatMoney(calculatedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 border-t border-slate-200 pt-2">
                <span>TO'LANADI:</span>
                <span className="text-lg text-blue-700">{formatMoney(total)}</span>
              </div>
            </div>

            {/* Huge Sale Trigger */}
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all uppercase tracking-wide cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Check className="h-5 w-5" />
              <span>Sotuvni Yakunlash</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: CHECKOUT SUCCESS / THERMAL RECEIPT DISPLAY */}
      {showCheckoutSuccess && createdSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
            <button
              onClick={handleCloseReceipt}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-4">
              <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Sotuv muvaffaqiyatli yakunlandi!</h3>
              <p className="text-xs text-slate-400 mt-1">Sotuv kodi: #{createdSale.receiptNo}</p>
            </div>

            {/* Simulated Receipt Preview */}
            <div id="print-area" className="border-2 border-dashed border-slate-300 p-4 rounded-lg bg-slate-50/50 max-h-96 overflow-y-auto font-mono text-xs text-slate-800 leading-relaxed whitespace-pre shadow-inner">
{`══════════════════════════════
      ${settings.storeName.toUpperCase()}
  Manzil: ${settings.address.length > 22 ? settings.address.substring(0, 22) + '..' : settings.address}
  Tel: ${settings.phone}
══════════════════════════════
Chek №: ${createdSale.receiptNo}
Sana: ${new Date(createdSale.dateTime).toLocaleString('uz-UZ').replace(',', '')}
Kassir: ${createdSale.sellerName}
${createdSale.customerName ? `Mijoz: ${createdSale.customerName}` : 'Mijoz: Umumiy'}
──────────────────────────────
Mahsulot          Miqdor  Summa
──────────────────────────────
${createdSale.items.map(item => {
  const namePadded = item.productName.substring(0, 15).padEnd(15, ' ');
  const qtyPadded = String(item.quantity).padStart(5, ' ');
  const sumPadded = String(item.total).padStart(10, ' ');
  return `${namePadded} ${qtyPadded} ${sumPadded}`;
}).join('\n')}
──────────────────────────────
Jami:                 ${String(createdSale.totalAmount).padStart(8, ' ')}
Chegirma:             ${String(createdSale.discount).padStart(8, ' ')}
TO'LANADI:            ${String(createdSale.finalAmount).padStart(8, ' ')}
──────────────────────────────
Naqd:                 ${String(createdSale.cashPaid).padStart(8, ' ')}
Nasiya:               ${String(createdSale.debtAmount).padStart(8, ' ')}
──────────────────────────────
${settings.receiptFooter}
══════════════════════════════`}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={printReceipt}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Chop etish</span>
              </button>

              <button
                onClick={() => downloadPDFReceipt(createdSale)}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold text-white cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>PDF yuklash</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CAMERA OR QR SCAN SIMULATOR */}
      {showScannerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowScannerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-4">
              <Camera className="h-5 w-5 text-blue-600" />
              <span>QR va Barcode Skaner (Kamera API)</span>
            </h3>

            {/* Video preview simulation */}
            <div className="w-full h-48 bg-slate-900 rounded-xl relative overflow-hidden flex flex-col items-center justify-center border border-slate-700 mb-4 shadow-inner">
              <div className="absolute inset-x-8 h-0.5 bg-red-500 animate-pulse top-1/2"></div>
              
              {/* Animated camera overlay dots */}
              <div className="absolute inset-10 border border-blue-400 border-dashed rounded opacity-30"></div>

              <div className="text-center z-10 text-slate-400 text-xs px-4">
                <Scan className="h-10 w-10 mx-auto text-blue-500 mb-2 animate-pulse" />
                <p className="font-bold text-slate-300">Kamera oqimi simulyatsiya qilinmoqda</p>
                <p className="text-[10px] text-slate-500 mt-1">Haqiqiy skanerlash uchun shtrix kodni quyida tanlang</p>
              </div>
            </div>

            {scannerError && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-3 rounded-md flex items-start space-x-2 text-xs text-red-700 font-semibold">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{scannerError}</span>
              </div>
            )}

            {/* Virtual Barcode click trigger for test convenience inside frame */}
            <form onSubmit={handleBarcodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Shtrix kod kiritish (yoki kassa o'quvchi orqali kiruvchi kod):
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    required
                    placeholder="Masalan: 4820000190013 (Coca-cola)"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Kiritish
                  </button>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tezkor shtrix kod simulyatsiyasi:</span>
                <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto text-xs p-1 bg-slate-50 border rounded-lg">
                  {products.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setBarcodeInput(p.barcode);
                        // Auto fire
                        const found = products.find(prod => prod.barcode === p.barcode);
                        if (found) {
                          addToCart(found);
                          setShowScannerModal(false);
                          setBarcodeInput('');
                        }
                      }}
                      className="text-left px-2 py-1.5 border border-slate-200 bg-white hover:border-blue-500 hover:bg-blue-50/25 rounded flex flex-col justify-between text-[10px] space-y-1"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-bold text-slate-700 truncate pr-1">{p.name}</span>
                        <span className="text-[8px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded shrink-0">{p.barcode.slice(-4)}</span>
                      </div>
                      {(p.shkaf || p.polka) && (
                        <span className="text-[8px] font-bold text-blue-600 bg-blue-50 px-1 rounded self-start">
                          📍 {p.shkaf || ''}{p.shkaf && p.polka ? ' / ' : ''}{p.polka || ''}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SALES HISTORY AND RETURN VIEW */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowHistoryModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-4">
              <History className="h-5 w-5 text-blue-600" />
              <span>Sotuvlar Tarixi va Bekor qilish</span>
            </h3>

            {/* Sales table */}
            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Chek №</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3 hidden md:table-cell">Sotuvchi</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Mijoz</th>
                    <th className="px-4 py-3 text-right">Jami summa</th>
                    <th className="px-4 py-3 hidden md:table-cell">To'lov usuli</th>
                    <th className="px-4 py-3 hidden sm:table-cell">Holat</th>
                    <th className="px-4 py-3 text-center">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                  {sales.map((sale) => (
                    <tr key={sale.id} className={sale.status === 'returned' ? 'bg-red-50/20' : ''}>
                      <td className="px-4 py-3 text-blue-600 font-bold">
                        <div>#{sale.receiptNo}</div>
                        <div className="text-[9px] text-slate-400 block sm:hidden">{sale.customerName || 'Umumiy'}</div>
                      </td>
                      <td className="px-4 py-3 text-[11px] font-normal text-slate-400">
                        {new Date(sale.dateTime).toLocaleDateString('uz-UZ')}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">{sale.sellerName}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">{sale.customerName || 'Umumiy'}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-black">{formatMoney(sale.finalAmount)}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${
                          sale.paymentType === 'cash' ? 'bg-green-50 text-green-700 border-green-100' :
                          sale.paymentType === 'debt' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                          'bg-blue-50 text-blue-700 border-blue-100'
                        }`}>
                          {sale.paymentType === 'cash' ? 'Naqd' : sale.paymentType === 'debt' ? 'Nasiya' : 'Aralash'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {sale.status === 'completed' ? (
                          <span className="text-emerald-600 text-[10px] font-bold flex items-center space-x-1">
                            <Check className="h-3 w-3" />
                            <span>Muvaffaqiyatli</span>
                          </span>
                        ) : (
                          <span className="text-red-500 text-[10px] font-bold flex flex-col">
                            <span>Qaytarilgan</span>
                            <span className="text-[9px] font-normal text-slate-400 italic">"{sale.returnReason}"</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {sale.status === 'completed' && (currentUser.role === 'admin' || currentUser.role === 'manager') ? (
                          <button
                            onClick={() => setReturnSaleId(sale.id)}
                            className="px-2.5 py-1 text-red-600 hover:bg-red-50 border border-red-100 hover:border-red-200 rounded text-[10px] font-bold cursor-pointer inline-flex items-center space-x-1"
                          >
                            <RefreshCcw className="h-3 w-3" />
                            <span>Qaytarish</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Taqiqlangan</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Refund/Return Modal Overlay specifically inside history */}
            {returnSaleId && (
              <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
                <div className="bg-white rounded-xl p-5 max-w-sm w-full shadow-2xl relative">
                  <button
                    onClick={() => setReturnSaleId(null)}
                    className="absolute top-3 right-3 text-slate-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <h4 className="font-extrabold text-sm text-slate-800 mb-3">Sotuvni bekor qilish / Qaytarish</h4>
                  <form onSubmit={handleReturnSubmit} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Qaytarish sababini kiriting (majburiy):</label>
                      <textarea
                        required
                        placeholder="Masalan: muddati o'tgan yoki yaroqsiz mahsulot, mijoz rad etdi.."
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs min-h-[80px]"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setReturnSaleId(null)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-xs font-semibold cursor-pointer"
                      >
                        Bekor qilish
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer"
                      >
                        Qaytarishni Tasdiqlash
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
