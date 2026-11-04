import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import GestaoEstoque from './GestaoEstoque';
import api from './api';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('./api', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn() }));
jest.mock('../utils/notifications', () => ({ success: jest.fn() }));
jest.mock('../components/QuoteCatalog', () => () => <div>Catálogo de orçamentos</div>);

const part = { id: 7, nome: 'Bateria S23', modelo_compativel: 'Samsung Galaxy S23', categoria: 'Hardware',
    quantidade: 5, preco_venda: 150, preco_custo: 80, minimo: 0, descricao: '' };

beforeEach(() => {
    jest.clearAllMocks();
    api.get.mockImplementation(url => Promise.resolve({ data: url === '/estoque/' ? [part] : [] }));
    api.post.mockResolvedValue({}); api.patch.mockResolvedValue({});
});

test('duplicação reaproveita dados mas exige quantidade e cria um novo item', async () => {
    render(<GestaoEstoque />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Duplicar Bateria S23' }))[0]);
    expect(screen.getByLabelText('Nome da peça')).toHaveValue('Bateria S23 (cópia)');
    expect(screen.getByLabelText('Quantidade em estoque')).toHaveValue(null);
    expect(screen.getByLabelText('Preço de venda (R$)')).toHaveValue('150');
    fireEvent.change(screen.getByLabelText('Quantidade em estoque'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar peça', exact: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/estoque/adicionar', expect.objectContaining({ quantidade: '2', preco_venda: 150 }));
    expect(api.patch).not.toHaveBeenCalled();
});

test('edição mantém estoque mínimo zero e atualiza o item existente', async () => {
    render(<GestaoEstoque />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Editar Bateria S23' }))[0]);
    expect(screen.getByLabelText('Avisar quando chegar a')).toHaveValue(0);
    fireEvent.change(screen.getByLabelText('Preço de venda (R$)'), { target: { value: '160,50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(api.patch).toHaveBeenCalledWith('/estoque/editar/7', expect.objectContaining({ minimo: 0, quantidade: 5, preco_venda: '160,50' }));
    expect(api.post).not.toHaveBeenCalled();
});

test('primeiro cadastro fica disponível mesmo com estoque e modelos vazios', async () => {
    api.get.mockResolvedValue({ data: [] });
    await act(async () => { render(<GestaoEstoque />); });
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar peça' }));
    expect(screen.getByRole('dialog', { name: 'Cadastrar peça' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tela', exact: true }));
    fireEvent.change(screen.getByLabelText('Modelo compatível', { exact: true }), { target: { value: 'Motorola Moto G34' } });
    expect(screen.getByLabelText('Nome da peça')).toHaveValue('Tela Motorola Moto G34');
});
