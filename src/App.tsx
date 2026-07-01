import React, { useState, useEffect, useCallback } from 'react';
import {
  User,
  Product,
  Category,
  Customer,
  Sale,
  Debt,
  DebtPayment,
  InventoryMovement,
  StoreSettings,
  Technician,
  ProductionOrder,
} from './types';
import { DEFAULT_SETTINGS } from './data';
import { Bell, Plus } from 'lucide-react';
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
import AppFooter from './components/AppFooter';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import POS from './components/POS';
import Warehouse from './components/Warehouse';
import Customers from './components/Customers';
import Reports from './components/Reports';
import Production from './components/Production';
import SettingsComponent from './components/Settings';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (!localStorage.getItem('pos_access_token')) return null;
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
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [productionOrders, setProductionOrders] = useState<ProductionOrder[]>([]);
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
      setTechnicians(data.technicians ?? []);
      setProductionOrders(data.productionOrders ?? []);
      setSettings(data.settings);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Ishlab chiqarish bo'limi uchun tez yangilash (butun sahifa bloklanmaydi) */
  const refreshProductionData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const data = await fetchBootstrap();
      setTechnicians(data.technicians ?? []);
      setProductionOrders(data.productionOrders ?? []);
      setProducts(data.products);
      setMovements(data.movements);
      if (!opts?.silent) {
        setUsers(data.users);
        setCategories(data.categories);
        setCustomers(data.customers);
        setSales(data.sales);
        setDebts(data.debts);
        setDebtPayments(data.debtPayments);
        setSettings(data.settings);
      }
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  const patchProductionData = useCallback((patch: {
    technicians?: Technician[];
    productionOrders?: ProductionOrder[];
  }) => {
    if (patch.technicians) setTechnicians(patch.technicians);
    if (patch.productionOrders) setProductionOrders(patch.productionOrders);
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('pos_access_token')) {
      setCurrentUser(null);
      localStorage.removeItem('pos_current_user');
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
        supplyPrice: m.supplyPrice,
        salePrice: m.salePrice,
        minStock: m.minStock,
        shkaf: m.shkaf,
        polka: m.polka,
        description: m.description,
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

  const pageTitle =
    activeTab === 'dashboard' ? 'Bosh sahifa' :
    activeTab === 'pos' ? 'Sotuv (POS)' :
    activeTab === 'warehouse' ? 'Ombor' :
    activeTab === 'customers' ? 'Mijozlar va Qarzlar' :
    activeTab === 'production' ? 'Ishlab chiqarish' :
    activeTab === 'reports' ? 'Hisobotlar' : 'Sozlamalar';

  return (
    <div className="h-screen w-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row overflow-hidden">
      <Navbar
        currentUser={currentUser}
        settings={settings}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex flex-col min-h-0 overflow-hidden min-w-0">
        <header className="bg-white border-b border-slate-200/80 flex items-center justify-between px-4 md:px-8 py-4 shrink-0 shadow-sm">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider mb-0.5">
              {pageTitle}
            </p>
            <h1 className="text-lg md:text-xl font-bold text-slate-900 tracking-tight truncate">
              Xush kelibsiz, {currentUser.name}!
            </h1>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {activeTab !== 'pos' && (
              <button
                onClick={() => setActiveTab('pos')}
                className="pos-btn-primary text-xs md:text-sm px-3 md:px-4 py-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Yangi sotuv</span>
              </button>
            )}
            <button
              type="button"
              className="relative p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors cursor-pointer bg-white"
              aria-label="Bildirishnomalar"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
            </button>
            <div className="hidden lg:block text-right">
              <p className="text-sm font-bold text-slate-800 tabular-nums">
                {new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p className="text-[11px] text-slate-400 font-medium">
                {new Date().toLocaleDateString('uz-UZ', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className={`hidden sm:flex items-center gap-1.5 text-[10px] font-semibold rounded-full px-2.5 py-1 border ${
              loading ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${loading ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
              {loading ? 'Yuklanmoqda' : 'Online'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full max-w-full min-h-0">
          {activeTab === 'dashboard' && (
            <Dashboard
              products={products}
              categories={categories}
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
              categories={categories}
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

          {activeTab === 'production' && (
            <Production
              products={products}
              technicians={technicians}
              productionOrders={productionOrders}
              customers={customers.filter((c) => c.status === 'active')}
              settings={settings}
              onRefresh={refreshProductionData}
              onPatchData={patchProductionData}
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

        <AppFooter />
      </div>
    </div>
  );
}
