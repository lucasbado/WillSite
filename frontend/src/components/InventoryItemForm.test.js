import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InventoryItemForm from './InventoryItemForm';

const setup = props => render(<InventoryItemForm models={['Samsung Galaxy S23']} onSave={jest.fn().mockResolvedValue({})} onClose={jest.fn()} {...props} />);
function fill() {
    fireEvent.click(screen.getByRole('button', { name: 'Bateria', exact: true }));
    fireEvent.change(screen.getByLabelText('Modelo compatível', { exact: true }), { target: { value: 'Samsung Galaxy S23' } });
    fireEvent.change(screen.getByLabelText('Quantidade em estoque'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Preço de venda (R$)'), { target: { value: '150,00' } });
}

test('monta nome com modelo novo e cadastra orçamento e peça no mesmo envio', async () => {
    const save = jest.fn().mockResolvedValue({}); const close = jest.fn(); setup({ onSave: save, onClose: close });
    fill();
    expect(screen.getByLabelText('Nome da peça')).toHaveValue('Bateria Samsung Galaxy S23');
    fireEvent.click(screen.getByRole('checkbox', { name: /Usar esta peça nos orçamentos/ }));
    fireEvent.change(screen.getByLabelText('Mão de obra (R$)'), { target: { value: '120,00' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar peça', exact: true }));
    await waitFor(() => expect(close).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Bateria Samsung Galaxy S23', preco_venda: '150,00', quote: { service: 'bateria', labor_price: '120,00' } }));
});

test('salvar e continuar mantém modelo e limpa quantidades, preço e vínculo para a próxima peça', async () => {
    const save = jest.fn().mockResolvedValue({}); const close = jest.fn(); setup({ onSave: save, onClose: close });
    fill(); fireEvent.click(screen.getByRole('button', { name: 'Salvar e cadastrar outra' }));
    await screen.findByRole('status');
    expect(screen.getByLabelText('Nome da peça')).toHaveValue('');
    expect(screen.getByLabelText('Quantidade em estoque')).toHaveValue(null);
    expect(screen.getByLabelText('Preço de venda (R$)')).toHaveValue('');
    expect(screen.getByLabelText('Modelo compatível', { exact: true })).toHaveValue('Samsung Galaxy S23');
    expect(screen.getByRole('checkbox', { name: /Usar esta peça nos orçamentos/ })).not.toBeChecked();
    expect(close).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Nome da peça')).toHaveFocus();
});

test('falha preserva os dados e bloqueia duplo envio enquanto aguarda resposta', async () => {
    let reject; const save = jest.fn(() => new Promise((resolve, fail) => { reject = fail; }));
    setup({ onSave: save }); fill();
    const button = screen.getByRole('button', { name: 'Salvar peça', exact: true });
    fireEvent.click(button); fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
    reject({ response: { status: 409, data: { msg: 'Orçamento já existe.' } } });
    expect(await screen.findByRole('alert')).toHaveTextContent('Orçamento já existe.');
    expect(screen.getByLabelText('Nome da peça')).toHaveValue('Bateria Samsung Galaxy S23');
    expect(screen.getByLabelText('Preço de venda (R$)')).toHaveValue('150,00');
});
