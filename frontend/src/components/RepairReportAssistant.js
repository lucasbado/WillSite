import React, { useState } from 'react';
import { WandSparkles, X } from 'lucide-react';
import { buildRepairReport, repairTests } from '../utils/repairReport';

export default function RepairReportAssistant({ problem, parts, value, onApply }) {
    const [open, setOpen] = useState(false);
    const [diagnosis, setDiagnosis] = useState('');
    const [procedures, setProcedures] = useState('');
    const [notes, setNotes] = useState('');
    const [tests, setTests] = useState([]);
    const [includeParts, setIncludeParts] = useState(false);
    const draft = buildRepairReport({ problem, diagnosis, procedures, notes, tests, parts: includeParts ? parts : [] });
    const fieldClass = 'w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-sm outline-none focus:border-blue-500';
    return <div className="space-y-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold text-xs">
            {open ? <X size={15} /> : <WandSparkles size={15} />} Assistente de laudo
        </button>
        {open && <section aria-label="Assistente de laudo" className="p-4 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30 space-y-4">
            <p className="text-xs text-slate-600 dark:text-slate-300">Monte um rascunho com o que foi realizado. Revise antes de salvar; apenas os testes marcados serão descritos como aprovados.</p>
            <label className="block text-xs font-bold dark:text-slate-200">Diagnóstico encontrado
                <textarea className={fieldClass} value={diagnosis} maxLength={2000} onChange={e => setDiagnosis(e.target.value)} placeholder="O que a avaliação técnica identificou?" />
            </label>
            <label className="block text-xs font-bold dark:text-slate-200">Procedimentos realizados
                <textarea className={fieldClass} value={procedures} maxLength={3000} onChange={e => setProcedures(e.target.value)} placeholder="Descreva o reparo, ajuste ou substituição realizados." />
            </label>
            {parts.length > 0 && <label className="flex gap-2 items-start text-xs dark:text-slate-200">
                <input type="checkbox" checked={includeParts} onChange={e => setIncludeParts(e.target.checked)} />
                Confirmo o uso das peças selecionadas: {parts.join(', ')}.
            </label>}
            <fieldset><legend className="text-xs font-bold dark:text-slate-200 mb-2">Testes realizados e aprovados</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{repairTests.map(test => <label key={test} className="flex items-center gap-2 text-xs dark:text-slate-200">
                    <input type="checkbox" checked={tests.includes(test)} onChange={e => setTests(e.target.checked ? [...tests, test] : tests.filter(item => item !== test))} />{test}
                </label>)}</div>
            </fieldset>
            <label className="block text-xs font-bold dark:text-slate-200">Orientações e observações
                <textarea className={fieldClass} value={notes} maxLength={2000} onChange={e => setNotes(e.target.value)} placeholder="Cuidados, limitações ou recomendações específicas." />
            </label>
            <div className="rounded-xl p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-blue-600 mb-2">Prévia do laudo</p>
                <p className="whitespace-pre-wrap text-xs text-slate-700 dark:text-slate-200">{draft || 'Preencha os dados acima.'}</p>
            </div>
            <button type="button" disabled={!diagnosis.trim() || !procedures.trim()} onClick={() => {
                onApply(value.trim() ? `${value.trim()}\n\n${draft}` : draft); setOpen(false);
            }} className="bg-blue-600 text-white rounded-xl px-4 py-3 text-xs font-bold disabled:opacity-40">
                {value.trim() ? 'Acrescentar ao laudo existente' : 'Usar rascunho no laudo'}
            </button>
        </section>}
    </div>;
}
