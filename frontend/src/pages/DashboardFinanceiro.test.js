import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardFinanceiro from './DashboardFinanceiro';
import api from './api';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('./api', () => ({ get: jest.fn() }));

test('mostra indicadores retornados pela API sem números e fornecedor demonstrativos', async () => {
    const stats = { patrimonioTotal: 0, receitaTotal: 155, lucroPotencial: 0, custosOperacionais: 10,
        valorDesperdicio: 0, pecasQuebradas: 0, volumeConsertos: 2, skusAtivos: 3, taxaSucesso: 100,
        porMarca: [], perdasPorMotivo: [], rankingPerdas: [], ticketMedio: 77.50, maiorMargemServico: 95, markupEstoque: null };
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/os/admin/financeiro/stats' ? stats : [] }));
    render(<DashboardFinanceiro />);
    expect(await screen.findByText(/77,50/)).toBeInTheDocument();
    expect(screen.getByText(/3 SKUs ativos/)).toBeInTheDocument();
    expect(screen.queryByText('R$ 480,00')).not.toBeInTheDocument();
    expect(screen.queryByText(/TechParts/)).not.toBeInTheDocument();
    expect(screen.getByText(/2 serviços entregues/)).toBeInTheDocument();
});
