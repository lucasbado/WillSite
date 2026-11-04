export function statusStage(status) {
    const value = String(status || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    if (['concluido', 'entregue', 'finalizado'].includes(value)) return 4;
    if (['pronto para retirada', 'liberado'].includes(value)) return 3;
    if (['em manutencao', 'agendado'].includes(value)) return 2;
    return 1;
}

export function orderMatches(order, search) {
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const term = normalize(search).trim();
    const text = [order.id, order.cliente, order.modelo, order.telefone].map(normalize).join(' ');
    const phone = String(order.telefone || '').replace(/\D/g, '');
    const digits = term.replace(/\D/g, '');
    return !term || text.includes(term) || (digits.length >= 3 && /^[\d\s()+.-]+$/.test(term) && phone.includes(digits));
}

export function isOverdue(order, now = Date.now()) {
    if (statusStage(order.status) >= 3 || !order.scheduled_for) return false;
    const deadline = new Date(order.scheduled_for).getTime();
    return Number.isFinite(deadline) && deadline < now;
}

export function matchesAdminFilter(order, filter, now = Date.now()) {
    const stage = statusStage(order.status);
    return filter === 'todos' || (filter === 'pendentes' && stage === 1) ||
        (filter === 'manutencao' && stage === 2) || (filter === 'prontos' && stage === 3) ||
        (filter === 'atrasados' && isOverdue(order, now));
}
