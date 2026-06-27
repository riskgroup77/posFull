import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  UserRole,
  Product,
  Category,
  Customer,
  Sale,
  Debt,
  DebtPayment,
  InventoryMovement,
  StoreSettings,
} from './types';
import { DEFAULT_SETTINGS } from './data';
import { Store } from 'lucide-react';
import {
  fetchBootstrap,
  logout as apiLogout,
  createSale,
  returnSale,
  repayDebt,
  createProduct,
  updateProduct,
  deleteProduct,
  createCategory,
  deleteCategory,
  createCustomer,
  updateCustomer,
  createMovement,
  bulkImportProducts,
  updateSettings,
  createUser,
  updateUser,
  resetAllData,
} from './api';
import { ApiError } from './api/client';

import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Warehouse from './components/Warehouse';
import Customers from './components/Customers';
import Reports from './components/Reports';
import SettingsComponent from './components/Settings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pos_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('pos_active_tab') || 'dashboard';
  });

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [debtPayments, setDebtPayments] = useState<DebtPayment[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);

  const loadBootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBootstrap();
      setUsers(data.users);
      setProducts(data.products);
      setCategories(data.categories);
      setCustomers(data.customers);
      setSales(data.sales);
      setDebts(data.debts);
      setDebtPayments(data.debtPayments);
      setMovements(data.movements);
      setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('pos_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('pos_current_user');
    }
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('pos_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentUser && localStorage.getItem('pos_access_token')) {
      loadBootstrap().catch(() => {
        apiLogout();
        setCurrentUser(null);
      });
    }
  }, [currentUser, loadBootstrap]);

  useEffect(() => {
    const handleDemoSwitchRole = (e: Event) => {
      const customEvent = e as CustomEvent;
      const targetRole = customEvent.detail as UserRole;
      const matchingUser = users.find((u) => u.role === targetRole && u.status === 'active');
      if (matchingUser) {
        setCurrentUser(matchingUser);
        setActiveTab(targetRole === UserRole.SELLER ? 'pos' : 'dashboard');
      }
    };
    window.addEventListener('demo-switch-role', handleDemoSwitchRole);
    return () => window.removeEventListener('demo-switch-role', handleDemoSwitchRole);
  }, [users]);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    apiLogout();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const showError = (err: unknown) => {
    const msg = err instanceof ApiError ? err.message : 'Xatolik yuz berdi';
    alert(msg);
  };

  const handleAddSale = async (newSale: Sale) => {
    try {
      await createSale({
        dateTime: newSale.dateTime,
        customerId: newSale.customerId,
        totalAmount: newSale.totalAmount,
        discount: newSale.discount,
        finalAmount: newSale.finalAmount,
        paymentType: newSale.paymentType,
        cashPaid: newSale.cashPaid,
        debtAmount: newSale.debtAmount,
        items: newSale.items.map((i) => ({
          id: i.id,
          saleId: i.saleId,
          productId: i.productId,
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
          total: i.total,
        })),
      });
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleReturnSale = async (saleId: string, reason: string) => {
    try {
      await returnSale(saleId, reason);
      await loadBootstrap();
      alert('Sotuv muvaffaqiyatli qaytarildi!');
    } catch (err) {
      showError(err);
    }
  };

  const handleRepayDebt = async (customerId: string, amount: number) => {
    try {
      await repayDebt(customerId, amount);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleAddProduct = async (p: Product) => {
    try {
      await createProduct(p);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleUpdateProduct = async (p: Product) => {
    try {
      await updateProduct(p);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteProduct = async (pId: string) => {
    try {
      await deleteProduct(pId);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleAddCategory = async (c: Category) => {
    try {
      await createCategory(c);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await deleteCategory(catId);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleAddCustomer = async (c: Customer) => {
    try {
      await createCustomer(c);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleUpdateCustomer = async (c: Customer) => {
    try {
      await updateCustomer(c);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleAddUser = async (u: User, password: string) => {
    try {
      await createUser({
        name: u.name,
        email: u.email,
        role: u.role,
        password,
      });
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleUpdateUser = async (u: User) => {
    try {
      await updateUser(u.id, { name: u.name, role: u.role, status: u.status });
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleAddMovement = async (m: InventoryMovement) => {
    try {
      await createMovement({
        productId: m.productId,
        quantity: m.quantity,
        type: m.type,
        reason: m.reason,
        docNo: m.docNo,
      });
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleUpdateSettings = async (s: StoreSettings) => {
    try {
      const updated = await updateSettings(s);
      setSettings(updated);
    } catch (err) {
      showError(err);
    }
  };

  const handleClearAllData = async () => {
    try {
      await resetAllData();
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  const handleBulkImport = async (
    importedProds: Product[],
    duplicateAction: 'update_stock' | 'overwrite' | 'skip' = 'update_stock',
  ) => {
    try {
      await bulkImportProducts(importedProds, duplicateAction);
      await loadBootstrap();
    } catch (err) {
      showError(err);
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="h-screen w-screen bg-[#F8FAFC] font-sans text-[#1E293B] flex flex-col md:flex-row overflow-hidden">
      <Navbar
        currentUser={currentUser}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 md:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-base md:text-lg font-bold text-slate-800 tracking-tight capitalize">
              {activeTab === 'dashboard' ? 'Bosh sahifa' :
               activeTab === 'pos' ? 'Sotuv (POS)' :
               activeTab === 'warehouse' ? 'Ombor' :
               activeTab === 'customers' ? 'Mijozlar va Qarzlar' :
               activeTab === 'reports' ? 'Hisobotlar' : 'Sozlamalar'}
            </h1>
            <div className="hidden sm:flex items-center space-x-1 text-xs text-blue-600 bg-blue-50 rounded-full px-2.5 py-0.5 border border-blue-100">
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-blue-500'}`}></span>
              <span className="font-semibold text-[10px] tracking-wide uppercase">
                {loading ? 'Yuklanmoqda...' : 'API Ulangan'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {activeTab !== 'pos' && (
              <button
                onClick={() => setActiveTab('pos')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-semibold shadow-sm transition-all cursor-pointer border-none"
              >
                <Store className="w-4 h-4" />
                Yangi sotuv
              </button>
            )}
            <div className="h-8 w-px bg-slate-200"></div>
            <p className="text-xs md:text-sm font-semibold text-slate-500">
              {new Date().toLocaleDateString('uz-UZ', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-full">
          {activeTab === 'dashboard' && (
            <Dashboard
              products={products}
              customers={customers}
              sales={sales}
              debts={debts}
              currentUser={currentUser}
              setActiveTab={setActiveTab}
              onQuickAddProduct={() => setActiveTab('warehouse')}
              onQuickAddCustomer={() => setActiveTab('customers')}
            />
          )}

          {activeTab === 'pos' && (
            <POS
              products={products.filter((p) => p.status === 'active')}
              customers={customers.filter((c) => c.status === 'active')}
              sales={sales}
              currentUser={currentUser}
              settings={settings}
              onAddSale={handleAddSale}
              onReturnSale={handleReturnSale}
              onAddCustomer={handleAddCustomer}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'warehouse' && (
            <Warehouse
              products={products}
              categories={categories}
              movements={movements}
              currentUser={currentUser}
              settings={settings}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddMovement={handleAddMovement}
              onBulkImport={handleBulkImport}
            />
          )}

          {activeTab === 'customers' && (
            <Customers
              customers={customers}
              debts={debts}
              debtPayments={debtPayments}
              sales={sales}
              currentUser={currentUser}
              settings={settings}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onRepayDebt={handleRepayDebt}
            />
          )}

          {activeTab === 'reports' && (
            <Reports
              sales={sales}
              products={products}
              customers={customers}
              debtPayments={debtPayments}
              currentUser={currentUser}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsComponent
              settings={settings}
              users={users}
              currentUser={currentUser}
              onUpdateSettings={handleUpdateSettings}
              onAddUser={handleAddUser}
              onUpdateUser={handleUpdateUser}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>

        <footer className="h-12 bg-white border-t border-slate-200 px-6 md:px-8 flex items-center justify-between text-[11px] md:text-xs text-slate-500 shrink-0 select-none">
          <div className="flex items-center gap-3 md:gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Tizim faol
            </span>
            <span className="hidden sm:inline">Filial: Asosiy do'kon</span>
            <span>Valyuta: {settings.currency || "so'm"}</span>
          </div>
          <div className="flex gap-4">
            <span>Versiya 1.0</span>
            <span className="hidden md:inline">Xodim: {currentUser.name} ({currentUser.role})</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
