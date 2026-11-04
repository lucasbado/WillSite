import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import IntakeChat from './IntakeChat';
import api from '../pages/api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }), { virtual: true });
jest.mock('../pages/api', () => ({ get: jest.fn(), post: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); api.get.mockResolvedValue({ data: { ai_available: false } }); });
const future = () => new Date(Date.now() + 86400000).toISOString().slice(0, 16);
const send = content => {
    fireEvent.change(screen.getByLabelText('Sua mensagem para a Cidi'), { target: { value: content } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
};

test('início distingue conversa livre e formulário antes de oferecer campo de mensagem', async () => {
    api.get.mockResolvedValue({ data: { ai_available: true } });
    render(<IntakeChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    expect(await screen.findByRole('button', { name: /Conversar com a Cidi/ })).toBeInTheDocument();
    expect(screen.queryByLabelText('Sua mensagem para a Cidi')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Conversar com a Cidi/ }));
    expect(screen.queryByLabelText('Sua mensagem para a Cidi')).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Concordo, conversar com IA' }));
    expect(screen.getByLabelText('Sua mensagem para a Cidi')).toBeInTheDocument();
});

test('relato e modelo da conversa são usados no orçamento e preservados ao continuar a visita', async () => {
    api.get.mockResolvedValue({ data: { ai_available: true } });
    api.post.mockResolvedValueOnce({ data: { mode: 'ai', reply: 'Posso consultar a estimativa para essa tela.', modelo: 'S23', problema: 'Problema na tela', data_entrega: '' } });
    render(<IntakeChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    fireEvent.click(await screen.findByRole('button', { name: /Conversar com a Cidi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Concordo, conversar com IA' }));
    send('Tô com problemas na tela do meu S23, queria um orçamento');
    await screen.findByText(/Vamos conferir o orçamento antes de combinar uma visita/);
    expect(screen.getByLabelText('Modelo para orçamento')).toHaveValue('S23');
    fireEvent.change(screen.getByLabelText('Serviço para orçamento'), { target: { value: 'tela' } });
    api.post.mockResolvedValueOnce({ data: { status: 'pending', model: 'Samsung Galaxy S23', team_notified: true } });
    fireEvent.click(screen.getByRole('button', { name: 'Consultar peça + mão de obra' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Combinar visita para avaliação' }));
    fireEvent.click(screen.getByRole('button', { name: 'Escolher dia e revisar meu pedido' }));
    expect(screen.getByLabelText('Aparelho')).toHaveValue('Samsung Galaxy S23');
    expect(screen.getByLabelText('O que está acontecendo?')).toHaveValue('Problema na tela');
    expect(api.post.mock.calls.every(call => call[0] !== '/os/abrir')).toBe(true);
});
async function review() {
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Preencher por etapas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Levar meu aparelho' }));
    send('Samsung Galaxy A15'); send('Não carrega desde ontem');
    fireEvent.change(screen.getByLabelText('Dia e horário preferidos (Brasília)'), { target: { value: future() } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitação' }));
    fireEvent.click(screen.getByLabelText('Entendi que a equipe vai confirmar o horário antes da visita.'));
}

test('guiado salva uma única OS depois da revisão, conserva os dados se falhar e reusa a chave', async () => {
    sessionStorage.setItem('token', 'client-token');
    api.post.mockRejectedValueOnce({ code: 'ERR_NETWORK' }).mockResolvedValueOnce({ data: { os_id: 15 } });
    render(<IntakeChat />);
    await review();
    expect(api.post).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Confirmar e enviar solicitação' });
    fireEvent.click(confirm);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');
    expect(screen.getByLabelText('Aparelho')).toHaveValue('Samsung Galaxy A15');
    fireEvent.click(confirm);
    await screen.findByText('Solicitação #15');
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post.mock.calls[0][1]).toEqual(api.post.mock.calls[1][1]);
    expect(api.post.mock.calls[0][1].intake_request_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(screen.getByRole('log')).toHaveTextContent('ainda vai confirmar');
});

test('visitante entra com rascunho e retoma sem enviar automaticamente', async () => {
    const view = render(<IntakeChat />);
    await review();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar para enviar solicitação' }));
    expect(mockNavigate).toHaveBeenCalledWith('/login', { state: { from: '/cliente/dashboard' } });
    expect(api.post).not.toHaveBeenCalled();
    view.unmount(); sessionStorage.setItem('token', 'new-client-token');
    render(<IntakeChat />);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByLabelText('Aparelho')).toHaveValue('Samsung Galaxy A15');
    expect(api.post).not.toHaveBeenCalled();
});

test('IA exige escolha do usuário e nunca abre OS por mensagem', async () => {
    api.get.mockResolvedValue({ data: { ai_available: true } });
    api.post.mockResolvedValue({ data: { mode: 'ai', reply: 'Que dia você prefere?', modelo: 'Galaxy A15', problema: 'Não carrega', data_entrega: '' } });
    render(<IntakeChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: /Conversar com a Cidi/ }));
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Concordo, conversar com IA' }));
    send('Meu A15 não carrega');
    await screen.findByText('Que dia você prefere?');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post.mock.calls[0][0]).toBe('/assistant/message');
    expect(api.post.mock.calls[0][1].consent).toBe(true);
});

test('esgotamento da cascata continua por etapas e mantém relato não processado', async () => {
    api.get.mockResolvedValue({ data: { ai_available: true } });
    api.post.mockResolvedValue({ data: { mode: 'guided', reason: 'unavailable' } });
    render(<IntakeChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(await screen.findByRole('button', { name: /Conversar com a Cidi/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Concordo, conversar com IA' }));
    send('Galaxy A15');
    await screen.findByText(/Continuamos por etapas/);
    expect(screen.getByLabelText('Sua mensagem para a Cidi')).toHaveValue('Galaxy A15');
    fireEvent.click(screen.getByRole('button', { name: 'Enviar mensagem' }));
    expect(screen.getByRole('log')).toHaveTextContent('O que acontece com ele?');
    expect(api.post).toHaveBeenCalledTimes(1);
});

test('fechar por Escape devolve foco e reabrir preserva conversa', async () => {
    render(<IntakeChat />);
    const launcher = screen.getByRole('button', { name: 'Abrir atendimento da Cidi' });
    fireEvent.click(launcher);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Preencher por etapas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Como funciona?' }));
    const transcript = within(screen.getByRole('log')).getAllByText(/A equipe confirma a visita/);
    expect(transcript).toHaveLength(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
    fireEvent.click(launcher);
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    expect(screen.getByRole('log')).toHaveTextContent('A equipe confirma a visita');
});

test('palavras de dúvidas dentro do relato não substituem os dados coletados', async () => {
    render(<IntakeChat />);
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento da Cidi' }));
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: /Preencher por etapas/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Levar meu aparelho' }));
    send('Galaxy A15 - teste de atendimento');
    expect(screen.getByRole('log')).toHaveTextContent('O que acontece com ele?');
    send('O aparelho não liga depois do backup');
    expect(screen.getByLabelText('Dia e horário preferidos (Brasília)')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Dia e horário preferidos (Brasília)'), { target: { value: future() } });
    fireEvent.click(screen.getByRole('button', { name: 'Revisar solicitação' }));
    expect(screen.getByLabelText('Aparelho')).toHaveValue('Galaxy A15 - teste de atendimento');
    expect(screen.getByLabelText('O que está acontecendo?')).toHaveValue('O aparelho não liga depois do backup');
});
