import JsBarcode from 'jsbarcode';
import { getBarcodeFormat, normalizeBarcodeValue } from './barcode';

export interface XprinterBarcodeOptions {
  barcode: string;
  productName: string;
  /** Etyket kengligi mm (Xprinter: 40, 50 yoki 58) */
  labelWidthMm?: number;
  labelHeightMm?: number;
}

function renderBarcodeSvg(barcode: string): string {
  const normalized = normalizeBarcodeValue(barcode);
  const format = getBarcodeFormat(normalized);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

  const opts = {
    width: 1.5,
    height: 36,
    displayValue: true,
    fontSize: 10,
    font: 'Arial, sans-serif',
    textMargin: 2,
    margin: 0,
    background: '#ffffff',
    lineColor: '#000000',
  };

  try {
    JsBarcode(svg, normalized, { ...opts, format });
  } catch {
    JsBarcode(svg, normalized, { ...opts, format: 'CODE128' });
  }

  return new XMLSerializer().serializeToString(svg);
}

/** Xprinter termo etiket printeri uchun (40x30 / 50x30 mm) */
export function printXprinterBarcode({
  barcode,
  productName,
  labelWidthMm = 50,
  labelHeightMm = 30,
}: XprinterBarcodeOptions): void {
  if (!barcode.trim()) return;

  const svgHtml = renderBarcodeSvg(barcode);
  const title = productName.trim().slice(0, 32) || barcode;
  const w = labelWidthMm;
  const h = labelHeightMm;

  const printWindow = window.open('', '_blank', 'width=280,height=200');
  if (!printWindow) {
    alert('Chop etish oynasi ochilmadi. Brauzer popup blokirovkasini o\'chiring.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Xprinter — ${title}</title>
  <style>
    @page {
      size: ${w}mm ${h}mm;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: ${w}mm;
      height: ${h}mm;
      overflow: hidden;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: Arial, Helvetica, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1mm 1.5mm;
      text-align: center;
    }
    .name {
      font-size: 7pt;
      font-weight: 700;
      line-height: 1.15;
      max-height: 8mm;
      overflow: hidden;
      word-break: break-word;
      width: 100%;
      margin-bottom: 0.5mm;
      color: #000;
    }
    .barcode-wrap {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      flex: 1;
    }
    .barcode-wrap svg {
      max-width: 100%;
      height: auto;
      display: block;
    }
    @media print {
      body { padding: 0.5mm 1mm; }
    }
  </style>
</head>
<body>
  <div class="name">${title.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <div class="barcode-wrap">${svgHtml}</div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.focus();
        window.print();
      }, 300);
    };
    window.onafterprint = function() { window.close(); };
  </script>
</body>
</html>`);
  printWindow.document.close();
}
