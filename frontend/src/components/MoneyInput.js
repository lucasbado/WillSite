import React from 'react';
import { moneyInput, moneyValue } from '../utils/money';

export default function MoneyInput({ id, value, onChange, disabled = false, required = false }) {
    return <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
        <input id={id} type="text" inputMode="decimal" autoComplete="off" placeholder="0,00" disabled={disabled} required={required}
            className="w-full p-4 pl-11 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-2xl font-black text-slate-700 dark:text-slate-200 outline-none transition-all text-sm shadow-sm"
            value={String(value).replace('.', ',')}
            onChange={event => { if (moneyInput(event.target.value)) onChange(event.target.value); }}
            onBlur={() => { if (value !== '') onChange(moneyValue(value).toFixed(2).replace('.', ',')); }} />
    </div>;
}
