import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardCliente from './DashboardCliente';
import api from './api';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../components/DeliveryScanner', () => () => <div>Leitor de retirada</div>);
jest.mock('./api', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
jest.mock('../utils/notifications', () => ({ success: jest.fn(), error: jest.fn(), confirm: jest.fn() }));

const orders = [
    { id: 1, modelo: 'Aparelho em reparo', status: 'Em Manutenção', data_abertura: '04/11/2026' },
    { id: 2, modelo: 'Aparelho pronto', status: 'Pronto para Retirada', data_abertura: '04/11/2026' },
    { id: 3, modelo: 'Aparelho entregue', status: 'Concluído', data_abertura: '04/11/2026', data_finalizacao: '04/11/2026 15:00' },
];
beforeEach(() => { jest.clearAllMocks(); });

test('separa reparos ativos, retirada e histórico sem oferecer nova retirada de entregue', async () => {
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/os/meu-historico' ? orders : [] }));
    render(<DashboardCliente />);
    expect(await screen.findByRole('button', { name: 'Aguardando retirada (1)' })).toBeInTheDocument();
    expect(screen.getByText('Aparelho pronto')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aparelho entregue' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Histórico (1)' }));
    expect(screen.getByRole('heading', { name: 'Aparelho entregue' })).toBeInTheDocument();
    expect(screen.getByText('Entrega confirmada em 04/11/2026 15:00')).toBeInTheDocument();
    expect(screen.queryByText(/Retirada disponível/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Aparelho pronto' })).not.toBeInTheDocument();
});

test('uma falha de rede mostra nova tentativa e não um histórico vazio', async () => {
    let failed = true;
    api.get.mockImplementation(url => url === '/os/meu-historico' && failed ? Promise.reject({ code: 'ERR_NETWORK' }) : Promise.resolve({ data: url === '/os/meu-historico' ? orders : [] }));
    render(<DashboardCliente />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão com o servidor');
    expect(screen.queryByText('Você não possui reparos em andamento.')).not.toBeInTheDocument();
    failed = false;
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(screen.getByText('Aparelho pronto')).toBeInTheDocument();
});
