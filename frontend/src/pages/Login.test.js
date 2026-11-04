import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Login from './Login';
import api from './api';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate, useLocation: () => ({}) }), { virtual: true });
jest.mock('./api', () => ({ post: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); sessionStorage.clear(); });
function fillLogin() {
    fireEvent.change(screen.getByLabelText('Seu E-mail'), { target: { value: 'cliente@example.test' } });
    fireEvent.change(screen.getByLabelText('Sua Senha'), { target: { value: 'senha-teste' } });
}

test('permite conferir a senha e bloqueia envios duplicados enquanto entra', async () => {
    let resolve;
    api.post.mockReturnValue(new Promise(finish => { resolve = finish; }));
    render(<Login />);
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(screen.getByLabelText('Sua Senha')).toHaveAttribute('type', 'text');
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Sistema' }));
    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled();
    fireEvent.submit(screen.getByRole('form', { name: 'Entrar na conta' }));
    expect(api.post).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({ data: { access_token: 'local-test-token', role: 'cliente', user_name: 'Cliente' } }); });
    expect(mockNavigate).toHaveBeenCalledWith('/cliente/dashboard');
});

test.each([
    [{ code: 'ERR_NETWORK' }, /Sem conexão com o servidor/],
    [{ response: { status: 401 } }, /E-mail ou senha incorretos/],
    [{ response: { status: 503 } }, /temporariamente indisponível/],
])('explica a causa da falha de login', async (error, message) => {
    api.post.mockRejectedValue(error);
    render(<Login />);
    fillLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Entrar no Sistema' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: 'Entrar no Sistema' })).toBeEnabled();
});
