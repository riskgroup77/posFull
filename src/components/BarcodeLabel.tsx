import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import JsBarcode from 'jsbarcode';
import { getBarcodeFormat, normalizeBarcodeValue } from '../utils/barcode';
import { printXprinterBarcode } from '../utils/printXprinterBarcode';

export interface BarcodeLabelHandle {
  downloadPng: (filename: string) => void;
  printXprinter: (productName: string) => void;
}

interface BarcodeLabelProps {
  value: string;
  className?: string;
  showValue?: boolean;
}

const BarcodeLabel = forwardRef<BarcodeLabelHandle, BarcodeLabelProps>(
  ({ value, className = '', showValue = true }, ref) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
      const svg = svgRef.current;
      if (!svg || !value.trim()) return;

      const normalized = normalizeBarcodeValue(value);
      const format = getBarcodeFormat(normalized);

      const render = (fmt: string) => {
        JsBarcode(svg, normalized, {
          format: fmt,
          width: 2,
          height: 72,
          displayValue: showValue,
          fontSize: 14,
          font: 'Arial, sans-serif',
          textMargin: 6,
          margin: 12,
          background: '#f5f5f5',
          lineColor: '#000000',
        });
      };

      try {
        render(format);
      } catch {
        try {
          render('CODE128');
        } catch {
          svg.innerHTML = '';
        }
      }
    }, [value, showValue]);

    useImperativeHandle(ref, () => ({
      downloadPng(filename: string) {
        const svg = svgRef.current;
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.fillStyle = '#f5f5f5';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) return;
            const link = document.createElement('a');
            link.href = URL.createObjectURL(pngBlob);
            link.download = filename.endsWith('.png') ? filename : `${filename}.png`;
            link.click();
            URL.revokeObjectURL(link.href);
          });
          URL.revokeObjectURL(url);
        };
        img.src = url;
      },
      printXprinter(productName: string) {
        printXprinterBarcode({ barcode: value, productName });
      },
    }));

    if (!value.trim()) {
      return (
        <div className={`bg-slate-100 rounded-lg p-4 text-xs text-slate-400 ${className}`}>
          Shtrix-kod mavjud emas
        </div>
      );
    }

    return (
      <div className={`bg-[#f5f5f5] rounded-lg p-3 flex items-center justify-center ${className}`}>
        <svg ref={svgRef} className="max-w-full h-auto" />
      </div>
    );
  },
);

BarcodeLabel.displayName = 'BarcodeLabel';

export default BarcodeLabel;
