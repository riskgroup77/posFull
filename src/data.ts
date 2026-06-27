import { Category, Product, Customer, Sale, Debt, InventoryMovement, StoreSettings, User, UserRole } from './types';

// Mock Users
export const MOCK_USERS: User[] = [
  { id: 'usr-1', name: 'Ali Valiyev', email: 'seller@pos.uz', role: UserRole.SELLER, status: 'active' },
  { id: 'usr-2', name: 'Sardor Rahimovich', email: 'manager@pos.uz', role: UserRole.MANAGER, status: 'active' },
  { id: 'usr-3', name: 'Zafar Karimov (Tizim Egasi)', email: 'riskgroup77@gmail.com', role: UserRole.ADMIN, status: 'active' },
  { id: 'usr-4', name: 'Baxodir Solihov', email: 'baxodir@pos.uz', role: UserRole.SELLER, status: 'blocked' }
];

// Mock Categories
export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-1', name: 'Ichimliklar', description: 'Salqin va qaynoq ichimliklar, suvlar' },
  { id: 'cat-2', name: 'Oziq-ovqat', description: 'Kundalik ehtiyoj mahsulotlari' },
  { id: 'cat-3', name: 'Shirinliklar', description: 'Shokoladlar, pechenyelar va konfetlar' },
  { id: 'cat-4', name: 'Sut mahsulotlari', description: 'Sut, qatiq, pishloq, sariyog\'' },
  { id: 'cat-5', name: 'Meva va Sabzavotlar', description: 'Yangi uzilgan mevalar va sabzavotlar' }
];

// Mock Products
export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'Coca-Cola 1.5L',
    categoryId: 'cat-1',
    barcode: '4820000190013',
    qrCodeData: 'PROD-COCA-1.5L',
    salePrice: 13500,
    supplyPrice: 9500,
    stock: 45,
    minStock: 10,
    status: 'active',
    description: 'Gazlangan alkogolsiz ichimlik',
    image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-2',
    name: 'Pepsi 1.5L',
    categoryId: 'cat-1',
    barcode: '4820000190020',
    qrCodeData: 'PROD-PEPSI-1.5L',
    salePrice: 13000,
    supplyPrice: 9000,
    stock: 28,
    minStock: 10,
    status: 'active',
    description: 'Gazlangan salqin ichimlik',
    image: 'https://images.unsplash.com/photo-1543257580-7269da773bf5?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-3',
    name: 'Snickers Maxi 80g',
    categoryId: 'cat-3',
    barcode: '5000159461122',
    qrCodeData: 'PROD-SNICKERS-MAXI',
    salePrice: 9500,
    supplyPrice: 6500,
    stock: 8, // Low Stock Alert Triggered!
    minStock: 15,
    status: 'active',
    description: 'Yong\oq va karamelli shokolad bori',
    image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-4',
    name: 'Nestle Sut 1L 3.2%',
    categoryId: 'cat-4',
    barcode: '4600605021045',
    qrCodeData: 'PROD-NESTLE-SUT',
    salePrice: 16000,
    supplyPrice: 12000,
    stock: 35,
    minStock: 8,
    status: 'active',
    description: 'Ultra-pasterizatsiyalangan tabiiy sut',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-5',
    name: 'Chorsu Obi Non',
    categoryId: 'cat-2',
    barcode: '0000000001111',
    qrCodeData: 'PROD-CHORSU-NON',
    salePrice: 4000,
    supplyPrice: 2500,
    stock: 15,
    minStock: 15,
    status: 'active',
    description: 'Tandirda yopilgan yangi issiq non',
    image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-6',
    name: 'Makaron Chust premium',
    categoryId: 'cat-2',
    barcode: '4780005510129',
    qrCodeData: 'PROD-MAKARON-CHUST',
    salePrice: 11000,
    supplyPrice: 8000,
    stock: 3, // Low Stock Alert Triggered!
    minStock: 10,
    status: 'active',
    description: 'Oliy navli bug\doy unidan tayyorlangan makaron',
    image: 'https://images.unsplash.com/photo-1612966608997-30004f760e0a?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  },
  {
    id: 'prod-7',
    name: 'Bonaqua Gazsiz 1L',
    categoryId: 'cat-1',
    barcode: '4820000190501',
    qrCodeData: 'PROD-BONAQUA-1L',
    salePrice: 4500,
    supplyPrice: 2800,
    stock: 60,
    minStock: 12,
    status: 'active',
    description: 'Filtrlangan toza ichimlik suvi',
    image: 'https://images.unsplash.com/photo-1608885898957-a599fb1b4600?w=150&auto=format&fit=crop&q=60&ixlib=rb-4.0.3'
  }
];

// Mock Customers
export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'cust-1',
    name: 'Bekzod Karimov',
    phone: '+998 90 123-45-67',
    address: 'Toshkent sh., Chilonzor 5-kvartal',
    notes: 'Doimiy nasiyaga oluvchi mijoz, har oyning 5-sanasida qarzini yopadi.',
    debtLimit: 2000000,
    currentDebt: 345000,
    totalSales: 1540000,
    lastSaleDate: '2026-06-25T14:30:00',
    status: 'active',
    allowDebt: true
  },
  {
    id: 'cust-2',
    name: 'Dilshod To\'rayev',
    phone: '+998 93 456-78-90',
    address: 'Toshkent sh., Yunusobod 11-dahla',
    notes: 'Katta xaridlar qiladi, naqd yoki karta orqali to\'laydi. Nasiya berilmaydi.',
    debtLimit: 1000000,
    currentDebt: 0,
    totalSales: 2890000,
    lastSaleDate: '2026-06-26T10:15:00',
    status: 'active',
    allowDebt: false
  },
  {
    id: 'cust-3',
    name: 'Lola Karimova',
    phone: '+998 94 888-22-33',
    address: 'Uchtepa tumani, Lutfiy ko\'chasi',
    notes: 'Qo\'shni mahalla fuqarosi, oilaviy do\'kon mijozlari.',
    debtLimit: 500000,
    currentDebt: 120000,
    totalSales: 480000,
    lastSaleDate: '2026-06-24T18:20:00',
    status: 'active',
    allowDebt: true
  },
  {
    id: 'cust-4',
    name: 'Asror G\'ofurov',
    phone: '+998 97 711-44-55',
    address: 'Toshkent sh., Sergeli 3-dahla',
    notes: 'Qarzlarini o\'z vaqtida bermagani sababli nofaol qilingan. Nasiya taqiqlangan.',
    debtLimit: 0,
    currentDebt: 150000, // Blacklisted/inactive with debt
    totalSales: 350000,
    lastSaleDate: '2026-05-12T11:00:00',
    status: 'inactive',
    allowDebt: false
  }
];

// Mock Sales
export const MOCK_SALES: Sale[] = [
  {
    id: 'sale-1',
    receiptNo: '000101',
    dateTime: '2026-06-20T10:15:00',
    sellerId: 'usr-1',
    sellerName: 'Ali Valiyev',
    customerId: 'cust-1',
    customerName: 'Bekzod Karimov',
    totalAmount: 144500,
    discount: 4500,
    finalAmount: 140000,
    paymentType: 'debt',
    cashPaid: 0,
    debtAmount: 140000,
    status: 'completed',
    items: [
      { id: 'item-1-1', saleId: 'sale-1', productId: 'prod-1', productName: 'Coca-Cola 1.5L', quantity: 4, price: 13500, total: 54000 },
      { id: 'item-1-2', saleId: 'sale-1', productId: 'prod-4', productName: 'Nestle Sut 1L 3.2%', quantity: 5, price: 16000, total: 80000 },
      { id: 'item-1-3', saleId: 'sale-1', productId: 'prod-5', productName: 'Chorsu Obi Non', quantity: 2, price: 4000, total: 8000 }
    ]
  },
  {
    id: 'sale-2',
    receiptNo: '000102',
    dateTime: '2026-06-22T15:45:00',
    sellerId: 'usr-1',
    sellerName: 'Ali Valiyev',
    customerId: 'cust-2',
    customerName: 'Dilshod To\'rayev',
    totalAmount: 90000,
    discount: 0,
    finalAmount: 90000,
    paymentType: 'cash',
    cashPaid: 100000, // Client gave 100k
    debtAmount: 0,
    status: 'completed',
    items: [
      { id: 'item-2-1', saleId: 'sale-2', productId: 'prod-2', productName: 'Pepsi 1.5L', quantity: 5, price: 13000, total: 65000 },
      { id: 'item-2-2', saleId: 'sale-2', productId: 'prod-3', productName: 'Snickers Maxi 80g', quantity: 2, price: 9500, total: 19000 },
      { id: 'item-2-3', saleId: 'sale-2', productId: 'prod-5', productName: 'Chorsu Obi Non', quantity: 1, price: 4000, total: 4000 }
    ]
  },
  {
    id: 'sale-3',
    receiptNo: '000103',
    dateTime: '2026-06-24T18:20:00',
    sellerId: 'usr-1',
    sellerName: 'Ali Valiyev',
    customerId: 'cust-3',
    customerName: 'Lola Karimova',
    totalAmount: 120000,
    discount: 0,
    finalAmount: 120000,
    paymentType: 'debt',
    cashPaid: 0,
    debtAmount: 120000,
    status: 'completed',
    items: [
      { id: 'item-3-1', saleId: 'sale-3', productId: 'prod-4', productName: 'Nestle Sut 1L 3.2%', quantity: 6, price: 16000, total: 96000 },
      { id: 'item-3-2', saleId: 'sale-3', productId: 'prod-5', productName: 'Chorsu Obi Non', quantity: 6, price: 4000, total: 24000 }
    ]
  },
  {
    id: 'sale-4',
    receiptNo: '000104',
    dateTime: '2026-06-25T14:30:00',
    sellerId: 'usr-4',
    sellerName: 'Baxodir Solihov',
    customerId: 'cust-1',
    customerName: 'Bekzod Karimov',
    totalAmount: 220000,
    discount: 15000,
    finalAmount: 205000,
    paymentType: 'mixed',
    cashPaid: 100000, // Paid 100k cash
    debtAmount: 105000, // Put 105k as debt
    status: 'completed',
    items: [
      { id: 'item-4-1', saleId: 'sale-4', productId: 'prod-1', productName: 'Coca-Cola 1.5L', quantity: 10, price: 13500, total: 135000 },
      { id: 'item-4-2', saleId: 'sale-4', productId: 'prod-2', productName: 'Pepsi 1.5L', quantity: 5, price: 13000, total: 65000 },
      { id: 'item-4-3', saleId: 'sale-4', productId: 'prod-3', productName: 'Snickers Maxi 80g', quantity: 2, price: 9500, total: 19000 }
    ]
  },
  {
    id: 'sale-5',
    receiptNo: '000105',
    dateTime: '2026-06-26T09:10:00',
    sellerId: 'usr-1',
    sellerName: 'Ali Valiyev',
    customerId: 'cust-2',
    customerName: 'Dilshod To\'rayev',
    totalAmount: 40500,
    discount: 500,
    finalAmount: 40000,
    paymentType: 'cash',
    cashPaid: 40000,
    debtAmount: 0,
    status: 'completed',
    items: [
      { id: 'item-5-1', saleId: 'sale-5', productId: 'prod-1', productName: 'Coca-Cola 1.5L', quantity: 2, price: 13500, total: 27000 },
      { id: 'item-5-2', saleId: 'sale-5', productId: 'prod-7', productName: 'Bonaqua Gazsiz 1L', quantity: 3, price: 4500, total: 13500 }
    ]
  }
];

// Mock Debts
export const MOCK_DEBTS: Debt[] = [
  {
    id: 'debt-1',
    customerId: 'cust-1',
    customerName: 'Bekzod Karimov',
    saleId: 'sale-1',
    receiptNo: '000101',
    amount: 140000,
    remainingAmount: 140000,
    status: 'pending',
    dueDate: '2026-07-05',
    createdAt: '2026-06-20T10:15:00'
  },
  {
    id: 'debt-2',
    customerId: 'cust-3',
    customerName: 'Lola Karimova',
    saleId: 'sale-3',
    receiptNo: '000103',
    amount: 120000,
    remainingAmount: 120000,
    status: 'pending',
    dueDate: '2026-07-15',
    createdAt: '2026-06-24T18:20:00'
  },
  {
    id: 'debt-3',
    customerId: 'cust-1',
    customerName: 'Bekzod Karimov',
    saleId: 'sale-4',
    receiptNo: '000104',
    amount: 105000,
    remainingAmount: 105000,
    status: 'pending',
    dueDate: '2026-07-05',
    createdAt: '2026-06-25T14:30:00'
  },
  {
    id: 'debt-4',
    customerId: 'cust-4',
    customerName: 'Asror G\'ofurov',
    saleId: 'sale-pre-existing',
    receiptNo: '000085',
    amount: 150000,
    remainingAmount: 150000,
    status: 'pending',
    dueDate: '2026-06-15', // Overdue Debt Alert!
    createdAt: '2026-05-12T11:00:00'
  }
];

// Mock Movements
export const MOCK_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'mov-1',
    productId: 'prod-1',
    productName: 'Coca-Cola 1.5L',
    quantity: 50,
    type: 'in',
    reason: 'new_stock',
    docNo: 'IN-0012',
    dateTime: '2026-06-19T09:00:00',
    userId: 'usr-2',
    userName: 'Sardor Rahimovich'
  },
  {
    id: 'mov-2',
    productId: 'prod-1',
    productName: 'Coca-Cola 1.5L',
    quantity: 4,
    type: 'out',
    reason: 'sale',
    docNo: '000101',
    dateTime: '2026-06-20T10:15:00',
    userId: 'usr-1',
    userName: 'Ali Valiyev'
  },
  {
    id: 'mov-3',
    productId: 'prod-3',
    productName: 'Snickers Maxi 80g',
    quantity: 10,
    type: 'in',
    reason: 'new_stock',
    docNo: 'IN-0012',
    dateTime: '2026-06-19T09:30:00',
    userId: 'usr-2',
    userName: 'Sardor Rahimovich'
  },
  {
    id: 'mov-4',
    productId: 'prod-3',
    productName: 'Snickers Maxi 80g',
    quantity: 2,
    type: 'out',
    reason: 'sale',
    docNo: '000102',
    dateTime: '2026-06-22T15:45:00',
    userId: 'usr-1',
    userName: 'Ali Valiyev'
  }
];

// Default Store Settings
export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Nukus Savdo Markazi',
  address: 'Toshkent shahar, Mirzo Ulug\'bek tumani, Mustaqillik shoh ko\'chasi, 45-uy',
  phone: '+998 71 200-30-40',
  logoUrl: '',
  currency: 'so\'m',
  taxRateDefault: 12,
  receiptFooter: 'Xaridingiz uchun tashakkur! Yana keling!',
  receiptNoFormat: '000000',
  autoPrint: false,
  minStockThresholdDefault: 10,
  defaultDebtLimit: 1000000,
  limitBlockSales: true,
  mandatoryDebtDueDate: true
};
