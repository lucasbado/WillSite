import React, { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MoneyInput from './MoneyInput';
import { moneyValue } from '../utils/money';

function Example() {
    const [value, setValue] = useState('');
    return <><label htmlFor="test-money">Valor</label><MoneyInput id="test-money" value={value} onChange={setValue} /><output>{moneyValue(value)}</output></>;
}

test('aceita vírgula e ponto, preserva centavos e não tem setas de input numérico', () => {
    render(<Example />);
    const input = screen.getByLabelText('Valor');
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    fireEvent.change(input, { target: { value: '0,01' } });
    expect(screen.getByRole('status')).toHaveTextContent('0.01');
    fireEvent.change(input, { target: { value: '150.50' } });
    expect(input).toHaveValue('150,50');
    fireEvent.change(input, { target: { value: '-15' } });
    expect(input).toHaveValue('150,50');
    fireEvent.change(input, { target: { value: '12,345' } });
    expect(input).toHaveValue('150,50');
    fireEvent.change(input, { target: { value: '12' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('12,00');
});
