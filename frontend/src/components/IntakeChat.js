import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, X, Send, ArrowLeft, CheckCircle2 } from 'lucide-react';
import api from '../pages/api';
import RepairQuote from './RepairQuote';
import { requestError } from '../utils/requestError';
import { clearIntake, EMPTY_INTAKE, faqAnswer, intakeError, localDateTime, newIntakeId, restoreIntake, saveIntake } from '../utils/intake';

const WELCOME = 'Olá! Sou a Cidi, assistente virtual da Cidinho. Posso ajudar com uma estimativa de orçamento, explicar o atendimento e combinar sua ida à loja. Escolha como prefere conversar para começar.';
const PROMPTS = { model: 'Qual é a marca e o modelo do aparelho? Se não souber, escreva o que aparece na caixa ou no aparelho.', problem: 'O que acontece com ele? Pode explicar com suas palavras.', date: 'Em qual dia e horário você prefere deixar o aparelho? Escolha abaixo. A equipe ainda vai confirmar a disponibilidade.' };
const control = 'w-full border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-3 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-base outline-none focus:ring-2 focus:ring-blue-500';

export default function IntakeChat() {
    const navigate = useNavigate();
    const [saved] = useState(restoreIntake);
    const [open, setOpen] = useState(Boolean(saved));
    const [draft, setDraft] = useState(saved?.draft || { ...EMPTY_INTAKE });
    const [messages, setMessages] = useState([{ role: 'assistant', content: saved ? 'Seus dados estão aqui. Confira o resumo e confirme o envio quando estiver pronto.' : WELCOME }]);
    const [step, setStep] = useState(saved ? 'review' : 'menu');
    const [text, setText] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [available, setAvailable] = useState(false);
    const [mode, setMode] = useState(saved ? 'guided' : 'choose');
    const [configLoaded, setConfigLoaded] = useState(false);
    const [quoteReturn, setQuoteReturn] = useState('menu');
    const [consent, setConsent] = useState(false);
    const [showConsent, setShowConsent] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [receipt, setReceipt] = useState(null);
    const requestId = useRef(saved?.requestId || newIntakeId());
    const pending = useRef(false);
    const quoteRequested = useRef(false);
    const launcher = useRef(null);
    const panel = useRef(null);
    const scroller = useRef(null);
    const heading = useRef(null);

    useEffect(() => {
        if (!open) return;
        let active = true;
        api.get('/assistant/config', { timeout: 5000 }).then(res => { if (active) setAvailable(Boolean(res.data.ai_available)); }).catch(() => {}).finally(() => { if (active) setConfigLoaded(true); });
        heading.current?.focus();
        return () => { active = false; };
    }, [open]);
    useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight; }, [messages, step, busy, showConsent]);
    useEffect(() => {
        if (!open) return;
        const keydown = event => {
            if (event.key === 'Escape') { setOpen(false); launcher.current?.focus(); }
            if (event.key === 'Tab') {
                const targets = [...panel.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), a[href]')];
                const first = targets[0], last = targets[targets.length - 1];
                if (event.shiftKey && (document.activeElement === first || document.activeElement === heading.current)) { event.preventDefault(); last?.focus(); }
                else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }
        };
        document.addEventListener('keydown', keydown);
        return () => document.removeEventListener('keydown', keydown);
    }, [open]);

    const say = content => setMessages(previous => [...previous.slice(-23), { role: 'assistant', content }]);
    const close = () => { setOpen(false); launcher.current?.focus(); };
    const startVisit = () => {
        if (pending.current) return;
        const next = nextStep(draft);
        setAgreed(false); setStep(next); setError(''); say(PROMPTS[next] || 'Confira seu pedido antes de enviar.');
    };
    const nextStep = data => !data.modelo ? 'model' : !data.problema ? 'problem' : !data.data_entrega ? 'date' : 'review';

    const send = async event => {
        event.preventDefault();
        const content = text.trim();
        if (!content || pending.current || mode === 'choose') return;
        setText(''); setError('');
        const history = [...messages, { role: 'user', content }];
        setMessages(history.slice(-24));
        if (mode === 'ai' && consent) {
            if (/or[çc]amento|pre[çc]o|\bvalor\b|quanto.*(?:custa|fica|sai)/i.test(content)) quoteRequested.current = true;
            pending.current = true; setBusy(true);
            try {
                const res = await api.post('/assistant/message', { consent: true,
                    messages: history.slice(-12), draft }, { timeout: 23000 });
                if (res.data.mode === 'ai') {
                    const data = { modelo: res.data.modelo, problema: res.data.problema, data_entrega: res.data.data_entrega };
                    setDraft(data);
                    const ready = nextStep(data) === 'review';
                    if (quoteRequested.current && data.modelo) {
                        quoteRequested.current = false; setQuoteReturn('menu'); setStep('quote');
                        say('Vamos conferir o orçamento antes de combinar uma visita. Já aproveitei o modelo informado; confirme a versão e escolha o serviço abaixo.');
                    } else {
                        say(ready ? 'Anotei o aparelho, o relato e sua preferência de visita. Confira o resumo abaixo e corrija o que precisar antes de enviar. A equipe ainda vai confirmar o horário.' : res.data.reply);
                        if (ready) setStep('review');
                    }
                } else {
                    const next = nextStep(draft);
                    setMode('guided'); setStep(next);
                    say('A conversa com IA está indisponível agora. Continuamos por etapas, com os dados já preenchidos. ' + (PROMPTS[next] || 'Confira o resumo abaixo.'));
                    setText(content); // A mensagem que falhou fica disponível para reenviar no modo guiado.
                }
            } catch {
                const next = nextStep(draft);
                setMode('guided'); setStep(next); setText(content);
                say('A conexão com a IA falhou. Vamos continuar por etapas. ' + (PROMPTS[next] || 'Confira o resumo abaixo.'));
            } finally { pending.current = false; setBusy(false); }
            return;
        }
        const isQuestion = /^(como|quando|quanto|qual|quero saber|posso|me explica|preciso de ajuda)\b/i.test(content);
        const answer = step === 'menu' || isQuestion ? faqAnswer(content) : '';
        if (answer) { say(answer + (PROMPTS[step] ? '\n\n' + PROMPTS[step] : '')); return; }
        if (step === 'model') {
            if (content.length < 2 || content.length > 100) { say('Escreva a marca e o modelo em até 100 caracteres.'); return; }
            setDraft({ ...draft, modelo: content }); setStep('problem'); say(PROMPTS.problem);
        } else if (step === 'problem') {
            if (content.length < 5) { say('Pode contar um pouco mais sobre o que acontece?'); return; }
            setDraft({ ...draft, problema: content }); setStep('date'); say(PROMPTS.date);
        } else if (step === 'date') {
            say('Use o campo de dia e horário abaixo para escolher sua preferência.');
        } else if (/^(oi|ola|bom dia|boa tarde|boa noite|obrigad[oa])[!. ]*$/i.test(content)) {
            say('Estou aqui para ajudar. Toque em “Levar meu aparelho” para começar ou escolha uma dúvida.');
        } else {
            startVisit();
        }
    };

    const confirm = async event => {
        event.preventDefault();
        if (pending.current || receipt) return;
        const invalid = intakeError(draft);
        if (invalid) { setError(invalid); return; }
        if (!agreed) { setError('Confirme que o horário depende da disponibilidade da equipe.'); return; }
        if (!sessionStorage.getItem('token')) {
            saveIntake(draft, requestId.current);
            navigate('/login', { state: { from: '/cliente/dashboard' } });
            return;
        }
        pending.current = true; setBusy(true); setError('');
        try {
            const res = await api.post('/os/abrir', { ...draft, intake_request_id: requestId.current });
            setReceipt(res.data.os_id); setStep('done'); clearIntake();
            say(`Solicitação #${res.data.os_id} recebida! A equipe ainda vai confirmar o horário da visita. Você pode acompanhar pelo seu painel.`);
            window.dispatchEvent(new Event('willsite:orders-updated'));
        } catch (err) { setError(requestError(err, 'Não foi possível enviar. Seus dados continuam aqui. Tente novamente.')); }
        finally { pending.current = false; setBusy(false); }
    };

    const reset = () => {
        if (pending.current) return;
        clearIntake(); requestId.current = newIntakeId(); quoteRequested.current = false; setDraft({ ...EMPTY_INTAKE }); setReceipt(null);
        setStep('menu'); setMode('choose'); setConsent(false); setMessages([{ role: 'assistant', content: WELCOME }]); setError(''); setText(''); setAgreed(false); setShowConsent(false);
    };

    return <div className="print:hidden">
        <button ref={launcher} type="button" aria-label="Abrir atendimento da Cidi" aria-expanded={open} onClick={() => setOpen(!open)}
            className="fixed z-[60] right-4 bottom-5 sm:right-6 sm:bottom-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full px-5 py-4 shadow-xl flex items-center gap-2 text-base font-bold min-h-14">
            <MessageCircle size={22} /> Precisa de ajuda?
        </button>
        {open && <div className="fixed inset-0 z-[90] bg-slate-950/30 sm:bg-slate-950/20 flex items-end justify-end p-2 sm:p-6" onClick={e => { if (e.target === e.currentTarget) close(); }}>
            <section ref={panel} role="dialog" aria-modal="true" aria-labelledby="cidi-title" className="pointer-events-auto w-full sm:w-[420px] h-[min(740px,calc(100dvh-16px))] sm:h-[min(740px,calc(100dvh-48px))] rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
                <header className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between shrink-0">
                    <div><h2 ref={heading} tabIndex={-1} id="cidi-title" className="text-xl font-bold outline-none">Cidi · Cidinho</h2><p className="text-sm text-slate-300">Assistente virtual • Primeiro atendimento</p></div>
                    <button type="button" aria-label="Fechar atendimento" onClick={close} className="p-3 rounded-full hover:bg-slate-800"><X size={22} /></button>
                </header>
                <div ref={scroller} className="flex-1 overflow-y-auto p-4 space-y-4 modern-scroll-v">
                    <div role="log" aria-label="Conversa com a Cidi" aria-live="polite" aria-relevant="additions" className="space-y-3">
                        {messages.map((item, index) => <p key={index} className={`max-w-[95%] px-4 py-3 rounded-2xl whitespace-pre-wrap break-words text-base leading-relaxed ${item.role === 'user' ? 'ml-auto bg-blue-600 text-white rounded-br-sm' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-bl-sm'}`}><span className="sr-only">{item.role === 'user' ? 'Você: ' : 'Cidi: '}</span>{item.content}</p>)}
                    </div>
                    {mode === 'choose' && step !== 'quote' && <div className="space-y-3">
                        <p className="font-bold text-slate-900 dark:text-white">Como você prefere ser atendido?</p>
                        {!configLoaded && <p role="status" className="text-sm text-slate-500">Conferindo a conversa com IA…</p>}
                        {available && <button type="button" onClick={() => setShowConsent(true)} className="w-full text-left rounded-2xl p-4 bg-blue-600 hover:bg-blue-700 text-white"><strong className="block text-lg">Conversar com a Cidi (IA)</strong><span>Conte o problema com suas palavras, como em uma conversa.</span></button>}
                        {configLoaded && !available && <p className="text-sm text-slate-600 dark:text-slate-300">A conversa com IA está indisponível. Você pode consultar orçamentos e continuar pelo formulário abaixo.</p>}
                        <button type="button" onClick={() => { setMode('guided'); setShowConsent(false); say('Vamos preencher por etapas. Escolha uma opção abaixo. Para marcar uma visita, toque em “Levar meu aparelho”.'); }} className="w-full text-left rounded-2xl p-4 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"><strong className="block text-lg">Preencher por etapas</strong><span>Uma pergunta de cada vez, sem conversa com IA.</span></button>
                    </div>}
                    {mode !== 'choose' && step !== 'done' && step !== 'quote' && <div className="flex flex-wrap gap-2">
                        <button type="button" disabled={busy} onClick={startVisit} className="chat-choice">Levar meu aparelho</button>
                        <button type="button" disabled={busy} onClick={() => say(faqAnswer('Como funciona?'))} className="chat-choice">Como funciona?</button>
                        <button type="button" disabled={busy} onClick={() => say(faqAnswer('Preparar aparelho'))} className="chat-choice">Como me preparar?</button>
                        <button type="button" disabled={busy} onClick={() => say(faqAnswer('Retirada'))} className="chat-choice">Quando posso buscar?</button>
                    </div>}
                    {step !== 'quote' && step !== 'done' && <button type="button" disabled={busy} onClick={() => { setQuoteReturn(step); setStep('quote'); setShowConsent(false); }} className="chat-choice">Ver estimativa de orçamento</button>}
                    {available && mode === 'guided' && step !== 'done' && <button type="button" disabled={busy} onClick={() => setShowConsent(!showConsent)} className="chat-choice">Mudar para conversa com IA</button>}
                    {showConsent && <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-xl space-y-3 text-sm text-slate-700 dark:text-slate-200">
                        <p>Para conversar livremente, suas mensagens serão enviadas ao Groq. Evite dados pessoais, senhas e códigos de acesso. Você pode continuar por etapas sem enviar mensagens à IA.</p>
                        <button type="button" onClick={() => { setConsent(true); setMode('ai'); setShowConsent(false); setStep('menu'); say(Object.values(draft).some(Boolean) ? PROMPTS[nextStep(draft)] || 'Podemos continuar com os dados já preenchidos. Confira seu pedido quando estiver pronto.' : 'Pode explicar do seu jeito. Qual aparelho você tem e o que está acontecendo?'); }} className="chat-choice">Concordo, conversar com IA</button>
                        <button type="button" onClick={() => { setMode('guided'); setShowConsent(false); }} className="chat-choice">Continuar por etapas</button>
                    </div>}
                    {step === 'quote' && <>
                        <RepairQuote model={draft.modelo} problem={draft.problema} onVisit={(model, problem) => {
                            const data = { ...draft, modelo: model, problema: problem };
                            setDraft(data); if (mode === 'choose') setMode('guided');
                            const next = nextStep(data); setStep(next); say(PROMPTS[next] || 'Confira seu pedido antes de enviar.');
                        }} />
                        <button type="button" className="chat-choice" onClick={() => setStep(quoteReturn)}>Voltar ao atendimento</button>
                    </>}
                    {step === 'date' && mode === 'guided' && <div className="space-y-3">
                        <label className="block font-bold text-sm dark:text-white" htmlFor="cidi-visit-date">Dia e horário preferidos (Brasília)</label>
                        <input id="cidi-visit-date" type="datetime-local" min={localDateTime()} max={localDateTime(new Date(Date.now() + 90 * 86400000))} className={control} value={draft.data_entrega} onChange={e => setDraft({ ...draft, data_entrega: e.target.value })} />
                        <button type="button" onClick={() => { const invalid = intakeError(draft); if (invalid) setError(invalid); else { setError(''); setStep('review'); say('Confira seu pedido antes de enviar. Você pode corrigir qualquer informação abaixo.'); } }} className="chat-choice">Revisar solicitação</button>
                    </div>}
                    {mode === 'ai' && !['review', 'done', 'quote'].includes(step) && <button type="button" disabled={busy} onClick={() => setStep('review')} className="chat-choice">Escolher dia e revisar meu pedido</button>}
                    {step === 'review' && <form onSubmit={confirm} className="space-y-4 p-4 border border-blue-200 dark:border-blue-900 rounded-2xl">
                        <h3 className="font-bold text-lg dark:text-white">Confira sua solicitação</h3>
                        <label className="block text-sm font-bold dark:text-slate-200">Aparelho<input required minLength={2} maxLength={100} className={control} value={draft.modelo} disabled={busy} onChange={e => setDraft({ ...draft, modelo: e.target.value })} /></label>
                        <label className="block text-sm font-bold dark:text-slate-200">O que está acontecendo?<textarea required minLength={5} maxLength={3000} className={control} value={draft.problema} disabled={busy} onChange={e => setDraft({ ...draft, problema: e.target.value })} /></label>
                        <label className="block text-sm font-bold dark:text-slate-200">Dia e horário preferidos (Brasília)<input required type="datetime-local" min={localDateTime()} max={localDateTime(new Date(Date.now() + 90 * 86400000))} className={control} value={draft.data_entrega} disabled={busy} onChange={e => setDraft({ ...draft, data_entrega: e.target.value })} /></label>
                        <label className="flex gap-3 items-start text-sm text-slate-700 dark:text-slate-200"><input type="checkbox" checked={agreed} disabled={busy} onChange={e => setAgreed(e.target.checked)} className="mt-1 w-5 h-5 shrink-0" />Entendi que a equipe vai confirmar o horário antes da visita.</label>
                        <button type="submit" disabled={busy} className="w-full bg-blue-600 text-white rounded-xl px-3 py-4 font-bold disabled:opacity-50">{busy ? 'Enviando solicitação…' : sessionStorage.getItem('token') ? 'Confirmar e enviar solicitação' : 'Entrar para enviar solicitação'}</button>
                    </form>}
                    {step === 'done' && <div className="space-y-3"><p className="text-emerald-700 dark:text-emerald-300 font-bold flex gap-2"><CheckCircle2 /> Solicitação #{receipt}</p><button type="button" className="chat-choice" onClick={() => { close(); navigate('/cliente/dashboard'); }}>Ver no meu painel</button></div>}
                    {busy && <p role="status" className="text-sm text-slate-500 dark:text-slate-300">{step === 'review' ? 'Registrando sua solicitação…' : 'Cidi está respondendo…'}</p>}
                    {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950 p-3 rounded-xl">{error}</p>}
                </div>
                <footer className="p-4 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-2">
                    {mode !== 'choose' && !['review', 'done', 'quote'].includes(step) && <form onSubmit={send} className="flex gap-2">
                        <input aria-label="Sua mensagem para a Cidi" maxLength={1500} value={text} disabled={busy} onChange={e => setText(e.target.value)} className={control} placeholder={mode === 'ai' ? 'Conte o problema com suas palavras…' : step === 'model' ? 'Marca e modelo do aparelho' : step === 'problem' ? 'Descreva o que acontece' : 'Pergunta sobre o atendimento'} />
                        <button type="submit" aria-label="Enviar mensagem" disabled={busy || !text.trim()} className="bg-blue-600 text-white p-3 rounded-xl disabled:opacity-40"><Send size={20} /></button>
                    </form>}
                    <div className="flex justify-between items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{mode === 'ai' ? 'Conversa com IA • Revise as informações' : mode === 'choose' ? 'Escolha acima para começar' : 'Formulário por etapas • Sem IA'}</span>
                        <button type="button" disabled={busy} onClick={reset} className="p-2 underline flex items-center gap-1"><ArrowLeft size={13} /> Recomeçar</button>
                    </div>
                </footer>
            </section>
        </div>}
    </div>;
}
