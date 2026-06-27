import React from 'react';
import { Phone } from 'lucide-react';

const SUPPORT_PHONE = '+998907863888';

const brandLinkClass =
  'inline-flex items-center gap-0.5 font-semibold text-blue-600 hover:text-blue-700 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500 transition-colors';

export default function AppFooter() {
  return (
    <footer className="shrink-0 w-full border-t border-slate-100 bg-white/80 backdrop-blur-sm">
      <div className="px-4 md:px-8 py-2.5">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400 select-none">
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span>© 2026</span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="flex items-center gap-1 flex-wrap justify-center">
            <span>Ishlab chiqaruvchi:</span>
            <a href={`tel:${SUPPORT_PHONE}`} className={brandLinkClass} title="Qo'ng'iroq qilish">
              CDCGroup
            </a>
          </span>
          <span className="text-slate-300 hidden sm:inline">·</span>
          <span className="flex items-center gap-1 flex-wrap justify-center">
            <span>Qo'llab-quvvatlovchi:</span>
            <a href={`tel:${SUPPORT_PHONE}`} className={brandLinkClass} title="Qo'ng'iroq qilish">
              CraDev Company
            </a>
          </span>
          <a
            href={`tel:${SUPPORT_PHONE}`}
            className="hidden md:inline-flex items-center gap-1 ml-1 text-slate-400 hover:text-blue-600 transition-colors"
            title="Qo'ng'iroq qilish"
          >
            <Phone className="w-3 h-3" />
            <span>{SUPPORT_PHONE}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
