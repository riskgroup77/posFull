export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SELLER = 'seller'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: 'active' | 'blocked';
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  barcode: string;
  qrCodeData: string;
  salePrice: number;
  supplyPrice: number;
  stock: number;
  minStock: number;
  status: 'active' | 'inactive';
  description?: string;
  image?: string;
  shkaf?: string;
  polka?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  notes?: string;
  debtLimit: number;
  currentDebt: number;
  totalSales: number;
  lastSaleDate?: string;
  status: 'active' | 'inactive';
  allowDebt?: boolean;
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  dateTime: string;
  sellerId: string;
  sellerName: string;
  customerId?: string;
  customerName?: string;
  totalAmount: number;
  discount: number; // Sum or percentage based
  finalAmount: number;
  paymentType: 'cash' | 'debt' | 'mixed';
  cashPaid: number;
  debtAmount: number;
  status: 'completed' | 'returned';
  returnReason?: string;
  items: SaleItem[];
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  saleId: string;
  receiptNo: string;
  amount: number;
  remainingAmount: number;
  status: 'pending' | 'paid';
  dueDate?: string;
  createdAt: string;
}

export interface DebtPayment {
  id: string;
  customerId: string;
  customerName: string;
  debtId?: string; // Optional if general debt payment
  amount: number;
  paymentType: 'cash';
  dateTime: string;
}

export interface InventoryMovement {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  type: 'in' | 'out';
  reason: 'new_stock' | 'return' | 'sale' | 'loss' | 'inventory_check';
  docNo: string;
  dateTime: string;
  userId: string;
  userName: string;
}

export interface StoreSettings {
  storeName: string;
  address: string;
  phone: string;
  logoUrl?: string;
  currency: string;
  usdRate: number;
  taxRateDefault: number;
  receiptFooter: string;
  receiptNoFormat: string;
  autoPrint: boolean;
  minStockThresholdDefault: number;
  defaultDebtLimit: number;
  limitBlockSales: boolean;
  mandatoryDebtDueDate: boolean;
}
