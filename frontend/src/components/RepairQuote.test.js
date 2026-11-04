import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RepairQuote from './RepairQuote';
import api from '../pages/api';

jest.mock('../pages/api', () => ({ post: jest.fn() }));
beforeEach(() => jest.clearAllMocks());
function consult() {
    fireEvent.change(screen.getByLabelText('Serviço para orçamento'), { target: { value: 'tela' } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar peça + mão de obra' }));
}

test('mostra soma do servidor e não cria pedido ou reserva estoque ao consultar', async () => {
    const visit = jest.fn();
    api.post.mockResolvedValue({ data: { status: 'estimated', model: 'Samsung Galaxy S23', service_label: 'Troca de tela', part_name: 'Display OLED', part_price: '250.10', labor_price: '80.50', total: '330.60', disclaimer: 'Sujeita à avaliação técnica.' } });
    render(<RepairQuote model="S23" problem="A tela apagou" onVisit={visit} />);
    consult();
    const result = await screen.findByRole('status');
    expect(result).toHaveTextContent('330,60');
    expect(result).toHaveTextContent('250,10');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/quotes/estimate', { model: 'S23', service: 'tela' });
    expect(visit).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Modelo para orçamento'), { target: { value: 'S23 Ultra' } });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('pendência não mostra total parcial e informa que o administrador foi avisado', async () => {
    api.post.mockResolvedValue({ data: { status: 'pending', model: 'S23', team_notified: true } });
    render(<RepairQuote model="S23" onVisit={jest.fn()} />);
    consult();
    expect(await screen.findByRole('status')).toHaveTextContent('pendência já apareceu para o administrador');
    expect(screen.queryByText(/Estimativa:/)).not.toBeInTheDocument();
});

test('ambiguidade exige escolher e consultar novamente antes de combinar visita', async () => {
    api.post.mockResolvedValue({ data: { status: 'ambiguous', options: ['Samsung A15', 'Motorola A15'] } });
    render(<RepairQuote model="A15" onVisit={jest.fn()} />);
    consult();
    fireEvent.click(await screen.findByRole('button', { name: 'Samsung A15' }));
    expect(screen.getByLabelText('Modelo para orçamento')).toHaveValue('Samsung A15');
    expect(screen.queryByRole('button', { name: 'Combinar visita para avaliação' })).not.toBeInTheDocument();
});
