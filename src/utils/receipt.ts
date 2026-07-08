import { Sale, StoreSettings } from '../types';
import { formatUzs } from './currency';

export const RECEIPT_PRINT_CSS = `
  @page { size: 80mm auto; margin: 0; }
  @media print {
    html, body { margin: 0 !important; padding: 0 !important; width: 80mm; }
    body * { visibility: hidden !important; }
    #print-area, #print-area * { visibility: visible !important; }
    #print-area {
      position: fixed !important;
      left: 0 !important;
      top: 0 !important;
      width: 80mm !important;
      max-width: 80mm !important;
      margin: 0 !important;
      padding: 1mm 2mm 2mm 1mm !important;
      font-family: 'Courier New', Courier, monospace !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      line-height: 1.25 !important;
      color: #000 !important;
      background: #fff !important;
      box-sizing: border-box !important;
    }
    .no-print { display: none !important; }
  }
`;

export function formatReceiptText(sale: Sale, settings: StoreSettings): string {
  const fmt = (n: number) => formatUzs(n);
  const dt = new Date(sale.dateTime).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const lines: string[] = [];
  const W = 32;
  const hr = '─'.repeat(W);
  const dbl = '═'.repeat(W);

  const pad = (left: string, right: string) => {
    const space = W - left.length - right.length;
    return left + (space > 0 ? ' '.repeat(space) : ' ') + right;
  };

  lines.push(dbl);
  lines.push(settings.storeName.toUpperCase().slice(0, W));
  if (settings.address) lines.push(settings.address.slice(0, W));
  if (settings.phone) lines.push(`Tel: ${settings.phone}`);
  lines.push(dbl);
  lines.push(pad('Chek №:', `#${sale.receiptNo}`));
  lines.push(pad('Sana:', dt));
  lines.push(pad('Kassir:', sale.sellerName.slice(0, 18)));
  lines.push(pad('Mijoz:', (sale.customerName || 'Umumiy').slice(0, 18)));
  lines.push(hr);
  lines.push('Mahsulot           Miqd    Summa');
  lines.push(hr);

  for (const item of sale.items) {
    const name = item.productName.slice(0, 18);
    const qty = Number.isInteger(item.quantity)
      ? String(item.quantity)
      : item.quantity.toFixed(2).replace(/\.?0+$/, '');
    lines.push(pad(name, `${qty}  ${fmt(item.total)}`));
  }

  lines.push(hr);
  lines.push(pad('Jami:', fmt(sale.totalAmount)));
  if (sale.discount > 0) lines.push(pad('Chegirma:', fmt(sale.discount)));
  lines.push(pad("TO'LANADI:", fmt(sale.finalAmount)));
  lines.push(hr);
  if (sale.cashPaid > 0) lines.push(pad('Naqd:', fmt(sale.cashPaid)));
  if (sale.debtAmount > 0) lines.push(pad('Nasiya:', fmt(sale.debtAmount)));
  lines.push(dbl);
  if (settings.receiptFooter) lines.push(settings.receiptFooter.slice(0, W));
  lines.push(dbl);

  return lines.join('\n');
}

export function buildReceiptHtml(sale: Sale, settings: StoreSettings): string {
  const fmt = (n: number) => formatUzs(n);
  const dt = new Date(sale.dateTime).toLocaleString('uz-UZ', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const itemsHtml = sale.items.map((item) => {
    const qty = Number.isInteger(item.quantity)
      ? String(item.quantity)
      : item.quantity.toFixed(2).replace(/\.?0+$/, '');
    return `<tr>
      <td style="padding:2px 0;font-weight:700;">${item.productName}</td>
      <td style="padding:2px 0;text-align:center;">${qty}</td>
      <td style="padding:2px 0;text-align:right;font-weight:700;">${fmt(item.total)}</td>
    </tr>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Chek #${sale.receiptNo}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 80mm; margin: 0; padding: 1mm 2mm 2mm 1mm;
    font-size: 12px; font-weight: 600; line-height: 1.25; color: #000;
  }
  .c { text-align: center; }
  .r { text-align: right; }
  .b { font-weight: 900; }
  .hr { border-top: 1px dashed #000; margin: 3px 0; }
  table { width: 100%; border-collapse: collapse; }
  @media print { body { width: 80mm; padding: 1mm 2mm 2mm 1mm; } }
</style></head><body>
  <div class="c b" style="font-size:14px;margin-bottom:2px;">${settings.storeName.toUpperCase()}</div>
  ${settings.address ? `<div class="c" style="font-size:10px;">${settings.address}</div>` : ''}
  ${settings.phone ? `<div class="c" style="font-size:10px;">Tel: ${settings.phone}</div>` : ''}
  <div class="hr"></div>
  <div>Chek №: <span class="b">#${sale.receiptNo}</span></div>
  <div>Sana: ${dt}</div>
  <div>Kassir: ${sale.sellerName}</div>
  <div>Mijoz: ${sale.customerName || 'Umumiy'}</div>
  <div class="hr"></div>
  <table><thead><tr style="font-size:10px;">
    <th style="text-align:left;">Mahsulot</th><th>Miqd</th><th class="r">Summa</th>
  </tr></thead><tbody>${itemsHtml}</tbody></table>
  <div class="hr"></div>
  <table>
    <tr><td>Jami:</td><td class="r b">${fmt(sale.totalAmount)}</td></tr>
    ${sale.discount > 0 ? `<tr><td>Chegirma:</td><td class="r">${fmt(sale.discount)}</td></tr>` : ''}
    <tr><td class="b">TO'LANADI:</td><td class="r b">${fmt(sale.finalAmount)}</td></tr>
    ${sale.cashPaid > 0 ? `<tr><td>Naqd:</td><td class="r">${fmt(sale.cashPaid)}</td></tr>` : ''}
    ${sale.debtAmount > 0 ? `<tr><td>Nasiya:</td><td class="r">${fmt(sale.debtAmount)}</td></tr>` : ''}
  </table>
  <div class="hr"></div>
  ${settings.receiptFooter ? `<div class="c b" style="font-size:11px;">${settings.receiptFooter}</div>` : ''}
  <script>window.onload=function(){window.print();setTimeout(function(){window.close();},400);};</script>
</body></html>`;
}
