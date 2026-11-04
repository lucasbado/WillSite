import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import MoneyInput from './MoneyInput';
import { requestError } from '../utils/requestError';
import { REPAIR_SERVICES } from './RepairQuote';

const EMPTY = { nome: '', modelo_compativel: '', categoria: 'Hardware', quantidade: '', preco_custo: '', preco_venda: '', minimo: 5, descricao: '' };
const TYPES = { bateria: 'Bateria', tela: 'Tela', conector: 'Conector de carga', tampa: 'Tampa traseira' };
const input = 'w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-base text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none';

export default function InventoryItemForm({ initial, editing, models, onSave, onClose }) {
    const [form, setForm] = useState({ ...EMPTY, ...initial });
    const [template, setTemplate] = useState('');
    const [customName, setCustomName] = useState(false);
    const [keepModel, setKeepModel] = useState(true);
    const [quote, setQuote] = useState(false);
    const [service, setService] = useState('');
    const [labor, setLabor] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const name = useRef(null);
    const panel = useRef(null);
    const saving = useRef(false);
    const action = useRef('close');
    useEffect(() => { if (notice && !busy) name.current?.focus(); }, [notice, busy]);
    useEffect(() => {
        const previous = document.activeElement;
        name.current?.focus();
        const keys = event => {
            if (event.key === 'Escape' && !saving.current) onClose();
            if (event.key === 'Tab') {
                const targets = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), summary')].filter(item => item.getClientRects().length);
                const first = targets[0], last = targets[targets.length - 1];
                if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', keys);
        return () => { document.removeEventListener('keydown', keys); previous?.focus(); };
    }, [onClose]);

    const change = (field, value) => setForm(previous => ({ ...previous, [field]: value }));
    const changeModel = value => setForm(previous => ({ ...previous, modelo_compativel: value,
        nome: template && !customName ? `${TYPES[template]} ${value}`.trim() : previous.nome }));
    const submit = async event => {
        event.preventDefault();
        if (saving.current) return;
        const another = (event.nativeEvent.submitter?.value || action.current) === 'another';
        action.current = 'close';
        saving.current = true; setBusy(true); setError(''); setNotice('');
        const payload = { ...form, modelo_compativel: form.modelo_compativel.trim() || 'Geral',
            preco_custo: form.preco_custo === '' ? 0 : form.preco_custo, preco_venda: form.preco_venda === '' ? 0 : form.preco_venda };
        if (quote && !editing) payload.quote = { service, labor_price: labor };
        try {
            await onSave(payload);
            if (another && !editing) {
                setForm({ ...EMPTY, categoria: keepModel ? form.categoria : 'Hardware', modelo_compativel: keepModel ? form.modelo_compativel : '' });
                setTemplate(''); setCustomName(false); setQuote(false); setService(''); setLabor('');
                setNotice(`Item salvo: ${form.nome}. Pode preencher a próxima peça.`);
            } else onClose();
        } catch (err) { setError(requestError(err, 'Não foi possível salvar. Seus dados continuam no formulário.')); }
        finally { saving.current = false; setBusy(false); }
    };

    return <div className="fixed inset-0 z-[100] bg-slate-950/70 p-2 sm:p-6 flex items-center justify-center">
        <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="stock-form-title" className="w-full max-w-3xl max-h-[94dvh] rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xl flex flex-col overflow-hidden">
            <header className="flex justify-between items-center gap-3 p-4 sm:px-6 border-b border-slate-200 dark:border-slate-700 shrink-0"><div><h2 id="stock-form-title" className="font-bold text-xl">{editing ? 'Editar peça' : 'Cadastrar peça'}</h2><p className="text-sm text-slate-500 dark:text-slate-400">{editing ? 'Confira os dados e salve a alteração.' : 'Preencha os dados principais. Os detalhes adicionais são opcionais.'}</p></div><button type="button" aria-label="Fechar cadastro de peça" disabled={busy} onClick={onClose} className="p-2"><X /></button></header>
            <form onSubmit={submit} className="min-h-0 flex flex-col">
                <div className="overflow-y-auto modern-scroll-v p-4 sm:p-6 space-y-4">
                {notice && <p role="status" className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">{notice}</p>}
                {error && <p role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200">{error}</p>}
                {!editing && <div className="flex flex-wrap gap-2 items-center"><span className="text-sm">Começar com:</span>{Object.entries(TYPES).map(([code, label]) => <button key={code} type="button" disabled={busy} className="chat-choice" onClick={() => { setTemplate(code); setService(code); setCustomName(false); change('nome', `${label} ${form.modelo_compativel}`.trim()); name.current?.focus(); }}>{label}</button>)}</div>}
                <div className="grid sm:grid-cols-2 gap-4">
                    <label className="block text-sm font-semibold sm:col-span-2">Nome da peça<input ref={name} required minLength={2} maxLength={100} disabled={busy} className={input} value={form.nome} onChange={e => { setCustomName(true); change('nome', e.target.value); }} placeholder="Ex.: Bateria Samsung Galaxy S23" /></label>
                    <label className="block text-sm font-semibold">Modelo compatível<input aria-label="Modelo compatível" aria-describedby="stock-model-help" list="stock-model-suggestions" maxLength={50} disabled={busy} required={quote} className={input} value={form.modelo_compativel} onChange={e => changeModel(e.target.value)} placeholder="Digite o modelo, mesmo que seja novo" /><span id="stock-model-help" className="font-normal text-xs text-slate-500 dark:text-slate-400">Pode digitar um modelo novo. Sem modelo, a peça fica como Geral.</span></label>
                    <datalist id="stock-model-suggestions">{models.map(model => <option key={model} value={model} />)}</datalist>
                    <label className="block text-sm font-semibold">Categoria<select disabled={busy} className={input} value={form.categoria} onChange={e => change('categoria', e.target.value)}>{[...new Set(['Hardware', 'Acessório', 'Insumo', 'Software', 'Outros', form.categoria])].filter(Boolean).map(category => <option key={category}>{category}</option>)}</select></label>
                    <label className="block text-sm font-semibold">Quantidade em estoque<input required type="number" min="0" max="1000000" step="any" disabled={busy} className={input} value={form.quantidade} onChange={e => change('quantidade', e.target.value)} placeholder="Ex.: 5" /></label>
                    <div><label htmlFor="stock-sale" className="text-sm font-semibold">Preço de venda (R$)</label><MoneyInput id="stock-sale" disabled={busy} required={quote} value={form.preco_venda} onChange={value => change('preco_venda', value)} /></div>
                </div>
                <details className="rounded-xl border border-slate-200 dark:border-slate-700 p-3"><summary className="cursor-pointer font-semibold">Custo, estoque mínimo e descrição</summary><div className="grid sm:grid-cols-2 gap-4 mt-3">
                    <div><label htmlFor="stock-cost" className="text-sm font-semibold">Custo de compra (R$, opcional)</label><MoneyInput id="stock-cost" disabled={busy} value={form.preco_custo} onChange={value => change('preco_custo', value)} /></div>
                    <label className="block text-sm font-semibold">Avisar quando chegar a<input type="number" min="0" max="1000000" step="1" disabled={busy} className={input} value={form.minimo} onChange={e => change('minimo', e.target.value)} /></label>
                    <label className="block text-sm font-semibold sm:col-span-2">Descrição (opcional)<textarea maxLength={3000} disabled={busy} className={input} value={form.descricao} onChange={e => change('descricao', e.target.value)} /></label>
                </div></details>
                {!editing && <div className="rounded-xl p-4 border border-blue-200 dark:border-blue-800 space-y-3"><label className="flex items-start gap-3"><input type="checkbox" disabled={busy} className="mt-1 w-5 h-5" checked={quote} onChange={e => setQuote(e.target.checked)} /><span><strong>Usar esta peça nos orçamentos da Cidi</strong><span className="block text-sm text-slate-500 dark:text-slate-400">Cadastre a mão de obra aqui para a Cidi somar ao preço de venda.</span></span></label>
                    {quote && <div className="grid sm:grid-cols-2 gap-4"><label className="text-sm font-semibold">Serviço para a Cidi<select required disabled={busy} className={input} value={service} onChange={e => setService(e.target.value)}><option value="">Escolha o serviço</option>{Object.entries(REPAIR_SERVICES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label><div><label htmlFor="stock-labor" className="text-sm font-semibold">Mão de obra (R$)</label><MoneyInput id="stock-labor" disabled={busy} required value={labor} onChange={setLabor} /><p className="text-xs text-slate-500 dark:text-slate-400">Zero significa sem cobrança de mão de obra.</p></div></div>}
                </div>}
                {!editing && <label className="flex gap-3 items-center text-sm"><input type="checkbox" disabled={busy} checked={keepModel} onChange={e => setKeepModel(e.target.checked)} className="w-5 h-5" />Manter modelo e categoria ao cadastrar a próxima peça</label>}
                </div>
                <div className="flex flex-wrap gap-3 justify-end p-4 sm:px-6 shrink-0 border-t border-slate-200 dark:border-slate-700"><button type="button" disabled={busy} onClick={onClose} className="chat-choice order-1">Cancelar</button><button type="submit" value="close" disabled={busy} onClick={() => { action.current = 'close'; }} className="order-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 font-bold disabled:opacity-50">{busy ? 'Salvando…' : editing ? 'Salvar alterações' : 'Salvar peça'}</button>{!editing && <button type="submit" value="another" disabled={busy} onClick={() => { action.current = 'another'; }} className="chat-choice order-2">Salvar e cadastrar outra</button>}</div>
            </form>
        </section>
    </div>;
}
