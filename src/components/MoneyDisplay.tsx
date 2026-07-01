import React from 'react';
import { formatUzs, formatUsd } from '../utils/currency';

interface MoneyDisplayProps {
  amountUzs: number;
  usdRate: number;
  className?: string;
  uzsClassName?: string;
  usdClassName?: string;
  showUsd?: boolean;
  inline?: boolean;
}

export default function MoneyDisplay({
  amountUzs,
  usdRate,
  className = '',
  uzsClassName = '',
  usdClassName = 'text-[10px] text-emerald-600 font-semibold',
  showUsd = true,
  inline = false,
}: MoneyDisplayProps) {
  const hasRate = showUsd && usdRate > 0;

  if (inline && hasRate) {
    return (
      <span className={className}>
        <span className={uzsClassName}>{formatUzs(amountUzs)}</span>
        <span className={`ml-1.5 ${usdClassName}`}>({formatUsd(amountUzs, usdRate)})</span>
      </span>
    );
  }

  return (
    <div className={`${inline ? '' : 'leading-tight'} ${className}`}>
      <span className={uzsClassName}>{formatUzs(amountUzs)}</span>
      {hasRate && (
        <span className={`block mt-0.5 ${usdClassName}`}>{formatUsd(amountUzs, usdRate)}</span>
      )}
    </div>
  );
}
