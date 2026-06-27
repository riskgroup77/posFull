import * as XLSX from 'xlsx';

/** Import shabloni ustunlari — hujjat va mapping bilan mos */
export const IMPORT_TEMPLATE_COLUMNS = [
  { key: 'name', header: 'Mahsulot nomi', width: 28 },
  { key: 'barcode', header: 'Shtrix kod', width: 16 },
  { key: 'supplyPrice', header: 'Xarid narxi (so\'m)', width: 18 },
  { key: 'salePrice', header: 'Sotish narxi (so\'m)', width: 18 },
  { key: 'stock', header: 'Qoldiq', width: 10 },
  { key: 'minStock', header: 'Minimal qoldiq', width: 14 },
  { key: 'category', header: 'Kategoriya', width: 18 },
  { key: 'shkaf', header: 'Shkaf', width: 10 },
  { key: 'polka', header: 'Polka', width: 12 },
  { key: 'description', header: 'Tavsif', width: 32 },
] as const;

export const IMPORT_SAMPLE_ROWS: string[][] = [
  ['Coca-Cola 1.5L', '4820000190013', '9500', '13500', '45', '10', 'Ichimliklar', 'A1', '2-qator', 'Gazlangan alkogolsiz ichimlik'],
];

const BARCODE_COL_INDEX = 1;

function setTextColumn(ws: XLSX.WorkSheet, colIndex: number, rowCount: number) {
  for (let r = 1; r <= rowCount; r++) {
    const cellRef = XLSX.utils.encode_cell({ r, c: colIndex });
    const cell = ws[cellRef];
    if (cell && cell.v != null) {
      cell.t = 's';
      cell.v = String(cell.v);
    }
  }
}

/** Chiroyli Excel (.xlsx) import shabloni yuklab olish */
export function downloadImportExcelTemplate() {
  const headers = IMPORT_TEMPLATE_COLUMNS.map((c) => c.header);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...IMPORT_SAMPLE_ROWS]);

  ws['!cols'] = IMPORT_TEMPLATE_COLUMNS.map((c) => ({ wch: c.width }));
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft', state: 'frozen' };

  setTextColumn(ws, BARCODE_COL_INDEX, IMPORT_SAMPLE_ROWS.length);

  const guideWs = XLSX.utils.aoa_to_sheet([
    ['POS — Mahsulot import qo\'llanmasi'],
    [''],
    ['1. "Mahsulotlar" varag\'ida 1 ta namuna qator bor — uni o\'zgartiring yoki ostiga yangi qatorlar qo\'shing.'],
    ['2. "Mahsulot nomi" ustuni majburiy. Qolgan ustunlar ixtiyoriy.'],
    ['3. Shtrix kod bo\'sh qoldirilsa, tizim avtomatik yaratadi.'],
    ['4. Mavjud shtrix kod bilan tovar import qilinsa, siyosat tanlanadi (qoldiq qo\'shish / ustidan yozish).'],
    ['5. Kategoriya nomi yangi bo\'lsa, avtomatik yaratiladi.'],
    [''],
    ['Ustunlar tartibi:'],
    ...IMPORT_TEMPLATE_COLUMNS.map((c, i) => [`${i + 1}.`, c.header]),
  ]);
  guideWs['!cols'] = [{ wch: 8 }, { wch: 52 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Mahsulotlar');
  XLSX.utils.book_append_sheet(wb, guideWs, 'Qo\'llanma');

  XLSX.writeFile(wb, 'mahsulotlar_import_shabloni.xlsx');
}

/** JSON namuna yuklab olish */
export function downloadImportJsonTemplate() {
  const rows = IMPORT_SAMPLE_ROWS.map((row) => {
    const obj: Record<string, string> = {};
    IMPORT_TEMPLATE_COLUMNS.forEach((col, i) => {
      obj[col.header] = row[i];
    });
    return obj;
  });

  const blob = new Blob([JSON.stringify(rows, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mahsulotlar_import_namuna.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Tab-separated matn (Copy & Paste uchun) */
export function getImportPasteSample(): string {
  const headers = IMPORT_TEMPLATE_COLUMNS.map((c) => c.header).join('\t');
  const rows = IMPORT_SAMPLE_ROWS.map((r) => r.join('\t')).join('\n');
  return `${headers}\n${rows}`;
}

const MAPPING_FIELDS = ['name', 'barcode', 'supplyPrice', 'salePrice', 'stock', 'minStock', 'category', 'shkaf', 'polka', 'description'] as const;

/** Hujjat sarlavhalaridan ustun mapping avtomatik aniqlash */
export function buildColumnMappingsFromHeaders(headers: string[]): Record<string, string> {
  const initialMap: Record<string, string> = {};

  MAPPING_FIELDS.forEach((field) => {
    const match = headers.find((h) => {
      const hl = h.toLowerCase();
      if (field === 'name') return hl.includes('nom') || hl === 'name' || hl === 'tovar';
      if (field === 'barcode') return hl.includes('kod') || hl.includes('bar') || hl === 'barcode' || hl.includes('shtrix');
      if (field === 'supplyPrice') return hl.includes('xarid') || hl.includes('kirish') || hl.includes('supply') || hl.includes('tannarx');
      if (field === 'salePrice') return hl.includes('sotish') || hl.includes('sotuv') || hl.includes('narx') || hl === 'price' || hl === 'sale_price';
      if (field === 'stock') return hl.includes('qoldiq') || hl === 'stock' || hl === 'qty' || hl === 'quantity' || (hl.includes('soni') && !hl.includes('minimal'));
      if (field === 'minStock') return hl.includes('minimal') || hl.includes('min') || hl.includes('chegara') || hl.includes('limit');
      if (field === 'category') return hl.includes('kat') || hl === 'category' || hl.includes('bolim') || hl.includes('bo\'lim');
      if (field === 'shkaf') return hl === 'shkaf' || hl.includes('joy') || hl.includes('shkaf');
      if (field === 'polka') return hl === 'polka' || hl.includes('qator') || hl.includes('polka');
      if (field === 'description') return hl.includes('izoh') || hl.includes('tavsif') || hl.includes('desc');
      return false;
    });
    if (match) {
      initialMap[field] = match;
    }
  });

  return initialMap;
}

/** JSON yoki Excel qatorlarini import state ga tayyorlash */
export function prepareImportFromRows(rows: Record<string, string>[]) {
  if (rows.length === 0) {
    return null;
  }
  const headers = Object.keys(rows[0]);
  return {
    headers,
    rows,
    columnMappings: buildColumnMappingsFromHeaders(headers),
  };
}

/** Excel faylni import preview formatiga aylantirish */
export function parseExcelFile(buffer: ArrayBuffer): Record<string, string>[] {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  return rawRows.map((row) => {
    const normalized: Record<string, string> = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key.trim()] = value == null ? '' : String(value).trim();
    });
    return normalized;
  });
}
