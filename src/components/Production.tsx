import React, { useState, useEffect, useMemo } from 'react';
import {
  Product,
  Technician,
  ProductionOrder,
  ProductionOrderStatus,
  StoreSettings,
  Customer,
  ProductionReport,
  LaborType,
} from '../types';
import MoneyDisplay from './MoneyDisplay';
import {
  fetchProductionReport,
  createTechnician,
  updateTechnician,
  deleteTechnician,
  createProductionOrder,
  updateProductionOrder,
  cancelProductionOrder,
  addPartToProductionOrder,
  removePartFromProductionOrder,
  completeProductionOrder,
  sellProductionOrder,
} from '../api';
import { ApiError } from '../api/client';
import {
  Factory,
  Plus,
  Wrench,
  BarChart3,
  X,
  Trash2,
  CheckCircle,
  ShoppingCart,
  Package,
  Pencil,
  Eye,
} from 'lucide-react';

interface ProductionProps {
  products: Product[];
  technicians: Technician[];
  productionOrders: ProductionOrder[];
  customers: Customer[];
  settings: StoreSettings;
  onRefresh: (opts?: { silent?: boolean }) => Promise<void>;
  onPatchData?: (patch: {
    technicians?: Technician[];
    productionOrders?: ProductionOrder[];
  }) => void;
}

const STATUS_LABELS: Record<ProductionOrderStatus, string> = {
  draft: 'Qoralama',
  in_progress: 'Jarayonda',
  completed: 'Tayyor',
  sold: 'Sotilgan',
  cancelled: 'Bekor qilingan',
};

const STATUS_COLORS: Record<ProductionOrderStatus, string> = {
  draft: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-amber-50 text-amber-700',
  completed: 'bg-emerald-50 text-emerald-700',
  sold: 'bg-blue-50 text-blue-700',
  cancelled: 'bg-red-50 text-red-600',
};

const LABOR_LABELS: Record<LaborType, string> = {
  daily: 'Kunlik haq',
  per_unit: 'Uskuna (dona) bo\'yicha',
};

const LABOR_QTY_LABELS: Record<LaborType, string> = {
  daily: 'Rejalashtirilgan ish kunlari',
  per_unit: 'Uskuna soni',
};

function emptyOrderForm() {
  return {
    title: '',
    technicianId: '',
    laborType: 'daily' as LaborType,
    laborQuantity: 1,
    notes: '',
    useTechnicianDefault: true,
  };
}

function emptyTechForm() {
  return {
    name: '',
    phone: '',
    dailyRate: 0,
    perUnitRate: 0,
    defaultLaborType: 'daily' as LaborType,
    status: 'active' as 'active' | 'inactive',
    notes: '',
  };
}

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Production({
  products,
  technicians,
  productionOrders,
  customers,
  settings,
  onRefresh,
  onPatchData,
}: ProductionProps) {
  const [subTab, setSubTab] = useState<'orders' | 'technicians' | 'report'>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [reportMonth, setReportMonth] = useState(currentMonth());
  const [report, setReport] = useState<ProductionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [showNewTech, setShowNewTech] = useState(false);
  const [showSell, setShowSell] = useState(false);

  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  const [techForm, setTechForm] = useState(emptyTechForm);
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [partProductId, setPartProductId] = useState('');
  const [partQty, setPartQty] = useState(1);

  const [sellForm, setSellForm] = useState({
    paymentType: 'cash' as 'cash' | 'debt' | 'mixed',
    customerId: '',
    cashPaid: 0,
    debtAmount: 0,
    discount: 0,
    sellingPrice: 0,
    debtDueDate: '',
  });

  const selectedOrder = useMemo(
    () => productionOrders.find((o) => o.id === selectedOrderId) ?? null,
    [productionOrders, selectedOrderId],
  );

  const activeProducts = products.filter((p) => p.status === 'active' && p.stock > 0);

  const visibleOrders = useMemo(
    () => productionOrders.filter((o) => o.status !== 'cancelled'),
    [productionOrders],
  );

  const applyTechnicianDefaults = (technicianId: string, prev: ReturnType<typeof emptyOrderForm>) => {
    const tech = technicians.find((t) => t.id === technicianId);
    if (!tech || !prev.useTechnicianDefault) return { ...prev, technicianId };
    return {
      ...prev,
      technicianId,
      laborType: tech.defaultLaborType,
    };
  };

  const openEditOrder = (order: ProductionOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingOrderId(order.id);
    setOrderForm({
      title: order.title,
      technicianId: order.technicianId,
      laborType: order.laborType ?? 'daily',
      laborQuantity: order.laborQuantity ?? order.workDays ?? 1,
      notes: order.notes || '',
      useTechnicianDefault: false,
    });
    setShowEditOrder(true);
  };

  const handleDeleteOrder = (order: ProductionOrder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (order.status === 'sold') {
      alert('Sotilgan buyurtmani o\'chirib bo\'lmaydi');
      return;
    }
    const msg = order.status === 'cancelled'
      ? 'Buyurtmani butunlay o\'chirish?'
      : 'Buyurtmani bekor qilish va qismlarni omborga qaytarish?';
    if (!confirm(msg)) return;
    void run(async () => {
      await cancelProductionOrder(order.id);
      onPatchData?.({
        productionOrders: productionOrders.filter((o) => o.id !== order.id),
      });
      if (selectedOrderId === order.id) setSelectedOrderId(null);
    });
  };

  const showError = (err: unknown) => {
    alert(err instanceof ApiError ? err.message : 'Xatolik yuz berdi');
  };

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      void onRefresh({ silent: true });
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (subTab !== 'report') return;
    setReportLoading(true);
    fetchProductionReport(reportMonth)
      .then(setReport)
      .catch(showError)
      .finally(() => setReportLoading(false));
  }, [subTab, reportMonth]);

  useEffect(() => {
    if (selectedOrder) {
      setSellForm((f) => ({
        ...f,
        sellingPrice: selectedOrder.sellingPrice,
        cashPaid: selectedOrder.sellingPrice,
        debtAmount: 0,
      }));
    }
  }, [selectedOrder?.id, selectedOrder?.sellingPrice]);

  const handleCreateOrder = () =>
    void run(async () => {
      if (!orderForm.title.trim()) throw new Error('Buyurtma nomi kerak');
      if (!orderForm.technicianId) throw new Error('Usta tanlanishi shart');
      if (orderForm.laborQuantity < 1) throw new Error('Miqdor kamida 1 bo\'lishi kerak');
      const order = await createProductionOrder({
        title: orderForm.title.trim(),
        technicianId: orderForm.technicianId,
        laborType: orderForm.laborType,
        laborQuantity: orderForm.laborQuantity,
        marginPercent: settings.productionMarginPercent ?? 20,
        notes: orderForm.notes,
      });
      onPatchData?.({ productionOrders: [order, ...productionOrders] });
      setShowNewOrder(false);
      setOrderForm(emptyOrderForm());
      setSelectedOrderId(order.id);
    });

  const handleUpdateOrder = () =>
    void run(async () => {
      if (!editingOrderId) throw new Error('Buyurtma topilmadi');
      if (!orderForm.title.trim()) throw new Error('Buyurtma nomi kerak');
      const updated = await updateProductionOrder(editingOrderId, {
        title: orderForm.title.trim(),
        technicianId: orderForm.technicianId,
        laborType: orderForm.laborType,
        laborQuantity: orderForm.laborQuantity,
        notes: orderForm.notes,
      });
      onPatchData?.({
        productionOrders: productionOrders.map((o) => (o.id === updated.id ? updated : o)),
      });
      setShowEditOrder(false);
      setEditingOrderId(null);
      setOrderForm(emptyOrderForm());
    });

  const handleSaveTech = () =>
    void run(async () => {
      if (!techForm.name.trim()) throw new Error('Usta ismi kerak');
      if (editingTechId) {
        const saved = await updateTechnician({
          id: editingTechId,
          name: techForm.name.trim(),
          phone: techForm.phone,
          dailyRate: techForm.dailyRate,
          perUnitRate: techForm.perUnitRate,
          defaultLaborType: techForm.defaultLaborType,
          status: techForm.status,
          notes: techForm.notes,
        });
        onPatchData?.({
          technicians: technicians.map((t) => (t.id === saved.id ? saved : t)),
        });
      } else {
        const saved = await createTechnician({
          name: techForm.name.trim(),
          phone: techForm.phone,
          dailyRate: techForm.dailyRate,
          perUnitRate: techForm.perUnitRate,
          defaultLaborType: techForm.defaultLaborType,
          status: techForm.status,
          notes: techForm.notes,
        });
        onPatchData?.({ technicians: [...technicians, saved] });
      }
      setShowNewTech(false);
      setEditingTechId(null);
      setTechForm(emptyTechForm());
    });

  const handleDeleteTech = (t: Technician) => {
    if (!confirm(`"${t.name}" ustasini o'chirish?`)) return;
    void run(async () => {
      await deleteTechnician(t.id);
      onPatchData?.({ technicians: technicians.filter((x) => x.id !== t.id) });
    });
  };

  const handleAddPart = () =>
    void run(async () => {
      if (!selectedOrder) throw new Error('Buyurtma tanlanmagan');
      if (!partProductId) throw new Error('Qism tanlang');
      if (partQty <= 0) throw new Error('Miqdor noto\'g\'ri');
      const updated = await addPartToProductionOrder(selectedOrder.id, partProductId, partQty);
      onPatchData?.({
        productionOrders: productionOrders.map((o) => (o.id === updated.id ? updated : o)),
      });
      setPartProductId('');
      setPartQty(1);
    });

  const handleComplete = () =>
    void run(async () => {
      if (!selectedOrder) throw new Error('Buyurtma tanlanmagan');
      const updated = await completeProductionOrder(selectedOrder.id);
      onPatchData?.({
        productionOrders: productionOrders.map((o) => (o.id === updated.id ? updated : o)),
      });
    });

  const handleSell = () =>
    void run(async () => {
      if (!selectedOrder) throw new Error('Buyurtma tanlanmagan');
      const { order } = await sellProductionOrder(selectedOrder.id, {
        payment_type: sellForm.paymentType,
        customerId: sellForm.customerId || undefined,
        cashPaid: sellForm.cashPaid,
        debtAmount: sellForm.debtAmount,
        discount: sellForm.discount,
        sellingPrice: sellForm.sellingPrice,
        debtDueDate: sellForm.debtDueDate || undefined,
      });
      onPatchData?.({
        productionOrders: productionOrders.map((o) => (o.id === order.id ? order : o)),
      });
      setShowSell(false);
    });

  const laborBreakdown = (order: ProductionOrder) => {
    const qty = order.laborQuantity ?? order.workDays ?? 1;
    const laborType = order.laborType ?? 'daily';
    if (laborType === 'daily') {
      const daily = order.dailyRateSnapshot * qty;
      return { type: 'daily' as LaborType, qty, rate: order.dailyRateSnapshot, total: daily };
    }
    const unit = order.perUnitRateSnapshot * qty;
    return { type: 'per_unit' as LaborType, qty, rate: order.perUnitRateSnapshot, total: unit };
  };

  const canEditOrder = (order: ProductionOrder) =>
    order.status === 'draft' || order.status === 'in_progress' || order.status === 'completed';

  const renderOrderFormFields = (isEdit: boolean) => (
    <>
      <Field label="Uskuna nomi">
        <input
          className="w-full border border-slate-200 rounded-lg px-3 py-2"
          value={orderForm.title}
          onChange={(e) => setOrderForm({ ...orderForm, title: e.target.value })}
          placeholder="Masalan: Konditsioner montaj"
        />
      </Field>
      <Field label="Usta">
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2"
          value={orderForm.technicianId}
          onChange={(e) => setOrderForm((prev) => applyTechnicianDefaults(e.target.value, prev))}
        >
          <option value="">Tanlang...</option>
          {technicians.filter((t) => t.status === 'active').map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </Field>
      {!isEdit && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={orderForm.useTechnicianDefault}
            onChange={(e) => {
              const checked = e.target.checked;
              setOrderForm((prev) => {
                const next = { ...prev, useTechnicianDefault: checked };
                if (checked && prev.technicianId) {
                  const tech = technicians.find((t) => t.id === prev.technicianId);
                  if (tech) next.laborType = tech.defaultLaborType;
                }
                return next;
              });
            }}
          />
          Ustaning standart ish haqi turidan foydalanish
        </label>
      )}
      <Field label="Ish haqi turi">
        <select
          className="w-full border border-slate-200 rounded-lg px-3 py-2"
          value={orderForm.laborType}
          onChange={(e) => setOrderForm({
            ...orderForm,
            laborType: e.target.value as LaborType,
            useTechnicianDefault: false,
          })}
        >
          <option value="daily">{LABOR_LABELS.daily}</option>
          <option value="per_unit">{LABOR_LABELS.per_unit}</option>
        </select>
      </Field>
      <Field label={LABOR_QTY_LABELS[orderForm.laborType]}>
        <input
          type="number"
          min={1}
          className="w-full border border-slate-200 rounded-lg px-3 py-2"
          value={orderForm.laborQuantity}
          onChange={(e) => setOrderForm({ ...orderForm, laborQuantity: Number(e.target.value) })}
        />
      </Field>
      <Field label="Izoh (ixtiyoriy)">
        <textarea
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
          rows={2}
          value={orderForm.notes}
          onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
        />
      </Field>
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'orders' as const, label: 'Buyurtmalar', icon: Factory },
          { id: 'technicians' as const, label: 'Ustalar', icon: Wrench },
          { id: 'report' as const, label: 'Hisobot', icon: BarChart3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
              subTab === id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {subTab === 'orders' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Ishlab chiqarish buyurtmalari</h2>
              <button
                type="button"
                onClick={() => {
                  if (technicians.filter((t) => t.status === 'active').length === 0) {
                    alert('Avval kamida bitta usta qo\'shing (Ustalar bo\'limi).');
                    setSubTab('technicians');
                    setEditingTechId(null);
                    setTechForm(emptyTechForm());
                    setShowNewTech(true);
                    return;
                  }
                  setOrderForm(emptyOrderForm());
                  setShowNewOrder(true);
                }}
                className="pos-btn-primary text-xs py-2 px-3"
              >
                <Plus className="w-4 h-4" />
                Yangi
              </button>
            </div>

            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {visibleOrders.length === 0 && (
                <p className="text-sm text-slate-500 p-4 bg-white rounded-xl border">Buyurtmalar yo&apos;q</p>
              )}
              {visibleOrders.map((order) => (
                <div
                  key={order.id}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedOrderId === order.id
                      ? 'border-blue-400 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <button type="button" onClick={() => setSelectedOrderId(order.id)} className="w-full text-left">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <p className="font-bold text-slate-800">{order.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {order.orderNo} · {order.technicianName} · {LABOR_LABELS[order.laborType ?? 'daily']}
                        </p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-600">
                      <MoneyDisplay amountUzs={order.totalCost} usdRate={settings.usdRate} uzsClassName="font-semibold" />
                    </div>
                  </button>
                  <div className="mt-3 flex gap-2 border-t border-slate-100 pt-2">
                    {canEditOrder(order) && (
                      <button
                        type="button"
                        onClick={(e) => openEditOrder(order, e)}
                        className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Tahrirlash
                      </button>
                    )}
                    {order.status !== 'sold' && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteOrder(order, e)}
                        className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {order.status === 'cancelled' ? 'O\'chirish' : 'Bekor qilish'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="xl:col-span-2">
            {!selectedOrder ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                <Factory className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                Buyurtmani tanlang yoki yangi yarating
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{selectedOrder.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      {selectedOrder.orderNo} · Usta: <strong>{selectedOrder.technicianName}</strong>
                      {' · '}{LABOR_LABELS[selectedOrder.laborType ?? 'daily']}
                      {' · '}{LABOR_QTY_LABELS[selectedOrder.laborType ?? 'daily']}: <strong>{selectedOrder.laborQuantity ?? selectedOrder.workDays ?? 1}</strong>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canEditOrder(selectedOrder) && (
                      <button
                        type="button"
                        onClick={() => openEditOrder(selectedOrder)}
                        className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                        title="Tahrirlash"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    )}
                    <span className={`h-fit text-xs font-bold px-3 py-1 rounded-full ${STATUS_COLORS[selectedOrder.status]}`}>
                      {STATUS_LABELS[selectedOrder.status]}
                    </span>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Qismlar', value: selectedOrder.partsCost },
                    { label: 'Ish haqi', value: selectedOrder.laborCost },
                    { label: 'Jami tannarx', value: selectedOrder.totalCost },
                    { label: 'Sotuv narxi', value: selectedOrder.sellingPrice },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-3">
                      <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
                      <MoneyDisplay amountUzs={value} usdRate={settings.usdRate} uzsClassName="text-sm font-bold text-slate-800" />
                    </div>
                  ))}
                </div>

                <div className="px-6 pb-4">
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-sm">
                    <p className="font-bold text-amber-800 mb-2">Usta ish haqi tafsiloti — {LABOR_LABELS[laborBreakdown(selectedOrder).type]}</p>
                    <p className="text-amber-900">
                      {laborBreakdown(selectedOrder).rate.toLocaleString()} × {laborBreakdown(selectedOrder).qty}{' '}
                      {selectedOrder.laborType === 'daily' ? 'kun' : 'dona'} ={' '}
                      <strong>{laborBreakdown(selectedOrder).total.toLocaleString()}</strong> so&apos;m
                    </p>
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Sarflangan qismlar
                  </h4>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                        <tr>
                          <th className="text-left p-3">Mahsulot</th>
                          <th className="text-right p-3">Miqdor</th>
                          <th className="text-right p-3">Narx</th>
                          <th className="text-right p-3">Jami</th>
                          {(selectedOrder.status === 'draft' || selectedOrder.status === 'in_progress') && (
                            <th className="p-3 w-10" />
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {selectedOrder.items.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-slate-400">Qismlar qo&apos;shilmagan</td>
                          </tr>
                        ) : (
                          selectedOrder.items.map((item) => (
                            <tr key={item.id} className="border-t border-slate-100">
                              <td className="p-3 font-medium">{item.productName}</td>
                              <td className="p-3 text-right tabular-nums">{item.quantity}</td>
                              <td className="p-3 text-right tabular-nums">{item.unitCost.toLocaleString()}</td>
                              <td className="p-3 text-right tabular-nums font-semibold">{item.total.toLocaleString()}</td>
                              {(selectedOrder.status === 'draft' || selectedOrder.status === 'in_progress') && (
                                <td className="p-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      run(() => removePartFromProductionOrder(selectedOrder.id, item.id))
                                    }
                                    className="text-red-500 hover:text-red-700"
                                    disabled={busy}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {(selectedOrder.status === 'draft' || selectedOrder.status === 'in_progress') && (
                    <div className="mt-4 flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold text-slate-500">Qism tanlash</label>
                        <select
                          className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={partProductId}
                          onChange={(e) => setPartProductId(e.target.value)}
                        >
                          <option value="">Tanlang...</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (qoldiq: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24">
                        <label className="text-xs font-semibold text-slate-500">Miqdor</label>
                        <input
                          type="number"
                          min={0.01}
                          step={1}
                          className="w-full mt-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
                          value={partQty}
                          onChange={(e) => setPartQty(Number(e.target.value))}
                        />
                      </div>
                      <button type="button" onClick={handleAddPart} className="pos-btn-primary py-2" disabled={busy}>
                        Qo&apos;shish
                      </button>
                    </div>
                  )}
                </div>

                <div className="px-6 pb-6 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                  {(selectedOrder.status === 'draft' || selectedOrder.status === 'in_progress') && (
                    <>
                      <button type="button" onClick={handleComplete} className="pos-btn-primary" disabled={busy}>
                        <CheckCircle className="w-4 h-4" />
                        Yakunlash
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(selectedOrder)}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                        disabled={busy}
                      >
                        Bekor qilish
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'completed' && (
                    <>
                      <button type="button" onClick={() => openEditOrder(selectedOrder)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold hover:bg-slate-50" disabled={busy}>
                        <Pencil className="w-4 h-4 inline mr-1" />
                        Tahrirlash
                      </button>
                      <button type="button" onClick={() => setShowSell(true)} className="pos-btn-primary" disabled={busy}>
                        <ShoppingCart className="w-4 h-4" />
                        Sotish
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteOrder(selectedOrder)}
                        className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50"
                        disabled={busy}
                      >
                        Bekor qilish
                      </button>
                    </>
                  )}
                  {selectedOrder.status === 'sold' && selectedOrder.saleId && (
                    <div className="text-sm text-emerald-700 font-semibold bg-emerald-50 px-4 py-2 rounded-xl">
                      Sotildi · Foyda:{' '}
                      <MoneyDisplay
                        amountUzs={selectedOrder.profit}
                        usdRate={settings.usdRate}
                        inline
                        uzsClassName="font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'technicians' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold">Ustalar ro&apos;yxati</h2>
            <button type="button" onClick={() => { setEditingTechId(null); setShowNewTech(true); }} className="pos-btn-primary text-sm">
              <Plus className="w-4 h-4" />
              Usta qo&apos;shish
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {technicians.map((t) => (
              <div key={t.id} className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900">{t.name}</h3>
                    {t.phone && <p className="text-sm text-slate-500">{t.phone}</p>}
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    t.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {t.status === 'active' ? 'Faol' : 'Nofaol'}
                  </span>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Standart tur</span>
                    <span className="font-semibold text-slate-800">{LABOR_LABELS[t.defaultLaborType ?? 'daily']}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kunlik haq</span>
                    <MoneyDisplay amountUzs={t.dailyRate} usdRate={settings.usdRate} inline uzsClassName="font-semibold" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">1 uskuna uchun</span>
                    <MoneyDisplay amountUzs={t.perUnitRate} usdRate={settings.usdRate} inline uzsClassName="font-semibold" />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                    onClick={() => {
                      setEditingTechId(t.id);
                      setTechForm({
                        name: t.name,
                        phone: t.phone || '',
                        dailyRate: t.dailyRate,
                        perUnitRate: t.perUnitRate,
                        defaultLaborType: t.defaultLaborType ?? 'daily',
                        status: t.status,
                        notes: t.notes || '',
                      });
                      setShowNewTech(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Tahrirlash
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:underline"
                    onClick={() => handleDeleteTech(t)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    O&apos;chirish
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'report' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <label className="text-sm font-semibold text-slate-600">Oy:</label>
            <input
              type="month"
              value={reportMonth}
              onChange={(e) => setReportMonth(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {reportLoading && (
            <p className="text-sm text-slate-500">Hisobot yuklanmoqda...</p>
          )}

          {report && !reportLoading && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Sotilgan', value: report.summary.ordersSold, isMoney: false },
                  { label: 'Tushum', value: report.summary.totalRevenue, isMoney: true },
                  { label: 'Qismlar xarajati', value: report.summary.totalPartsCost, isMoney: true },
                  { label: 'Ish haqi', value: report.summary.totalLaborCost, isMoney: true },
                  { label: 'Jami tannarx', value: report.summary.totalCost, isMoney: true },
                  { label: 'Foyda', value: report.summary.totalProfit, isMoney: true },
                ].map(({ label, value, isMoney }) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-xl p-4">
                    <p className="text-[10px] uppercase font-bold text-slate-400">{label}</p>
                    {isMoney ? (
                      <MoneyDisplay amountUzs={value} usdRate={settings.usdRate} uzsClassName="text-lg font-bold text-slate-900" />
                    ) : (
                      <p className="text-2xl font-bold text-slate-900">{value}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <h3 className="p-4 font-bold text-slate-800 border-b">Ustalar bo&apos;yicha daromad</h3>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left p-3">Usta</th>
                      <th className="text-right p-3">Buyurtmalar</th>
                      <th className="text-right p-3">Miqdor (kun/dona)</th>
                      <th className="text-right p-3">Kunlik haq</th>
                      <th className="text-right p-3">Uskuna haqi</th>
                      <th className="text-right p-3">Jami</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.technicians.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400">Ma&apos;lumot yo&apos;q</td>
                      </tr>
                    ) : (
                      report.technicians.map((t) => (
                        <tr key={t.technicianId} className="border-t border-slate-100">
                          <td className="p-3 font-medium">{t.technicianName}</td>
                          <td className="p-3 text-right">{t.ordersCount}</td>
                          <td className="p-3 text-right">{t.totalLaborQuantity}</td>
                          <td className="p-3 text-right">{t.dailyEarnings.toLocaleString()}</td>
                          <td className="p-3 text-right">{t.unitEarnings.toLocaleString()}</td>
                          <td className="p-3 text-right font-bold">{t.totalLabor.toLocaleString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <h3 className="p-4 font-bold text-slate-800 border-b">Oylik sotilgan buyurtmalar</h3>
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left p-3">Buyurtma</th>
                      <th className="text-left p-3">Usta</th>
                      <th className="text-left p-3">Ish haqi</th>
                      <th className="text-right p-3">Tannarx</th>
                      <th className="text-right p-3">Tushum</th>
                      <th className="text-right p-3">Foyda</th>
                      <th className="p-3 w-24" />
                    </tr>
                  </thead>
                  <tbody>
                    {(report.orders ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-slate-400">Ma&apos;lumot yo&apos;q</td>
                      </tr>
                    ) : (
                      (report.orders ?? []).map((ro) => (
                        <tr key={ro.id} className="border-t border-slate-100">
                          <td className="p-3">
                            <p className="font-medium">{ro.title}</p>
                            <p className="text-xs text-slate-500">{ro.orderNo}</p>
                          </td>
                          <td className="p-3">{ro.technicianName}</td>
                          <td className="p-3 text-xs">
                            {LABOR_LABELS[ro.laborType]}<br />
                            {ro.laborQuantity} {ro.laborType === 'daily' ? 'kun' : 'dona'}
                          </td>
                          <td className="p-3 text-right tabular-nums">{ro.totalCost.toLocaleString()}</td>
                          <td className="p-3 text-right tabular-nums font-semibold">{ro.revenue.toLocaleString()}</td>
                          <td className="p-3 text-right tabular-nums text-emerald-700 font-bold">{ro.profit.toLocaleString()}</td>
                          <td className="p-3">
                            <button
                              type="button"
                              className="text-blue-600 hover:text-blue-800"
                              title="Ko'rish"
                              onClick={() => {
                                setSelectedOrderId(ro.id);
                                setSubTab('orders');
                              }}
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showNewOrder && (
        <Modal title="Yangi ishlab chiqarish buyurtmasi" onClose={() => { setShowNewOrder(false); setOrderForm(emptyOrderForm()); }}>
          <div className="space-y-4">
            {renderOrderFormFields(false)}
            <button type="button" onClick={handleCreateOrder} className="pos-btn-primary w-full" disabled={busy}>
              {busy ? 'Saqlanmoqda...' : 'Yaratish'}
            </button>
          </div>
        </Modal>
      )}

      {showEditOrder && (
        <Modal title="Buyurtmani tahrirlash" onClose={() => { setShowEditOrder(false); setEditingOrderId(null); setOrderForm(emptyOrderForm()); }}>
          <div className="space-y-4">
            {renderOrderFormFields(true)}
            <button type="button" onClick={handleUpdateOrder} className="pos-btn-primary w-full" disabled={busy}>
              {busy ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </Modal>
      )}

      {showNewTech && (
        <Modal title={editingTechId ? 'Ustani tahrirlash' : 'Yangi usta'} onClose={() => { setShowNewTech(false); setEditingTechId(null); setTechForm(emptyTechForm()); }}>
          <div className="space-y-4">
            <Field label="Ism">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2" value={techForm.name} onChange={(e) => setTechForm({ ...techForm, name: e.target.value })} />
            </Field>
            <Field label="Telefon">
              <input className="w-full border border-slate-200 rounded-lg px-3 py-2" value={techForm.phone} onChange={(e) => setTechForm({ ...techForm, phone: e.target.value })} />
            </Field>
            <Field label="Standart ish haqi turi">
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                value={techForm.defaultLaborType}
                onChange={(e) => setTechForm({ ...techForm, defaultLaborType: e.target.value as LaborType })}
              >
                <option value="daily">{LABOR_LABELS.daily}</option>
                <option value="per_unit">{LABOR_LABELS.per_unit}</option>
              </select>
            </Field>
            <Field label="Kunlik haq (so'm)">
              <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2" value={techForm.dailyRate} onChange={(e) => setTechForm({ ...techForm, dailyRate: Number(e.target.value) })} />
            </Field>
            <Field label="1 ta uskuna uchun haq (so'm)">
              <input type="number" min={0} className="w-full border border-slate-200 rounded-lg px-3 py-2" value={techForm.perUnitRate} onChange={(e) => setTechForm({ ...techForm, perUnitRate: Number(e.target.value) })} />
            </Field>
            {editingTechId && (
              <Field label="Holat">
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2"
                  value={techForm.status}
                  onChange={(e) => setTechForm({ ...techForm, status: e.target.value as 'active' | 'inactive' })}
                >
                  <option value="active">Faol</option>
                  <option value="inactive">Nofaol</option>
                </select>
              </Field>
            )}
            <Field label="Izoh">
              <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" rows={2} value={techForm.notes} onChange={(e) => setTechForm({ ...techForm, notes: e.target.value })} />
            </Field>
            <button type="button" onClick={handleSaveTech} className="pos-btn-primary w-full" disabled={busy}>
              {busy ? 'Saqlanmoqda...' : 'Saqlash'}
            </button>
          </div>
        </Modal>
      )}

      {showSell && selectedOrder && (
        <Modal title="Tayyor uskunani sotish" onClose={() => setShowSell(false)}>
          <div className="space-y-4">
            <Field label="Sotuv narxi">
              <input
                type="number"
                min={0}
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                value={sellForm.sellingPrice}
                onChange={(e) => {
                  const price = Number(e.target.value);
                  setSellForm({ ...sellForm, sellingPrice: price, cashPaid: price });
                }}
              />
            </Field>
            <Field label="To'lov turi">
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2"
                value={sellForm.paymentType}
                onChange={(e) => setSellForm({ ...sellForm, paymentType: e.target.value as typeof sellForm.paymentType })}
              >
                <option value="cash">Naqd</option>
                <option value="debt">Nasiya</option>
                <option value="mixed">Aralash</option>
              </select>
            </Field>
            {(sellForm.paymentType === 'debt' || sellForm.paymentType === 'mixed') && (
              <>
                <Field label="Mijoz">
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={sellForm.customerId}
                    onChange={(e) => setSellForm({ ...sellForm, customerId: e.target.value })}
                  >
                    <option value="">Tanlang...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Nasiya muddati">
                  <input
                    type="date"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2"
                    value={sellForm.debtDueDate}
                    onChange={(e) => setSellForm({ ...sellForm, debtDueDate: e.target.value })}
                  />
                </Field>
              </>
            )}
            {sellForm.paymentType === 'mixed' && (
              <>
                <Field label="Naqd qism">
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2" value={sellForm.cashPaid} onChange={(e) => setSellForm({ ...sellForm, cashPaid: Number(e.target.value) })} />
                </Field>
                <Field label="Nasiya qism">
                  <input type="number" className="w-full border border-slate-200 rounded-lg px-3 py-2" value={sellForm.debtAmount} onChange={(e) => setSellForm({ ...sellForm, debtAmount: Number(e.target.value) })} />
                </Field>
              </>
            )}
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p>Tannarx: <strong>{selectedOrder.totalCost.toLocaleString()}</strong> so&apos;m</p>
              <p>Taxminiy foyda: <strong>{(sellForm.sellingPrice - sellForm.discount - selectedOrder.totalCost).toLocaleString()}</strong> so&apos;m</p>
            </div>
            <button type="button" onClick={handleSell} className="pos-btn-primary w-full" disabled={busy}>
              Sotuvni tasdiqlash
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
