import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import RepairReportAssistant from './RepairReportAssistant';

test('laudo inclui somente ações e testes confirmados e preserva texto existente', () => {
    const onApply = jest.fn();
    render(<RepairReportAssistant problem="Tela não responde" parts={['Tela Galaxy A15']} value="Texto já escrito" onApply={onApply} />);
    fireEvent.click(screen.getByRole('button', { name: 'Assistente de laudo' }));
    const apply = screen.getByRole('button', { name: 'Acrescentar ao laudo existente' });
    expect(apply).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Diagnóstico encontrado'), { target: { value: 'Falha no touch' } });
    fireEvent.change(screen.getByLabelText('Procedimentos realizados'), { target: { value: 'Substituição do conjunto frontal' } });
    fireEvent.click(screen.getByLabelText('Imagem e toque'));
    fireEvent.click(apply);
    const report = onApply.mock.calls[0][0];
    expect(report).toContain('Texto já escrito\n\n');
    expect(report).toContain('Imagem e toque');
    expect(report).not.toContain('Carregamento');
    expect(report).not.toContain('Tela Galaxy A15');
    expect(report).not.toMatch(/IP68|original|alta densidade/);
});
