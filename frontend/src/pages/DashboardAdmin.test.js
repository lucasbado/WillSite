import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardAdmin from './DashboardAdmin';
import api from './api';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn(), useLocation: () => ({ pathname: '/admin/dashboard' }) }), { virtual: true });
jest.mock('html2pdf.js', () => jest.fn());
jest.mock('./api', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
jest.mock('../utils/notifications', () => ({ success: jest.fn(), error: jest.fn(), confirm: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); localStorage.clear(); });

test('finalização envia centavos corretos e oferece o aviso de WhatsApp retornado pelo servidor', async () => {
    const order = { id: 9, cliente: 'Teste', modelo: 'Galaxy A15', problema: 'Não carrega', status: 'Em Manutenção' };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/os/admin/listar' ? [order] : url === '/os/admin/escala-mensal' ? {} : [] }));
    api.patch.mockResolvedValue({ data: { whatsapp_link: 'https://wa.me/5511999999999', os_atualizada: { status: 'Pronto para Retirada' } } });
    render(<DashboardAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: 'Abrir OS 9' }));
    fireEvent.click(screen.getByRole('button', { name: /PRONTO \/ FATURAR/ }));
    fireEvent.change(await screen.findByLabelText('Laudo Final de Reparo'), { target: { value: 'Conector substituído e carregamento testado.' } });
    fireEvent.change(screen.getByLabelText('Valor Mão de Obra (R$)'), { target: { value: '150,01' } });
    fireEvent.click(screen.getByRole('button', { name: 'FINALIZAR REPARO & NOTIFICAR' }));
    await screen.findByRole('button', { name: 'Enviar p/ WhatsApp' });
    expect(api.patch).toHaveBeenCalledWith('/os/admin/concluir-total/9', expect.objectContaining({ valor_mao_obra: 150.01 }));
    expect(screen.queryByText(/PDF foi anexado/)).not.toBeInTheDocument();
});

test('o cartão móvel abre a retirada e confirma pela rota de entrega', async () => {
    const order = { id: 8, cliente: 'Cliente Teste', modelo: 'iPhone 13', status: 'Pronto para Retirada',
        verification_code: '0123', code_expires_at: new Date(Date.now() + 1800000).toISOString() };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/os/admin/listar' ? [order] : url === '/os/admin/escala-mensal' ? {} : [] }));
    api.post.mockResolvedValue({ data: { msg: 'Entrega confirmada' } });
    render(<DashboardAdmin />);
    const card = await screen.findByRole('button', { name: 'Abrir OS 8' });
    fireEvent.click(card);
    expect(await screen.findByRole('heading', { name: 'Protocolo de Saída' })).toBeInTheDocument();
    // Aguarda o carregamento inicial, que bloqueia o botão por um breve período.
    fireEvent.change(screen.getByRole('textbox', { name: 'Código de retirada' }), { target: { value: '0123' } });
    const deliver = screen.getByRole('button', { name: 'AUTORIZAR ENTREGA' });
    await waitFor(() => expect(deliver).toBeEnabled());
    fireEvent.click(deliver);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/os/8/entregar', { codigo_digitado: '0123', is_bypass: false }));
    expect(api.patch).not.toHaveBeenCalled();
});

test('filtra por status e telefone e mantém a busca ao fechar uma OS', async () => {
    const ready = { id: 8, cliente: 'João Teste', modelo: 'iPhone 13', status: 'Pronto para Retirada', telefone: '(11) 99999-1234',
        verification_code: '0123', code_expires_at: new Date(Date.now() + 1800000).toISOString() };
    const pending = { id: 9, cliente: 'Outro Cliente', modelo: 'Galaxy S23', status: 'Pendente' };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/os/admin/listar' ? [ready, pending] : url === '/os/admin/escala-mensal' ? {} : [] }));
    render(<DashboardAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: 'Prontos (1)' }));
    expect(screen.queryAllByText('Outro Cliente')).toHaveLength(0);
    fireEvent.change(screen.getByRole('textbox', { name: 'Buscar ordens de serviço' }), { target: { value: '11999991234' } });
    fireEvent.click(screen.getByRole('button', { name: 'Abrir OS 8' }));
    expect(await screen.findByRole('heading', { name: 'Protocolo de Saída' })).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('heading', { name: 'Protocolo de Saída' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Buscar ordens de serviço' })).toHaveValue('11999991234');
    expect(screen.getByRole('button', { name: 'Prontos (1)' })).toHaveAttribute('aria-pressed', 'true');
    expect(sessionStorage.getItem('admin_order_filter')).toBe('prontos');
});
