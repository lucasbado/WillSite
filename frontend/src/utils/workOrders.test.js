import { statusStage, orderMatches, isOverdue, matchesAdminFilter } from './workOrders';

test.each([['Pendente', 1], ['Em Manutenção', 2], ['Pronto para Retirada', 3], ['Concluído', 4], ['Entregue', 4]])(
    'distingue a etapa %s', (status, stage) => expect(statusStage(status)).toBe(stage));

test('busca nome sem acento e telefone com ou sem máscara', () => {
    const order = { id: 20, cliente: 'João Silva', modelo: 'Galaxy S23', telefone: '(11) 99999-1234' };
    for (const term of ['joao', '20', 's23', '11999991234', '(11) 99999', '99999-1234']) expect(orderMatches(order, term)).toBe(true);
    expect(orderMatches(order, 'Outro cliente')).toBe(false);
});

test('atraso usa o agendamento real e exclui aparelhos prontos e entregues', () => {
    const now = new Date('2026-11-04T15:00:00-03:00').getTime();
    const order = { status: 'Em Manutenção', scheduled_for: '2026-11-04T14:00:00-03:00' };
    expect(isOverdue(order, now)).toBe(true);
    expect(matchesAdminFilter(order, 'atrasados', now)).toBe(true);
    expect(matchesAdminFilter(order, 'manutencao', now)).toBe(true);
    expect(matchesAdminFilter(order, 'prontos', now)).toBe(false);
    expect(isOverdue({ ...order, status: 'Pronto para Retirada' }, now)).toBe(false);
    expect(isOverdue({ ...order, scheduled_for: null }, now)).toBe(false);
});
