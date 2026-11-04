export const EMPTY_INTAKE = { modelo: '', problema: '', data_entrega: '' };
const DRAFT_KEY = 'cidinho_intake_draft';

export function newIntakeId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function localDateTime(date = new Date()) {
    // Os agendamentos da loja são interpretados no fuso de São Paulo.
    const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
    const read = type => parts.find(part => part.type === type).value;
    return `${read('year')}-${read('month')}-${read('day')}T${read('hour')}:${read('minute')}`;
}

export function intakeError(draft) {
    if (draft.modelo.trim().length < 2) return 'Conte qual é o modelo do aparelho.';
    if (draft.problema.trim().length < 5) return 'Descreva em poucas palavras o que acontece com o aparelho.';
    const date = Date.parse(`${draft.data_entrega}:00-03:00`);
    if (!Number.isFinite(date) || date <= Date.now() || date > Date.now() + 90 * 86400000) return 'Escolha dia e horário futuros, nos próximos 90 dias, no horário de Brasília.';
    return '';
}

export function saveIntake(draft, requestId) {
    try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, requestId, expires: Date.now() + 30 * 60000 })); } catch { /* A conversa permanece disponível nesta tela. */ }
}

export function restoreIntake() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(DRAFT_KEY));
        if (saved?.expires > Date.now() && typeof saved.requestId === 'string' &&
            Object.keys(EMPTY_INTAKE).every(key => typeof saved.draft?.[key] === 'string')) return saved;
        clearIntake();
    } catch { clearIntake(); }
    return null;
}

export function clearIntake() { sessionStorage.removeItem(DRAFT_KEY); }

export function faqAnswer(message) {
    const text = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (/retira|buscar|ficou pronto|aviso|avisad/.test(text)) return 'Quando o reparo ficar pronto, você poderá ver o aviso e o laudo no seu painel. A equipe prepara a notificação por e-mail ou WhatsApp conforme os canais disponíveis. O dia de retirada é combinado com a assistência; o chatbot não define a data do reparo.';
    if (/preco|valor|orcamento|quanto custa/.test(text)) return 'Toque em “Ver estimativa de orçamento” para consultar o serviço para seu aparelho. A equipe pode precisar conferir a peça e a disponibilidade antes de passar um valor. O valor final depende da avaliação técnica.';
    if (/garantia|prazo|demora/.test(text)) return 'O prazo e as condições do serviço dependem da avaliação da equipe. Posso ajudar a solicitar uma visita para deixar o aparelho.';
    if (/prepar|backup|senha|levar comigo/.test(text)) return 'Se possível, faça backup dos seus dados antes de levar o aparelho. Anote o que acontece e quando começou. Não envie senhas ou código de desbloqueio por aqui; detalhes de acesso devem ser tratados diretamente com a equipe.';
    if (/funciona|procedimento|etapas|atendimento/.test(text)) return 'Primeiro você solicita um horário para deixar o aparelho. A equipe confirma a visita e faz a avaliação técnica. O orçamento e o prazo são combinados com você. Depois, acompanhe o reparo e a retirada pelo painel.';
    if (/humano|pessoa|atendente/.test(text)) return 'Sou uma assistente virtual. Posso registrar seu relato e a preferência de visita para a equipe. Para atendimento humano imediato, procure os canais de contato da assistência.';
    return '';
}
