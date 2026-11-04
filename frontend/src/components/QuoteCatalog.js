import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../pages/api';
import { requestError } from '../utils/requestError';
import MoneyInput from './MoneyInput';
import { REPAIR_SERVICES, quoteControl, quoteMoney } from './RepairQuote';

const EMPTY = { model: '', service: 'tela', inventory_item_id: '', labor_price: '', active: true };

export function QuoteAlertSummary() {
    const navigate = useNavigate();
    const [count, setCount] = useState(0);
    const [failed, setFailed] = useState(false);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        let active = true;
        const refresh = async () => {
            try {
                const { data } = await api.get('/quotes/admin/alerts');
                if (active) { setCount(data.alerts.length + data.unpriced_parts.length); setFailed(false); setLoaded(true); }
            } catch { if (active) setFailed(true); }
        };
        refresh();
        const timer = window.setInterval(refresh, 60000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);
    return <button onClick={() => navigate('/admin/estoque#orcamentos')} className="w-full my-4 p-4 text-left rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-slate-800 dark:text-slate-100">
        <strong>Orçamentos da Cidi</strong><span className="block text-sm">{failed ? 'Não foi possível conferir as pendências. Abrir cadastro e tentar novamente.' : !loaded ? 'Conferindo pendências…' : count ? `${count} pendência(s) de orçamento ou preço. Conferir peças e mão de obra →` : 'Cadastro sem pendências de orçamento. Gerenciar serviços e preços →'}</span>
    </button>;
}

export default function QuoteCatalog({ inventory, onEditPart }) {
    const [catalog, setCatalog] = useState([]);
    const [alerts, setAlerts] = useState({ alerts: [], unpriced_parts: [] });
    const [form, setForm] = useState({ ...EMPTY });
    const [editing, setEditing] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const load = useCallback(async () => {
        try {
            const [items, pending] = await Promise.all([api.get('/quotes/admin/catalog'), api.get('/quotes/admin/alerts')]);
            setCatalog(items.data); setAlerts(pending.data); setError('');
        } catch (err) { setError(requestError(err, 'Não foi possível carregar os orçamentos.')); }
    }, []);
    useEffect(() => { load(); }, [load, inventory]);
    const save = async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setMessage(''); setError('');
        const data = { ...form, inventory_item_id: form.inventory_item_id ? Number(form.inventory_item_id) : null };
        try {
            if (editing) await api.put(`/quotes/admin/catalog/${editing}`, data);
            else await api.post('/quotes/admin/catalog', data);
            setEditing(null); setForm({ ...EMPTY }); setMessage('Serviço salvo. As pendências foram conferidas novamente.'); await load();
        } catch (err) { setError(requestError(err, 'Não foi possível salvar o serviço.')); }
        finally { setBusy(false); }
    };
    return <section id="orcamentos" className="scroll-mt-28 my-8 p-5 md:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-5">
        <h2 className="font-bold text-2xl">Orçamentos e pendências da Cidi</h2>
        <p>Cadastre o modelo completo, o serviço, a peça compatível e a mão de obra. A Cidi soma o preço de venda da peça à mão de obra. Ela não usa o custo de compra nem escolhe peças pela semelhança do nome.</p>
        <button className="chat-choice" type="button" onClick={load}>Atualizar pendências</button>
        {error && <p role="alert" className="text-red-600 dark:text-red-300">{error}</p>}
        {message && <p role="status" className="text-emerald-700 dark:text-emerald-300">{message}</p>}
        <div className="space-y-3" aria-label="Pendências de orçamento">
            {alerts.alerts.length === 0 && alerts.unpriced_parts.length === 0 && !error && <p>Nenhuma pendência encontrada.</p>}
            {alerts.alerts.map(item => <div key={`${item.model}-${item.service}`} className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900">
                <strong>{item.model} · {item.service_label}</strong>
                <p>{item.reasons.join(' · ')}</p>
                <p className="text-sm">{item.source === 'customer' ? 'Solicitado em consulta de cliente. Corrigir o cadastro resolve a pendência.' : 'Detectado no catálogo de serviços.'}</p>
                <button type="button" className="chat-choice mt-2" onClick={() => {
                    const found = catalog.find(i => i.model === item.model && i.service === item.service);
                    setEditing(found?.id || null); setForm(found ? { ...found, inventory_item_id: found.inventory_item_id || '' } : { ...EMPTY, model: item.model, service: item.service });
                    document.getElementById('quote-catalog-model')?.focus();
                }}>Completar cadastro</button>
            </div>)}
            {alerts.unpriced_parts.map(item => <div key={item.id} className="flex flex-wrap gap-3 justify-between p-3 rounded-xl border border-amber-300 dark:border-amber-800"><span>Peça sem preço de venda: <strong>{item.name}</strong> · {item.model}</span><button className="chat-choice" type="button" onClick={() => { const part = inventory.find(i => i.id === item.id); if (part) onEditPart(part); }}>Editar preço da peça</button></div>)}
        </div>
        <form onSubmit={save} className="grid md:grid-cols-2 gap-4 border-t border-slate-200 dark:border-slate-700 pt-5">
            <h3 className="font-bold text-lg md:col-span-2">{editing ? 'Editar serviço' : 'Cadastrar serviço para orçamento'}</h3>
            <label>Modelo completo<input id="quote-catalog-model" required minLength={2} maxLength={100} disabled={busy} className={quoteControl} value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} placeholder="Samsung Galaxy S23 Ultra" /></label>
            <label>Serviço<select className={quoteControl} disabled={busy} value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>{Object.entries(REPAIR_SERVICES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <label>Peça compatível do estoque<select className={quoteControl} disabled={busy} value={form.inventory_item_id || ''} onChange={e => setForm({ ...form, inventory_item_id: e.target.value })}><option value="">Sem peça vinculada (gerar pendência)</option>{inventory.map(item => <option key={item.id} value={item.id}>{item.nome} · {item.modelo_compativel} · {quoteMoney(item.preco_venda || 0)}</option>)}</select></label>
            <div><label htmlFor="quote-labor">Mão de obra (R$)</label><MoneyInput id="quote-labor" value={form.labor_price} onChange={value => setForm({ ...form, labor_price: value })} /><p className="text-sm">Vazio = pendente. Zero = mão de obra sem cobrança.</p></div>
            <label className="flex items-center gap-3"><input type="checkbox" disabled={busy} checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />Disponível para consultas da Cidi</label>
            <div className="flex gap-2"><button type="submit" disabled={busy} className="chat-choice">{busy ? 'Salvando…' : 'Salvar serviço'}</button>{editing && <button type="button" disabled={busy} className="chat-choice" onClick={() => { setEditing(null); setForm({ ...EMPTY }); }}>Cancelar edição</button>}</div>
        </form>
        <div className="space-y-2" aria-label="Catálogo de orçamentos">{catalog.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3"><span><strong>{item.model}</strong> · {REPAIR_SERVICES[item.service]} · Mão de obra: {item.labor_price === '' ? 'pendente' : quoteMoney(item.labor_price)}{!item.active && ' · Inativo'}</span><button type="button" className="chat-choice" onClick={() => { setEditing(item.id); setForm({ ...item, inventory_item_id: item.inventory_item_id || '' }); }}>Editar serviço</button></div>)}</div>
    </section>;
}
