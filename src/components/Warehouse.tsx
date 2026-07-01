import React, { useState, useMemo, useRef } from 'react';
import { Product, Category, InventoryMovement, User, StoreSettings } from '../types';
import BarcodeLabel, { BarcodeLabelHandle } from './BarcodeLabel';
import MoneyDisplay from './MoneyDisplay';
import {
  downloadImportExcelTemplate,
  downloadImportJsonTemplate,
  getImportPasteSample,
  parseExcelFile,
  prepareImportFromRows,
  buildColumnMappingsFromHeaders,
} from '../utils/importTemplate';
import { 
  Package, 
  Plus, 
  FolderPlus, 
  ArrowUp, 
  ArrowDown, 
  ClipboardCheck, 
  AlertTriangle, 
  Barcode, 
  Edit, 
  Trash2, 
  Download, 
  Printer, 
  X, 
  Check, 
  Layers, 
  Search, 
  Eye, 
  Settings,
  ListFilter,
  Upload
} from 'lucide-react';

interface WarehouseProps {
  products: Product[];
  categories: Category[];
  movements: InventoryMovement[];
  currentUser: User;
  settings: StoreSettings;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: string) => void;
  onAddCategory: (category: Category) => void;
  onDeleteCategory: (categoryId: string) => void;
  onAddMovement: (movement: InventoryMovement) => void;
  onBulkImport: (products: Product[], duplicateAction?: 'update_stock' | 'overwrite' | 'skip') => void;
}

export default function Warehouse({
  products,
  categories,
  movements,
  currentUser,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onDeleteCategory,
  onAddMovement,
  onBulkImport
}: WarehouseProps) {
  // Navigation states within Warehouse
  const [subTab, setSubTab] = useState<'inventory' | 'categories' | 'movements' | 'reconciliation'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low'>('all');

  // Modal control states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'in' | 'out'>('in');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [movementReason, setMovementReason] = useState<any>('new_stock');
  const [movementQty, setMovementQty] = useState<string>('');
  const [movementDoc, setMovementDoc] = useState('');

  // Additional fields for stock-in (Omborga kiritish)
  const [movementSupplyPrice, setMovementSupplyPrice] = useState<string>('');
  const [movementSalePrice, setMovementSalePrice] = useState<string>('');
  const [movementMinStock, setMovementMinStock] = useState<string>('');
  const [movementShkaf, setMovementShkaf] = useState<string>('');
  const [movementPolka, setMovementPolka] = useState<string>('');
  const [movementDesc, setMovementDesc] = useState<string>('');

  React.useEffect(() => {
    if (selectedProductId) {
      const p = products.find(prod => prod.id === selectedProductId);
      if (p) {
        setMovementSupplyPrice(p.supplyPrice ? String(p.supplyPrice) : '');
        setMovementSalePrice(p.salePrice ? String(p.salePrice) : '');
        setMovementMinStock(p.minStock ? String(p.minStock) : '5');
        setMovementShkaf(p.shkaf || '');
        setMovementPolka(p.polka || '');
        setMovementDesc(p.description || '');
      }
    } else {
      setMovementSupplyPrice('');
      setMovementSalePrice('');
      setMovementMinStock('');
      setMovementShkaf('');
      setMovementPolka('');
      setMovementDesc('');
    }
  }, [selectedProductId, products]);

  // Selected barcode modal
  const [selectedBarcodeProduct, setSelectedBarcodeProduct] = useState<Product | null>(null);
  const barcodeLabelRef = useRef<BarcodeLabelHandle>(null);

  // Reconciliation state
  const [reconcilingProductId, setReconcilingProductId] = useState<string | null>(null);
  const [reconciliationActualQty, setReconciliationActualQty] = useState('');

  // Product Add Form Fields (combined simple / full view)
  const [prodName, setProdName] = useState('');
  const [prodSalePrice, setProdSalePrice] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodSupplyPrice, setProdSupplyPrice] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodMinStock, setProdMinStock] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodImg, setProdImg] = useState('');
  const [prodShkaf, setProdShkaf] = useState('');
  const [prodPolka, setProdPolka] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isFullForm, setIsFullForm] = useState(false);

  // Advanced Product Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState<'paste' | 'file'>('paste');
  const [pastedText, setPastedText] = useState('');
  const [importColumns, setImportColumns] = useState<string[]>([]);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  const [duplicateAction, setDuplicateAction] = useState<'update_stock' | 'overwrite' | 'skip'>('update_stock');
  const [importIsDragging, setImportIsDragging] = useState(false);
  const [importFileName, setImportFileName] = useState('');

  // Currency utility
  const formatMoney = (value: number) => {
    return new Intl.NumberFormat('uz-UZ').format(value) + " so'm";
  };

  const getCategoryName = (catId: string) => {
    const found = categories.find(c => c.id === catId);
    return found ? found.name : 'Boshqa';
  };

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.barcode.includes(searchQuery);
      const matchCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
      const matchStock = stockFilter === 'all' || p.stock <= p.minStock;
      return matchSearch && matchCategory && matchStock;
    });
  }, [products, searchQuery, selectedCategory, stockFilter]);

  // Export filtered products to CSV
  const handleExportCSV = () => {
    const filename = 'filtrlangan_ombor_tovarlari.csv';
    const rows = [
      ['Mahsulot nomi', 'Kategoriya', 'Shtrix kod', 'Xarid narxi (so\'m)', 'Sotuv narxi (so\'m)', 'Mavjud qoldiq'],
      ...filteredProducts.map(p => [
        `"${p.name.replace(/"/g, '""')}"`, 
        `"${getCategoryName(p.categoryId).replace(/"/g, '""')}"`, 
        `'${p.barcode}`, // prefix with single quote to prevent Excel from dropping leading zeros
        p.supplyPrice, 
        p.salePrice, 
        p.stock
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Added UTF-8 BOM for proper Uzbek character rendering in Excel
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export filtered products to PDF (Simulated print window)
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const contentHtml = `
      <h1 style="margin: 0 0 10px 0; font-size: 20px; color: #1e293b; font-family: sans-serif;">Ombor Tovar Qoldiqlari Hisoboti</h1>
      <p style="margin: 0 0 20px 0; font-size: 12px; color: #64748b; font-family: sans-serif;">
        Filtrlar: Kategoriya: <strong>${selectedCategory === 'all' ? 'Barchasi' : getCategoryName(selectedCategory)}</strong> | 
        Qoldiq turi: <strong>${stockFilter === 'all' ? 'Barchasi' : 'Kam qolganlar'}</strong> | 
        Qidiruv: <strong>${searchQuery || 'Yo\'q'}</strong>
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left; font-family: sans-serif;">
        <thead>
          <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Mahsulot nomi</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Kategoriya</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0;">Shtrix kod</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Xarid narxi</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">Sotuv narxi</th>
            <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Mavjud qoldiq</th>
          </tr>
        </thead>
        <tbody>
          ${filteredProducts.map(p => `
            <tr style="border-bottom: 1px solid #e2e8f0; ${p.stock <= p.minStock ? 'background-color: #fffbeb;' : ''}">
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${p.name}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0;">${getCategoryName(p.categoryId)}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; font-family: monospace;">${p.barcode}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right;">${formatMoney(p.supplyPrice)}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatMoney(p.salePrice)}</td>
              <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: ${p.stock <= p.minStock ? '#b45309' : '#1e293b'}">${p.stock} dona</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right; font-size: 12px; font-weight: bold; font-family: sans-serif;">
        Jami xilma-xil mahsulotlar: ${filteredProducts.length} ta | Jami qoldiq miqdori: ${filteredProducts.reduce((sum, p) => sum + p.stock, 0)} dona
      </div>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>CDCGroup POS - Ombor Hisoboti</title>
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
            <div class="logo">CDCGroup POS</div>
            <div class="meta">
              <p style="margin: 0;">Sana: ${new Date().toLocaleString('uz-UZ')}</p>
              <p style="margin: 5px 0 0 0;">Yaratdi: ${currentUser.name}</p>
            </div>
          </div>
          
          ${contentHtml}
          
          <div class="footer">
            CDCGroup POS tizimidan yuklab olingan rasmiy ombor hisoboti. &copy; ${new Date().getFullYear()}
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

  // Open product modal
  const handleOpenProductModal = (product: Product | null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdSalePrice(String(product.salePrice));
      setProdStock(String(product.stock));
      setProdCat(product.categoryId);
      setProdSupplyPrice(String(product.supplyPrice));
      setProdBarcode(product.barcode);
      setProdMinStock(String(product.minStock));
      setProdDesc(product.description || '');
      setProdImg(product.image || '');
      setProdShkaf(product.shkaf || '');
      setProdPolka(product.polka || '');
      setIsFullForm(true);
    } else {
      setEditingProduct(null);
      setProdName('');
      setProdSalePrice('');
      setProdStock('');
      setProdCat(categories[0]?.id || '');
      setProdSupplyPrice('');
      setProdBarcode('');
      setProdMinStock(String(settings.minStockThresholdDefault));
      setProdDesc('');
      setProdImg('');
      setProdShkaf('');
      setProdPolka('');
      setIsFullForm(false);
    }
    setShowProductModal(true);
  };

  // Submit product
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName) {
      alert("Iltimos, mahsulot nomini kiriting!");
      return;
    }

    const barcodeStr = prodBarcode.trim() || String(Math.floor(1000000000000 + Math.random() * 9000000000000));
    const catId = prodCat || (categories[0]?.id || 'cat-1');

    if (editingProduct) {
      // Edit
      const updatedProduct: Product = {
        ...editingProduct,
        name: prodName,
        categoryId: catId,
        barcode: barcodeStr,
        qrCodeData: `PROD-${barcodeStr}`
      };
      onUpdateProduct(updatedProduct);
      alert("Mahsulot muvaffaqiyatli tahrirlandi!");
    } else {
      // Add
      const newProduct: Product = {
        id: `prod-${Date.now()}`,
        name: prodName,
        categoryId: catId,
        barcode: barcodeStr,
        qrCodeData: `PROD-${barcodeStr}`,
        salePrice: 0,
        supplyPrice: 0,
        stock: 0,
        minStock: settings.minStockThresholdDefault,
        status: 'active',
        description: '',
        image: '',
        shkaf: '',
        polka: ''
      };
      onAddProduct(newProduct);
      alert("Yangi mahsulot yaratildi! Endi 'Omborga kiritish' orqali zaxira va narxlarni kiritishingiz mumkin.");
    }

    setShowProductModal(false);
  };

  // Submit manual movement (Kirim/Chiqim)
  const handleMovementSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !movementQty) {
      alert("Iltimos, tovar va miqdorni kiriting!");
      return;
    }

    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const qtyNum = parseFloat(movementQty) || 0;
    if (qtyNum <= 0) {
      alert("Miqdor musbat butun son bo'lishi shart!");
      return;
    }

    // Chiqim validation
    if (movementType === 'out' && product.stock < qtyNum) {
      alert(`Xatolik: Omborda etarli qoldiq mavjud emas! Hozirgi qoldiq: ${product.stock}`);
      return;
    }

    // Process movement
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      quantity: qtyNum,
      type: movementType,
      reason: movementReason,
      docNo: movementDoc.trim() || `DOC-${Date.now().toString().slice(-6)}`,
      dateTime: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name
    };

    onAddMovement(newMovement);

    // Apply stock delta in products state
    const delta = movementType === 'in' ? qtyNum : -qtyNum;
    const updatedProduct: Product = {
      ...product,
      stock: product.stock + delta
    };

    if (movementType === 'in') {
      updatedProduct.supplyPrice = parseFloat(movementSupplyPrice) || product.supplyPrice || 0;
      updatedProduct.salePrice = parseFloat(movementSalePrice) || product.salePrice || 0;
      updatedProduct.minStock = parseFloat(movementMinStock) || product.minStock || 5;
      updatedProduct.shkaf = movementShkaf.trim() || product.shkaf || '';
      updatedProduct.polka = movementPolka.trim() || product.polka || '';
      updatedProduct.description = movementDesc.trim() || product.description || '';
    }

    onUpdateProduct(updatedProduct);

    alert("Omborga muvaffaqiyatli kiritildi!");
    setShowMovementModal(false);
    setSelectedProductId('');
    setMovementQty('');
    setMovementDoc('');
    setMovementSupplyPrice('');
    setMovementSalePrice('');
    setMovementMinStock('');
    setMovementShkaf('');
    setMovementPolka('');
    setMovementDesc('');
  };

  // Reconciliation processing
  const handleReconciliationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcilingProductId || !reconciliationActualQty) return;

    const product = products.find(p => p.id === reconcilingProductId);
    if (!product) return;

    const actual = parseFloat(reconciliationActualQty) || 0;
    const diff = actual - product.stock;

    if (diff !== 0) {
      const type = diff > 0 ? 'in' : 'out';
      const reason = 'inventory_check';
      const newMovement: InventoryMovement = {
        id: `mov-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        quantity: Math.abs(diff),
        type,
        reason,
        docNo: 'INVENTARIZATSIYA',
        dateTime: new Date().toISOString(),
        userId: currentUser.id,
        userName: currentUser.name
      };

      onAddMovement(newMovement);
    }

    onUpdateProduct({
      ...product,
      stock: actual
    });

    alert(`Tafovut hisoblandi (${diff > 0 ? '+' : ''}${diff}). Tovar qoldig'i ${actual} dona deb o'rnatildi.`);
    setReconcilingProductId(null);
    setReconciliationActualQty('');
  };

  // Add category handler
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: newCatName.trim(),
      description: newCatDesc.trim() || undefined
    };

    onAddCategory(newCat);
    setNewCatName('');
    setNewCatDesc('');
    alert("Kategoriya yaratildi!");
  };

  const handleDeleteCategoryCheck = (catId: string) => {
    // Check if category has products
    const hasProds = products.some(p => p.categoryId === catId);
    if (hasProds) {
      alert("Xato: Ushbu kategoriya tarkibida mahsulotlar mavjud! Avval ularning kategoriyasini o'zgartiring.");
      return;
    }

    if (confirm("Kategoriyani o'chirishni tasdiqlaysizmi?")) {
      onDeleteCategory(catId);
    }
  };

  const resetImportState = () => {
    setPastedText('');
    setImportColumns([]);
    setImportPreviewData([]);
    setColumnMappings({});
    setDuplicateAction('update_stock');
    setImportFileName('');
  };

  const applyImportData = (headers: string[], rows: Record<string, string>[], mappings: Record<string, string>) => {
    setImportColumns(headers);
    setImportPreviewData(rows);
    setColumnMappings(mappings);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);

    const reader = new FileReader();

    if (isExcel) {
      reader.onload = (event) => {
        try {
          const buffer = event.target?.result as ArrayBuffer;
          const rows = parseExcelFile(buffer);
          const prepared = prepareImportFromRows(rows);
          if (!prepared) {
            alert('Excel fayl bo\'sh yoki o\'qib bo\'lmadi!');
            return;
          }
          applyImportData(prepared.headers, prepared.rows, prepared.columnMappings);
        } catch {
          alert('Excel faylni o\'qishda xatolik! Iltimos, shablon (.xlsx) formatida yuklang.');
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParseImport(text);
      };
      reader.readAsText(file);
    }
  };

  const handleParseImport = (text: string) => {
    if (!text.trim()) {
      alert("Hech qanday ma'lumot kiritilmadi!");
      return;
    }

    try {
      if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
        const parsed = JSON.parse(text) as Record<string, string>[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const prepared = prepareImportFromRows(parsed);
          if (prepared) {
            applyImportData(prepared.headers, prepared.rows, prepared.columnMappings);
          }
          return;
        }
      }
    } catch (e) {
      // ignore JSON error, proceed to CSV/TSV
    }

    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      alert("Hujjat bo'sh yoki o'qib bo'lmadi!");
      return;
    }

    const firstLine = lines[0];
    const delimiter = firstLine.includes('\t') ? '\t' : (firstLine.includes(';') ? ';' : ',');

    const parseCSVLine = (line: string, delim: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === delim && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.replace(/^["']|["']$/g, '').trim());
    
    const rows = lines.slice(1).map((line) => {
      const cols = parseCSVLine(line, delimiter).map(c => c.replace(/^["']|["']$/g, '').trim());
      const rowObj: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        rowObj[h || `Ustun-${colIdx + 1}`] = cols[colIdx] || '';
      });
      return rowObj;
    });

    applyImportData(headers, rows, buildColumnMappingsFromHeaders(headers));
  };

  const handleCommitImport = () => {
    if (!columnMappings.name) {
      alert("Xato: Mahsulot nomini bog'lash majburiy!");
      return;
    }

    const createdCategories: Record<string, string> = {};
    categories.forEach(c => {
      createdCategories[c.name.toLowerCase()] = c.id;
    });

    const newProducts: Product[] = [];
    const generatedMovements: InventoryMovement[] = [];

    importPreviewData.forEach((row, i) => {
      const name = row[columnMappings.name]?.trim();
      if (!name) return;

      let categoryId = 'default-category';
      const catName = columnMappings.category ? row[columnMappings.category]?.trim() : '';
      if (catName) {
        const catLower = catName.toLowerCase();
        if (createdCategories[catLower]) {
          categoryId = createdCategories[catLower];
        } else {
          const newCatId = `cat-imported-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newCategory: Category = {
            id: newCatId,
            name: catName,
            description: "Import qilingan mahsulotlar kategoriyasi"
          };
          onAddCategory(newCategory);
          createdCategories[catLower] = newCatId;
          categoryId = newCatId;
        }
      } else {
        if (categories.length > 0) {
          categoryId = categories[0].id;
        }
      }

      let barcode = columnMappings.barcode ? row[columnMappings.barcode]?.trim() : '';
      if (!barcode) {
        barcode = String(Math.floor(1000000000000 + Math.random() * 9000000000000));
      }

      const salePrice = columnMappings.salePrice ? (parseFloat(row[columnMappings.salePrice]?.replace(/[^0-9.-]/g, '')) || 0) : 0;
      const supplyPrice = columnMappings.supplyPrice ? (parseFloat(row[columnMappings.supplyPrice]?.replace(/[^0-9.-]/g, '')) || 0) : 0;
      const stock = columnMappings.stock ? (parseFloat(row[columnMappings.stock]?.replace(/[^0-9.-]/g, '')) || 0) : 0;
      const minStock = columnMappings.minStock ? (parseFloat(row[columnMappings.minStock]?.replace(/[^0-9.-]/g, '')) || 5) : 5;
      const shkaf = columnMappings.shkaf ? row[columnMappings.shkaf]?.trim() : '';
      const polka = columnMappings.polka ? row[columnMappings.polka]?.trim() : '';
      const description = columnMappings.description ? row[columnMappings.description]?.trim() : '';

      const pId = `prod-import-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`;
      const prod: Product = {
        id: pId,
        name,
        categoryId,
        barcode,
        qrCodeData: `PROD-${barcode}`,
        salePrice,
        supplyPrice,
        stock,
        minStock,
        status: 'active',
        shkaf,
        polka,
        description
      };

      newProducts.push(prod);

      if (stock > 0) {
        generatedMovements.push({
          id: `move-import-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
          productId: pId,
          productName: name,
          quantity: stock,
          type: 'in',
          reason: 'new_stock',
          docNo: `IMPORT-${new Date().toLocaleDateString('uz-UZ').replace(/\//g, '-')}`,
          dateTime: new Date().toISOString(),
          userId: currentUser.id,
          userName: currentUser.name
        });
      }
    });

    if (newProducts.length === 0) {
      alert("Xato: Import qilish uchun mos mahsulotlar topilmadi.");
      return;
    }

    onBulkImport(newProducts, duplicateAction);

    generatedMovements.forEach(m => {
      const existingProduct = products.find(p => p.barcode === newProducts.find(np => np.name === m.productName)?.barcode);
      if (existingProduct) {
        m.productId = existingProduct.id;
      }
      onAddMovement(m);
    });

    alert(`${newProducts.length} ta mahsulot va tegishli kirim harakatlari muvaffaqiyatli import qilindi!`);
    resetImportState();
    setShowImportModal(false);
  };

  const handleExcelExport = () => {
    // Standard mock text export as CSV representation
    const rows = [
      ['ID', 'Nomi', 'Kategoriya', 'Barcode', 'Sotish Narxi', 'Ombor Narxi', 'Qoldiq', 'Minimal Chegara'],
      ...products.map(p => [
        p.id, p.name, getCategoryName(p.categoryId), p.barcode, p.salePrice, p.supplyPrice, p.stock, p.minStock
      ])
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "ombor_mahsulotlar_qoldigi.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="pos-page">
      
      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100 shrink-0">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="pos-page-title">Ombor & Inventarizatsiya</h2>
            <p className="pos-page-subtitle">
              Mahsulotlar zaxiralarini kuzatish, kirim-chiqim kiritish va tahlil.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {currentUser.role !== 'seller' && (
            <>
              <button
                onClick={() => handleOpenProductModal(null)}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Yangi Mahsulot</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('in');
                  setMovementReason('new_stock');
                  setShowMovementModal(true);
                }}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <ArrowUp className="h-4 w-4" />
                <span>Omborga Kiritish</span>
              </button>

              <button
                onClick={() => {
                  setMovementType('out');
                  setMovementReason('loss');
                  setShowMovementModal(true);
                }}
                className="flex items-center justify-center space-x-1 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
              >
                <ArrowDown className="h-4 w-4" />
                <span>Ombordan Chiqish</span>
              </button>
            </>
          )}

          {currentUser.role !== 'seller' && (
            <button
              onClick={() => {
                resetImportState();
                setShowImportModal(true);
              }}
              className="flex items-center justify-center space-x-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Import (Excel/JSON)</span>
            </button>
          )}

          <button
            onClick={handleExcelExport}
            className="flex items-center justify-center space-x-1 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-400" />
            <span>Eksport (CSV)</span>
          </button>
        </div>
      </div>

      {/* Sub tabs: Inventory list, Categories list, Movements log, reconciliation */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200/60 max-w-fit overflow-x-auto">
        <button
          onClick={() => setSubTab('inventory')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'inventory' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Mahsulotlar Ro'yxati
        </button>
        <button
          onClick={() => setSubTab('categories')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'categories' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kategoriyalar Boshqaruvi
        </button>
        <button
          onClick={() => setSubTab('movements')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'movements' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Kirim-Chiqim Tarixi
        </button>
        <button
          onClick={() => setSubTab('reconciliation')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
            subTab === 'reconciliation' ? 'bg-white text-slate-800 shadow' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Inventarizatsiya (Audit)
        </button>
      </div>

      {/* TAB 1: INVENTORY TABLE */}
      {subTab === 'inventory' && (
        <div className="space-y-4">
          
          {/* List filters row */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Mahsulot nomi yoki shtrix kodi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs focus:outline-none"
              />
            </div>
            
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha Kategoriyalar</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>

              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as 'all' | 'low')}
                className="px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none"
              >
                <option value="all">Barcha Qoldiqlar</option>
                <option value="low">Kam qolganlar (Ogohlantirish)</option>
              </select>

              {/* Export actions */}
              <div className="flex gap-1 ml-auto sm:ml-0">
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
                  title="CSV formatida yuklab olish"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Excel/CSV</span>
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-lg cursor-pointer transition-colors flex items-center space-x-1"
                  title="PDF / Chop etish"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>PDF / Chop etish</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-6 py-3 hidden sm:table-cell">Rasm</th>
                  <th className="px-6 py-3">Mahsulot nomi</th>
                  <th className="px-6 py-3 hidden md:table-cell">Kategoriya</th>
                  <th className="px-6 py-3 hidden lg:table-cell">Barcode</th>
                  <th className="px-6 py-3 text-right hidden md:table-cell">Xarid narxi</th>
                  <th className="px-6 py-3 text-right">Sotuv narxi</th>
                  <th className="px-6 py-3 text-center">Mavjud qoldiq</th>
                  <th className="px-6 py-3 hidden sm:table-cell">Holat</th>
                  {currentUser.role !== 'seller' && <th className="px-6 py-3 text-center">Amallar</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStock;
                  return (
                    <tr key={p.id} className={`${isLow ? 'bg-amber-50/20' : ''} hover:bg-slate-50/50 transition-colors`}>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <div className="h-10 w-10 bg-slate-100 border rounded overflow-hidden">
                          {p.image ? (
                            <img src={p.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold uppercase">{p.name.slice(0,2)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="text-slate-900 font-bold block">{p.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono block lg:hidden">{p.barcode}</span>
                        {(p.shkaf || p.polka) && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[9px] text-blue-600 bg-blue-50/70 border border-blue-100 rounded px-1.5 py-0.5 font-bold inline-block">
                              📍 {p.shkaf ? `Shkaf: ${p.shkaf}` : ''}{p.shkaf && p.polka ? ' | ' : ''}{p.polka ? `Polka: ${p.polka}` : ''}
                            </span>
                          </div>
                        )}
                        {isLow && (
                          <span className="text-[9px] text-amber-600 bg-amber-50 rounded px-1.5 py-0.2 font-bold inline-block border border-amber-100 mt-1">
                            Minimal chegaradan kam! ({p.minStock})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 font-normal text-slate-500 hidden md:table-cell">{getCategoryName(p.categoryId)}</td>
                      <td className="px-6 py-3 font-mono text-[10px] text-slate-500 hidden lg:table-cell">{p.barcode}</td>
                      <td className="px-6 py-3 text-right text-slate-500 font-medium hidden md:table-cell">{formatMoney(p.supplyPrice)}</td>
                      <td className="px-6 py-3 text-right text-slate-900 font-black">
                        <MoneyDisplay
                          amountUzs={p.salePrice}
                          usdRate={settings.usdRate > 0 ? settings.usdRate : 12800}
                          className="items-end"
                          uzsClassName="text-sm font-black text-slate-900"
                          usdClassName="text-[10px] text-emerald-600 font-semibold"
                        />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold leading-none ${
                          p.stock <= 0 ? 'bg-red-100 text-red-800' :
                          isLow ? 'bg-amber-100 text-amber-800' :
                          'bg-emerald-50 text-emerald-800'
                        }`}>
                          {p.stock} dona
                        </span>
                      </td>
                      <td className="px-6 py-3 hidden sm:table-cell">
                        <span className={`inline-block h-2 w-2 rounded-full mr-1.5 ${p.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                        <span className="capitalize text-slate-600">{p.status === 'active' ? 'Faol' : 'Nofaol'}</span>
                      </td>
                      {currentUser.role !== 'seller' && (
                        <td className="px-6 py-3 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setSelectedBarcodeProduct(p)}
                              className="p-1 text-slate-500 hover:text-blue-600 border border-slate-100 hover:border-blue-200 bg-white rounded cursor-pointer"
                              title="Shtrix-kod ko'rish"
                            >
                              <Barcode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenProductModal(p)}
                              className="p-1 text-slate-500 hover:text-amber-600 border border-slate-100 hover:border-amber-200 bg-white rounded cursor-pointer"
                              title="Tahrirlash"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => {
                                  if (confirm("Mahsulotni o'chirishga ishonchingiz komilmi? Bu operatsiya qaytarilmaydi.")) {
                                    onDeleteProduct(p.id);
                                  }
                                }}
                                className="p-1 text-slate-300 hover:text-red-600 border border-slate-100 hover:border-red-200 bg-white rounded cursor-pointer"
                                title="O'chirish"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400 font-bold bg-white">
                      Omborda bunday tovar topilmadi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Real Import Trigger Box */}
          {currentUser.role !== 'seller' && (
            <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-indigo-900 block flex items-center gap-1">
                  📦 Excel, JSON yoki Nusxalangan Jadval orqali Mahsulotlar Importi
                </span>
                <span className="text-[10px] text-indigo-600 block leading-relaxed">
                  Excel, Google Sheets yoki JSON hujjatlaridagi mahsulotlarni oson va tezkor ravishda massiv ravishda yuklang. Barkodlar, xarid/sotish narxlari, joriy ombor qoldiqlari va shkaf/polka joylashuvlarini bog'lang.
                </span>
              </div>
              <button
                onClick={() => {
                  resetImportState();
                  setShowImportModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors cursor-pointer whitespace-nowrap self-start sm:self-center flex items-center gap-1"
              >
                <Upload className="h-4 w-4" />
                <span>Import tizimini ochish</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORY MANAGEMENT */}
      {subTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Create category Form (Left, only admin/manager) */}
          {currentUser.role !== 'seller' ? (
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm h-fit">
              <h4 className="text-sm font-black text-slate-800 flex items-center space-x-1 mb-4">
                <FolderPlus className="h-5 w-5 text-blue-600" />
                <span>Yangi kategoriya</span>
              </h4>
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Kategoriya nomi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan, Oziq-ovqat, Tamaki"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Izoh / Tavsif</label>
                  <textarea
                    placeholder="Kategoriya mazmuni haqida qisqacha..."
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs min-h-[80px]"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm cursor-pointer"
                >
                  Yaratish
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-50 p-4 border rounded-xl text-center text-slate-400 text-xs">
              Menejer yoki Administrator bo'lmagan xodimlarga yangi kategoriya qo'shish ruxsat etilmagan.
            </div>
          )}

          {/* Categories List Table (Right, 2/3 width) */}
           <div className="bg-white border border-slate-200 rounded-xl shadow-sm md:col-span-2 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-6 py-3 hidden sm:table-cell">ID</th>
                  <th className="px-6 py-3">Kategoriya nomi</th>
                  <th className="px-6 py-3 hidden md:table-cell">Izoh / Tavsif</th>
                  <th className="px-6 py-3 text-center">Tovarlar soni</th>
                  {currentUser.role === 'admin' && <th className="px-6 py-3 text-center">O'chirish</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => {
                  const name = cat.name;
                  const desc = cat.description || '';
                  const prodCount = products.filter(p => p.categoryId === cat.id).length;

                  return (
                    <tr key={cat.id} className="hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-mono text-[10px] text-slate-400 hidden sm:table-cell">{cat.id}</td>
                      <td className="px-6 py-4 text-slate-900 font-bold">{name}</td>
                      <td className="px-6 py-4 font-normal text-slate-500 max-w-xs truncate hidden md:table-cell">{desc || 'Kiritilmagan'}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-blue-50 text-blue-800 font-black text-[11px] px-2 py-0.5 rounded-full border border-blue-100">
                          {prodCount} ta tovar
                        </span>
                      </td>
                      {currentUser.role === 'admin' && (
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleDeleteCategoryCheck(cat.id)}
                            className="p-1 text-slate-300 hover:text-red-600 border border-slate-100 hover:border-red-200 bg-white rounded cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: KIRIM-CHIQIM HARAKATI LOG */}
      {subTab === 'movements' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
              <tr>
                <th className="px-6 py-3 hidden lg:table-cell">Harakat ID</th>
                <th className="px-6 py-3 hidden sm:table-cell">Sana / Vaqt</th>
                <th className="px-6 py-3">Mahsulot</th>
                <th className="px-6 py-3">Turi</th>
                <th className="px-6 py-3 hidden md:table-cell">Harakat sababi</th>
                <th className="px-6 py-3 text-right">Miqdor (dona)</th>
                <th className="px-6 py-3 hidden lg:table-cell">Hujjat №</th>
                <th className="px-6 py-3 hidden md:table-cell">Xodim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movements.map((mov) => (
                <tr key={mov.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-3 font-mono text-[10px] text-slate-400 hidden lg:table-cell">{mov.id}</td>
                  <td className="px-6 py-3 font-normal text-slate-400 hidden sm:table-cell">{new Date(mov.dateTime).toLocaleString('uz-UZ')}</td>
                  <td className="px-6 py-3 text-slate-900 font-bold">
                    <div>{mov.productName}</div>
                    <div className="text-[10px] text-slate-400 block sm:hidden">{new Date(mov.dateTime).toLocaleDateString('uz-UZ')}</div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                      mov.type === 'in' ? 'bg-green-50 text-green-700 border-green-100' : 'bg-rose-50 text-rose-700 border-rose-100'
                    }`}>
                      {mov.type === 'in' ? <ArrowUp className="h-3 w-3 shrink-0" /> : <ArrowDown className="h-3 w-3 shrink-0" />}
                      <span>{mov.type === 'in' ? 'Kirim' : 'Chiqim'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 font-medium hidden md:table-cell">
                    {mov.reason === 'new_stock' ? 'Yangi xarid (kirim)' :
                     mov.reason === 'return' ? 'Mijoz qaytargan' :
                     mov.reason === 'sale' ? 'Savdo (sotuv)' :
                     mov.reason === 'loss' ? 'Yaroqsiz / Zarar' : 'Inventarizatsiya taftishi'}
                  </td>
                  <td className="px-6 py-3 text-right text-slate-900 font-black">{mov.quantity} dona</td>
                  <td className="px-6 py-3 font-mono text-[10px] text-slate-500 hidden lg:table-cell">{mov.docNo}</td>
                  <td className="px-6 py-3 font-normal text-slate-500 hidden md:table-cell">{mov.userName}</td>
                </tr>
              ))}

              {movements.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 bg-white">
                    Hech qanday harakat topilmadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 4: RECONCILIATION AUDIT */}
      {subTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5">
            <ClipboardCheck className="h-5 w-5 text-blue-600 shrink-0" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800">Inventarizatsiya jarayoni nima?</span>
              <p>Haqiqiy joriy jismoniy qoldiqni tizimdagi qoldiq bilan tekshiring. Farq hisob-kitob qilinadi, tafovut aniqlanadi va ombor harakati tizimi (audit logging) avtomatik ravishda moslashtiriladi.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs font-semibold text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px]">
                <tr>
                  <th className="px-6 py-3 hidden sm:table-cell">Shtrix kod</th>
                  <th className="px-6 py-3">Mahsulot nomi</th>
                  <th className="px-6 py-3 text-center">Tizimdagi qoldiq</th>
                  <th className="px-6 py-3 text-center">Haqiqiy qoldiq</th>
                  <th className="px-6 py-3 text-center">Tafovut</th>
                  <th className="px-6 py-3 text-center">Taftish qilish</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => {
                  const isReconciling = reconcilingProductId === p.id;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/20">
                      <td className="px-6 py-3 font-mono text-[10px] text-slate-400 hidden sm:table-cell">{p.barcode}</td>
                      <td className="px-6 py-3 text-slate-900 font-bold">
                        <div>{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono block sm:hidden">{p.barcode}</div>
                      </td>
                      <td className="px-6 py-3 text-center font-bold text-slate-800">{p.stock} dona</td>
                      <td className="px-6 py-3 text-center">
                        {isReconciling ? (
                          <input
                            type="number"
                            placeholder="Haqiqiy sonni yozing"
                            value={reconciliationActualQty}
                            onChange={(e) => setReconciliationActualQty(e.target.value)}
                            className="w-28 px-2 py-1 border border-slate-300 rounded text-center text-xs"
                            autoFocus
                          />
                        ) : (
                          <span className="text-slate-400 italic">Kiritilmagan</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {isReconciling && reconciliationActualQty ? (
                          (() => {
                            const val = parseFloat(reconciliationActualQty) || 0;
                            const diff = val - p.stock;
                            return (
                              <span className={`font-black text-xs ${diff === 0 ? 'text-green-600' : diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {diff === 0 ? 'Tafovut yo\'q' : `${diff > 0 ? '+' : ''}${diff}`}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {currentUser.role !== 'seller' ? (
                          isReconciling ? (
                            <div className="flex justify-center space-x-1">
                              <button
                                onClick={handleReconciliationSubmit}
                                className="p-1 text-green-600 hover:bg-green-50 border border-green-100 rounded cursor-pointer"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setReconcilingProductId(null)}
                                className="p-1 text-slate-400 hover:bg-slate-50 border border-slate-100 rounded cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReconcilingProductId(p.id);
                                setReconciliationActualQty(String(p.stock));
                              }}
                              className="px-2 py-1 text-blue-600 hover:bg-blue-50 border border-blue-100 hover:border-blue-200 rounded text-[10px] font-bold cursor-pointer"
                            >
                              Sanoq o'tkazish
                            </button>
                          )
                        ) : (
                          <span className="text-slate-400 text-[10px]">Ruxsat yo'q</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 5: PRODUCT ADD / EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowProductModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-4">
              <Package className="h-5 w-5 text-blue-600" />
              <span>{editingProduct ? 'Mahsulotni tahrirlash' : "Yangi mahsulot qo'shish"}</span>
            </h3>

            <form onSubmit={handleProductSubmit} className="space-y-4">
              {/* Main Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mahsulot nomi *</label>
                  <input
                    type="text"
                    required
                    placeholder="Masalan: Coca-Cola 1.5L"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Kategoriya *</label>
                  <select
                    value={prodCat}
                    onChange={(e) => setProdCat(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Shtrix-kod / Barcode</label>
                  <input
                    type="text"
                    placeholder="Bo'sh qolsa, avtomatik generatsiya qilinadi"
                    value={prodBarcode}
                    onChange={(e) => setProdBarcode(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  {prodBarcode.trim() && (
                    <BarcodeLabel value={prodBarcode.trim()} className="mt-3" />
                  )}
                </div>
              </div>

              {/* Action trigger */}
              <div className="flex justify-end space-x-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
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

      {/* MODAL 6: MANUAL STOCK IN/OUT (KIRIM-CHIQIM) */}
      {showMovementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMovementModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-sm font-black text-slate-800 flex items-center space-x-2 mb-4 border-b pb-2">
              {movementType === 'in' ? (
                <>
                  <ArrowUp className="h-5 w-5 text-emerald-600" />
                  <span>Omborga Kiritish (Zaxira & Narxlar)</span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-5 w-5 text-rose-600" />
                  <span>Ombordan Chiqish (Kamaytirish)</span>
                </>
              )}
            </h3>

            <form onSubmit={handleMovementSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Tovarni tanlang *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Tanlang --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Hozirgi zaxira: {p.stock} dona)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Amal sababi *</label>
                <select
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value as any)}
                  className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {movementType === 'in' ? (
                    <>
                      <option value="new_stock">Yangi xarid (Keltirilgan yangi tovar)</option>
                      <option value="return">Mijoz qaytarishi</option>
                      <option value="inventory_check">Taftish hisobiga qo'shimcha</option>
                    </>
                  ) : (
                    <>
                      <option value="loss">Yaroqsiz / Zarar / Siniq</option>
                      <option value="inventory_check">Taftish kamomadi moslashuvi</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Miqdori (dona) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="0"
                    value={movementQty}
                    onChange={(e) => setMovementQty(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Hujjat raqami</label>
                  <input
                    type="text"
                    placeholder="In-0041"
                    value={movementDoc}
                    onChange={(e) => setMovementDoc(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic inputs for stock-in ONLY */}
              {movementType === 'in' && selectedProductId && (
                <div className="border-t border-slate-100 pt-3 space-y-3 bg-slate-50 p-3 rounded-xl">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                    Tovarni sozlash (Qolgan barcha ma'lumotlar):
                  </span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Xarid Narxi (so'm)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={movementSupplyPrice}
                        onChange={(e) => setMovementSupplyPrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Sotish Narxi (so'm)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={movementSalePrice}
                        onChange={(e) => setMovementSalePrice(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold text-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Shkaf (Joylashuv)</label>
                      <input
                        type="text"
                        placeholder="Shkaf A1"
                        value={movementShkaf}
                        onChange={(e) => setMovementShkaf(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Polka (Qator)</label>
                      <input
                        type="text"
                        placeholder="2-polka"
                        value={movementPolka}
                        onChange={(e) => setMovementPolka(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Minimal qoldiq chegara</label>
                      <input
                        type="number"
                        placeholder="5"
                        value={movementMinStock}
                        onChange={(e) => setMovementMinStock(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Mahsulot tavsifi / izoh</label>
                      <textarea
                        placeholder="Xususiyatlari yoki qaydlar..."
                        value={movementDesc}
                        onChange={(e) => setMovementDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-xs min-h-[50px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 border-t pt-3">
                <button
                  type="button"
                  onClick={() => setShowMovementModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold cursor-pointer text-slate-600"
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

      {/* MODAL 7: XPRINTER TERMo ETIKET — SHTIRIX-KOD */}
      {selectedBarcodeProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 no-print">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative text-center">
            <button
              onClick={() => setSelectedBarcodeProduct(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer border-none bg-transparent"
            >
              <X className="h-5 w-5" />
            </button>

            <Barcode className="h-10 w-10 text-blue-600 mx-auto mb-2" />
            <h4 className="text-sm font-black text-slate-800 leading-snug">{selectedBarcodeProduct.name}</h4>
            <p className="text-[10px] text-slate-400 mt-1">Xprinter etiket: 50×30 mm</p>

            <BarcodeLabel
              ref={barcodeLabelRef}
              value={selectedBarcodeProduct.barcode}
              className="w-full my-4"
            />

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  barcodeLabelRef.current?.printXprinter(selectedBarcodeProduct.name);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-2 border-none"
              >
                <Printer className="h-4 w-4" />
                <span>Xprinter orqali chop etish</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const safeName = selectedBarcodeProduct.name.replace(/[^\w\s-]/g, '').trim().slice(0, 40);
                  barcodeLabelRef.current?.downloadPng(`barcode-${safeName || selectedBarcodeProduct.barcode}`);
                }}
                className="w-full py-2 border hover:bg-slate-50 border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-2 bg-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>PNG yuklab olish</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 8: ADVANCED PRODUCT IMPORT (EXCEL/CSV/JSON) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-4xl w-full shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => {
                setShowImportModal(false);
                resetImportState();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center space-x-2 border-b pb-3 mb-4 shrink-0">
              <Upload className="h-6 w-6 text-indigo-600" />
              <div>
                <h3 className="text-sm font-black text-slate-800">Mahsulotlarni Massiv Import Qilish</h3>
                <p className="text-[10px] text-slate-400">Excel, Google Sheets yoki JSON-dan tovarlarni va boshlang'ich qoldiqlarni omborga kiriting</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {importPreviewData.length === 0 ? (
                /* STEP 1: UPLOAD / PASTE DATA */
                <div className="space-y-4">
                  {/* Download Excel / JSON template */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-3 shadow-xs">
                    <div>
                      <h4 className="text-xs font-black text-emerald-800">Import uchun tayyor shablonlar</h4>
                      <p className="text-[10px] text-emerald-700 mt-1 leading-relaxed">
                        Excel shablonida har bir ustun aniq ajratilgan — sarlavhalar birinchi qatorda, namuna mahsulotlar ostida.
                        Shablonni yuklab oling, Excelda to'ldiring va qayta yuklang.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadImportExcelTemplate()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg cursor-pointer transition-colors shadow-sm"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Excel shablon (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadImportJsonTemplate()}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>JSON namuna</span>
                      </button>
                    </div>
                    <p className="text-[9px] text-emerald-600/80 font-medium">
                      Ustunlar: Mahsulot nomi · Shtrix kod · Xarid narxi · Sotish narxi · Qoldiq · Minimal qoldiq · Kategoriya · Shkaf · Polka · Tavsif
                    </p>
                  </div>

                  {/* Select Import Method */}
                  <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl max-w-fit border">
                    <button
                      type="button"
                      onClick={() => setImportMethod('paste')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        importMethod === 'paste' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Jadvaldan nusxalab joylash (Copy & Paste)
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMethod('file')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        importMethod === 'file' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Hujjat yuklash (Excel / CSV / JSON)
                    </button>
                  </div>

                  {importMethod === 'paste' ? (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Excel yoki Google Sheets'dan ustunlarni nusxalangan holda bu yerga joylang (Ctrl+V):
                      </label>
                      <textarea
                        rows={8}
                        placeholder="Mahsulot nomi, Shtrix kod, Xarid narxi, Sotish narxi, Qoldiq va boshqa ustunlarni Exceldan nusxalab joylang..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white text-xs font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      />
                      
                      <div className="flex justify-between items-center bg-amber-50 border border-amber-100 p-3 rounded-lg">
                        <div className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                          💡 <strong>Tavsiya:</strong> Excel jadvalingizdagi ma'lumotlarni sarlavhalari bilan birga belgilab, nusxa oling (Copy) va bu yerga to'g'ridan-to'g'ri joylang (Paste). Ustunlar avtomatik aniqlanadi.
                        </div>
                        <button
                          type="button"
                          onClick={() => setPastedText(getImportPasteSample())}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-200 text-[10px] font-bold rounded-lg cursor-pointer shrink-0 transition-colors"
                        >
                          Namunani joylash
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Kompyuterdan Excel (.xlsx), CSV yoki JSON faylni tanlang:
                      </label>
                      <label 
                        onDragOver={(e) => {
                          e.preventDefault();
                          setImportIsDragging(true);
                        }}
                        onDragLeave={() => setImportIsDragging(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setImportIsDragging(false);
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            setImportFileName(file.name);
                            const isExcel = /\.(xlsx|xls)$/i.test(file.name);
                            const reader = new FileReader();
                            if (isExcel) {
                              reader.onload = (event) => {
                                try {
                                  const buffer = event.target?.result as ArrayBuffer;
                                  const rows = parseExcelFile(buffer);
                                  const prepared = prepareImportFromRows(rows);
                                  if (prepared) {
                                    applyImportData(prepared.headers, prepared.rows, prepared.columnMappings);
                                  }
                                } catch {
                                  alert('Excel faylni o\'qishda xatolik!');
                                }
                              };
                              reader.readAsArrayBuffer(file);
                            } else {
                              reader.onload = (event) => {
                                const text = event.target?.result as string;
                                handleParseImport(text);
                              };
                              reader.readAsText(file);
                            }
                          }
                        }}
                        className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 ${
                          importIsDragging ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50'
                        }`}
                      >
                        <Upload className="h-10 w-10 text-slate-400 mb-2" />
                        <span className="text-xs font-bold text-slate-600">
                          {importFileName ? `Tanlangan fayl: ${importFileName}` : 'Faylni sudrab bu yerga tashlang yoki bosing'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1">.xlsx, .xls, .csv, .json yoki .txt</span>
                        <input
                          type="file"
                          accept=".xlsx,.xls,.csv,.tsv,.json,.txt"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  <div className="flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => handleParseImport(pastedText)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1"
                    >
                      <span>Keyingi qadam (Sarlavhalarni aniqlash)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: COLUMN MAPPING & SETTINGS & PREVIEW */
                <div className="space-y-5">
                  <div className="flex justify-between items-center bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 text-xs text-indigo-900 font-bold">
                    <span>Hujjat muvaffaqiyatli tahlil qilindi! {importPreviewData.length} ta satr aniqlandi.</span>
                    <button 
                      onClick={resetImportState}
                      className="text-indigo-600 hover:underline cursor-pointer font-extrabold"
                    >
                      Hujjatni qayta tanlash
                    </button>
                  </div>

                  {/* Duplicate Handle Option & Category Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-4 border rounded-xl space-y-3">
                      <h4 className="text-xs font-black text-slate-800 border-b pb-1">1. Dublikat tovarlarni boshqarish siyosati</h4>
                      <p className="text-[10px] text-slate-400">Agar shtrix kodi mavjud bo'lsa, qanday amal bajarilsin?</p>
                      
                      <div className="grid grid-cols-1 gap-2">
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-bold p-2 bg-slate-50 border rounded-lg cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="update_stock"
                            checked={duplicateAction === 'update_stock'}
                            onChange={() => setDuplicateAction('update_stock')}
                            className="text-indigo-600"
                          />
                          <div>
                            <span>Ombor zaxirasiga qo'shish (Update stock)</span>
                            <span className="block text-[9px] font-normal text-slate-400">Mavjud qoldiqqa yangi qoldiq qo'shiladi va narxi yangilanadi</span>
                          </div>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-bold p-2 bg-slate-50 border rounded-lg cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="overwrite"
                            checked={duplicateAction === 'overwrite'}
                            onChange={() => setDuplicateAction('overwrite')}
                            className="text-indigo-600"
                          />
                          <div>
                            <span>Ustidan yozish (Overwrite)</span>
                            <span className="block text-[9px] font-normal text-slate-400">Eski ma'lumotlar o'chib, mutlaqo yangi qiymatlar yoziladi</span>
                          </div>
                        </label>
                        <label className="flex items-center space-x-2 text-xs text-slate-700 font-bold p-2 bg-slate-50 border rounded-lg cursor-pointer">
                          <input
                            type="radio"
                            name="duplicateAction"
                            value="skip"
                            checked={duplicateAction === 'skip'}
                            onChange={() => setDuplicateAction('skip')}
                            className="text-indigo-600"
                          />
                          <div>
                            <span>O'tkazib yuborish (Skip)</span>
                            <span className="block text-[9px] font-normal text-slate-400">Agar shtrix kod omborda allaqachon mavjud bo'lsa, import qilinmaydi</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="bg-white p-4 border rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-slate-800 border-b pb-1">2. Ustunlarni bog'lash (Column Mapping)</h4>
                      <p className="text-[10px] text-slate-400">Hujjat sarlavhalarini tovar atributlariga bog'lab chiqing:</p>

                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {[
                          { field: 'name', label: 'Mahsulot nomi *', required: true },
                          { field: 'barcode', label: 'Shtrix-kod / Barcode', required: false },
                          { field: 'supplyPrice', label: 'Kirim Narxi (Supply)', required: false },
                          { field: 'salePrice', label: 'Sotish Narxi (Sale)', required: false },
                          { field: 'stock', label: 'Mavjud qoldiq (Stock)', required: false },
                          { field: 'minStock', label: 'Minimal chegara', required: false },
                          { field: 'category', label: 'Kategoriya nomi', required: false },
                          { field: 'shkaf', label: 'Shkaf koordinatasi', required: false },
                          { field: 'polka', label: 'Polka koordinatasi', required: false },
                          { field: 'description', label: 'Mahsulot tavsifi', required: false }
                        ].map(({ field, label, required }) => (
                          <div key={field} className="flex items-center justify-between text-xs gap-3">
                            <span className="font-bold text-slate-600">{label}</span>
                            <select
                              value={columnMappings[field] || ''}
                              onChange={(e) => setColumnMappings({ ...columnMappings, [field]: e.target.value })}
                              className={`px-2 py-1.5 border rounded-lg bg-white w-48 font-bold ${
                                required && !columnMappings[field] ? 'border-red-500 bg-red-50/25 text-red-700' : 'border-slate-200 text-slate-800'
                              }`}
                            >
                              <option value="">-- Tanlanmagan --</option>
                              {importColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview Grid */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800">Bog'langan ustunlar asosida yakuniy natijani ko'rib chiqish (Birinchi 5 qator):</h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-500">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 sticky top-0">
                          <tr>
                            <th className="px-4 py-2">Nomi</th>
                            <th className="px-4 py-2">Shtrix-kod</th>
                            <th className="px-4 py-2">Kirim Narx</th>
                            <th className="px-4 py-2">Sotish Narx</th>
                            <th className="px-4 py-2">Boshlang'ich qoldiq</th>
                            <th className="px-4 py-2">Joylashuv (Shkaf/Polka)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreviewData.slice(0, 5).map((row, idx) => {
                            const name = columnMappings.name ? row[columnMappings.name] : '';
                            const bcode = columnMappings.barcode ? row[columnMappings.barcode] : 'Avto-yaratish';
                            const sup = columnMappings.supplyPrice ? row[columnMappings.supplyPrice] : '0';
                            const sal = columnMappings.salePrice ? row[columnMappings.salePrice] : '0';
                            const stk = columnMappings.stock ? row[columnMappings.stock] : '0';
                            const shk = columnMappings.shkaf ? row[columnMappings.shkaf] : '';
                            const pol = columnMappings.polka ? row[columnMappings.polka] : '';
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-2 font-bold text-slate-800">{name || <span className="text-red-500 italic">Ismsiz (O'tkazib yuboriladi)</span>}</td>
                                <td className="px-4 py-2 font-mono text-slate-600">{bcode}</td>
                                <td className="px-4 py-2 font-bold text-slate-700">{sup ? formatMoney(parseFloat(String(sup).replace(/[^0-9.-]/g, '')) || 0) : '0'}</td>
                                <td className="px-4 py-2 font-bold text-blue-600">{sal ? formatMoney(parseFloat(String(sal).replace(/[^0-9.-]/g, '')) || 0) : '0'}</td>
                                <td className="px-4 py-2 font-bold text-emerald-600">{stk || '0'} ta</td>
                                <td className="px-4 py-2 font-semibold text-slate-500">{shk || pol ? `📍 ${shk || ''} / ${pol || ''}` : '--'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-end space-x-2 border-t pt-4 shrink-0">
                    <button
                      type="button"
                      onClick={resetImportState}
                      className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
                    >
                      Orqaga qaytish
                    </button>
                    <button
                      type="button"
                      onClick={handleCommitImport}
                      disabled={!columnMappings.name}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center space-x-1"
                    >
                      <Check className="h-4 w-4" />
                      <span>Import qilishni boshlash ({importPreviewData.length} tovar)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
