import {
  User,
  Category,
  Product,
  Customer,
  Sale,
  Debt,
  DebtPayment,
  InventoryMovement,
  StoreSettings,
  Technician,
  ProductionOrder,
  ProductionReport,
} from '../types';
import { apiRequest, setTokens, clearTokens } from './client';

export interface BootstrapData {
  users: User[];
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  debts: Debt[];
  debtPayments: DebtPayment[];
  movements: InventoryMovement[];
  settings: StoreSettings;
  technicians: Technician[];
  productionOrders: ProductionOrder[];
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await apiRequest<LoginResponse>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.access, data.refresh);
  return data.user;
}

export function logout() {
  clearTokens();
}

export async function fetchBootstrap(): Promise<BootstrapData> {
  return apiRequest<BootstrapData>('/bootstrap/');
}

export async function createCategory(category: Omit<Category, 'id'>): Promise<Category> {
  return apiRequest<Category>('/categories/', {
    method: 'POST',
    body: JSON.stringify(category),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiRequest(`/categories/${id}/`, { method: 'DELETE' });
}

export async function createProduct(product: Partial<Product> & { categoryId: string }): Promise<Product> {
  return apiRequest<Product>('/products/', {
    method: 'POST',
    body: JSON.stringify(product),
  });
}

export async function updateProduct(product: Product): Promise<Product> {
  return apiRequest<Product>(`/products/${product.id}/`, {
    method: 'PUT',
    body: JSON.stringify(product),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await apiRequest(`/products/${id}/`, { method: 'DELETE' });
}

export async function bulkImportProducts(
  products: Partial<Product>[],
  duplicateAction: 'update_stock' | 'overwrite' | 'skip' = 'update_stock',
): Promise<Product[]> {
  return apiRequest<Product[]>('/products/bulk-import/', {
    method: 'POST',
    body: JSON.stringify({ products, duplicateAction }),
  });
}

export async function createCustomer(customer: Partial<Customer>): Promise<Customer> {
  return apiRequest<Customer>('/customers/', {
    method: 'POST',
    body: JSON.stringify(customer),
  });
}

export async function updateCustomer(customer: Customer): Promise<Customer> {
  return apiRequest<Customer>(`/customers/${customer.id}/`, {
    method: 'PUT',
    body: JSON.stringify(customer),
  });
}

export async function createSale(sale: Omit<Sale, 'id' | 'receiptNo' | 'sellerId' | 'sellerName' | 'status'> & { dueDate?: string }): Promise<Sale> {
  return apiRequest<Sale>('/sales/create/', {
    method: 'POST',
    body: JSON.stringify(sale),
  });
}

export async function returnSale(saleId: string, reason: string): Promise<Sale> {
  return apiRequest<Sale>(`/sales/${saleId}/return/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function repayDebt(customerId: string, amount: number): Promise<{ payment: DebtPayment; customer: Customer }> {
  return apiRequest(`/customers/${customerId}/repay-debt/`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}

export async function createMovement(movement: {
  productId: string;
  quantity: number;
  type: 'in' | 'out';
  reason: InventoryMovement['reason'];
  docNo?: string;
  supplyPrice?: number;
  salePrice?: number;
  minStock?: number;
  shkaf?: string;
  polka?: string;
  description?: string;
}): Promise<InventoryMovement> {
  return apiRequest<InventoryMovement>('/movements/', {
    method: 'POST',
    body: JSON.stringify(movement),
  });
}

export async function updateSettings(settings: StoreSettings): Promise<StoreSettings> {
  return apiRequest<StoreSettings>('/settings/', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

export async function createUser(data: {
  name: string;
  email: string;
  role: string;
  password: string;
}): Promise<User> {
  return apiRequest<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return apiRequest<User>(`/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function resetAllData(): Promise<void> {
  await apiRequest('/admin/reset-data/', { method: 'POST' });
}

export async function createTechnician(data: Omit<Technician, 'id'>): Promise<Technician> {
  return apiRequest<Technician>('/technicians/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTechnician(tech: Technician): Promise<Technician> {
  return apiRequest<Technician>(`/technicians/${tech.id}/`, {
    method: 'PUT',
    body: JSON.stringify(tech),
  });
}

export async function deleteTechnician(id: string): Promise<void> {
  await apiRequest(`/technicians/${id}/`, { method: 'DELETE' });
}

export async function createProductionOrder(data: {
  title: string;
  technicianId: string;
  laborType?: 'daily' | 'per_unit';
  laborQuantity?: number;
  workDays?: number;
  marginPercent?: number;
  notes?: string;
}): Promise<ProductionOrder> {
  return apiRequest<ProductionOrder>('/production-orders/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProductionOrder(
  id: string,
  data: Partial<{
    title: string;
    technicianId: string;
    laborType: 'daily' | 'per_unit';
    laborQuantity: number;
    workDays: number;
    marginPercent: number;
    sellingPrice: number;
    notes: string;
  }>,
): Promise<ProductionOrder> {
  return apiRequest<ProductionOrder>(`/production-orders/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function cancelProductionOrder(id: string): Promise<void> {
  await apiRequest(`/production-orders/${id}/`, { method: 'DELETE' });
}

export async function addPartToProductionOrder(
  orderId: string,
  productId: string,
  quantity: number,
): Promise<ProductionOrder> {
  return apiRequest<ProductionOrder>(`/production-orders/${orderId}/add-part/`, {
    method: 'POST',
    body: JSON.stringify({ productId, quantity }),
  });
}

export async function removePartFromProductionOrder(
  orderId: string,
  itemId: string,
): Promise<ProductionOrder> {
  return apiRequest<ProductionOrder>(`/production-orders/${orderId}/remove-part/`, {
    method: 'POST',
    body: JSON.stringify({ itemId }),
  });
}

export async function completeProductionOrder(
  orderId: string,
  sellingPrice?: number,
): Promise<ProductionOrder> {
  return apiRequest<ProductionOrder>(`/production-orders/${orderId}/complete/`, {
    method: 'POST',
    body: JSON.stringify(sellingPrice != null ? { sellingPrice } : {}),
  });
}

export async function sellProductionOrder(
  orderId: string,
  data: {
    payment_type: 'cash' | 'debt' | 'mixed';
    customerId?: string;
    cashPaid?: number;
    debtAmount?: number;
    discount?: number;
    sellingPrice?: number;
    debtDueDate?: string;
  },
): Promise<{ order: ProductionOrder; sale: Sale }> {
  return apiRequest(`/production-orders/${orderId}/sell/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchProductionReport(month?: string): Promise<ProductionReport> {
  const q = month ? `?month=${encodeURIComponent(month)}` : '';
  return apiRequest<ProductionReport>(`/production/reports${q}`);
}
