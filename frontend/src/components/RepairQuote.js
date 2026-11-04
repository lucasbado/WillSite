import React, { useEffect, useRef, useState } from 'react';
import api from '../pages/api';
import { requestError } from '../utils/requestError';

export const REPAIR_SERVICES = { tela: 'Troca de tela', bateria: 'Troca de bateria', conector: 'Troca do conector de carga', tampa: 'Troca da tampa traseira' };
export const quoteMoney = value => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const quoteControl = 'w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-950 p-3 text-base text-slate-900 dark:text-slate-100';

export default function RepairQuote({ model, problem, onVisit }) {
    const [device, setDevice] = useState(model || '');
    const [service, setService] = useState('');
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const answer = useRef(null);
    useEffect(() => { if (result) answer.current?.scrollIntoView?.({ block: 'nearest' }); }, [result]);
    const change = action => { action(); setResult(null); setError(''); };
    const consult = async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError(''); setResult(null);
        try { setResult((await api.post('/quotes/estimate', { model: device.trim(), service })).data); }
        catch (err) { setError(requestError(err, 'Não foi possível consultar o orçamento. Tente novamente.')); }
        finally { setBusy(false); }
    };
    return <section aria-label="Estimativa de orçamento" className="space-y-4 rounded-2xl border border-blue-300 dark:border-blue-800 p-4 text-slate-800 dark:text-slate-100">
        <h3 className="text-lg font-bold">Vamos consultar o orçamento</h3>
        <p className="text-sm leading-relaxed">Confirme o modelo completo e o serviço que deseja consultar. Sintomas parecidos podem ter causas diferentes; o diagnóstico depende da avaliação.</p>
        <form onSubmit={consult} className="space-y-3">
            <label className="block text-sm font-bold">Modelo para orçamento<input required minLength={2} maxLength={100} value={device} disabled={busy} onChange={e => change(() => setDevice(e.target.value))} placeholder="Ex.: Samsung Galaxy S23 (sem Plus/Ultra)" className={quoteControl} /></label>
            <label className="block text-sm font-bold">Serviço para orçamento<select required value={service} disabled={busy} onChange={e => change(() => setService(e.target.value))} className={quoteControl}><option value="">Escolha o serviço</option>{Object.entries(REPAIR_SERVICES).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
            <button type="submit" disabled={busy} className="chat-choice">{busy ? 'Consultando preços…' : 'Consultar peça + mão de obra'}</button>
        </form>
        {error && <p role="alert">{error}</p>}
        {result && <div ref={answer} role="status" className="space-y-3 text-base leading-relaxed">
            {result.status === 'estimated' ? <>
                <p className="font-bold">{result.model} · {result.service_label}</p>
                <p>Peça: {result.part_name} — {quoteMoney(result.part_price)}<br />Mão de obra: {quoteMoney(result.labor_price)}</p>
                <p className="font-bold text-xl">Estimativa: {quoteMoney(result.total)}</p>
                <p className="text-sm">{result.disclaimer}</p>
            </> : result.status === 'ambiguous' ? <>
                <p>Encontrei mais de uma versão. Escolha o modelo exato e consulte novamente:</p>
                {result.options.map(option => <button key={option} type="button" className="chat-choice" onClick={() => change(() => setDevice(option))}>{option}</button>)}
            </> : <p>A equipe precisa conferir a peça, a disponibilidade ou completar o preço desse serviço antes de passar um valor.{result.team_notified ? ' A pendência já apareceu para o administrador.' : ' Entre na sua conta e consulte novamente para registrar essa demanda com a equipe.'}</p>}
            {result.status !== 'ambiguous' && <button type="button" className="chat-choice" onClick={() => onVisit(result.model, problem || `Gostaria de avaliar o aparelho e consultar ${REPAIR_SERVICES[service].toLowerCase()}.`)}>Combinar visita para avaliação</button>}
        </div>}
    </section>;
}
