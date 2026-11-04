import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Html5Qrcode } from 'html5-qrcode';
import DeliveryScanner from './DeliveryScanner';
import api from '../pages/api';

jest.mock('html5-qrcode', () => ({ Html5Qrcode: jest.fn(), Html5QrcodeSupportedFormats: { QR_CODE: 0 } }));
jest.mock('../pages/api', () => ({ post: jest.fn() }));
jest.mock('../utils/notifications', () => ({ success: jest.fn() }));

beforeEach(() => { jest.clearAllMocks(); });

test('a câmera permanece ativa durante renderizações e confirma um único QR', async () => {
    let onRead;
    const scanner = { isScanning: false, start: jest.fn(async (_, __, callback) => { scanner.isScanning = true; onRead = callback; }),
        stop: jest.fn(async () => { scanner.isScanning = false; }), clear: jest.fn() };
    Html5Qrcode.mockImplementation(() => scanner);
    api.post.mockResolvedValue({ data: { msg: 'OK' } });
    const confirmed = jest.fn();
    const view = render(<DeliveryScanner onConfirmed={confirmed} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar scanner' }));
    await screen.findByRole('button', { name: 'Desativar câmera' });
    view.rerender(<DeliveryScanner onConfirmed={confirmed} />);
    expect(scanner.start).toHaveBeenCalledTimes(1);
    expect(scanner.stop).not.toHaveBeenCalled();
    await act(async () => { await Promise.all([onRead('{"os_id":8,"token":"0123"}'), onRead('{"os_id":8,"token":"0123"}')]); });
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/os/validar-qr-entrega', { os_id: 8, token: '0123' });
    expect(confirmed).toHaveBeenCalledWith(8);
    expect(scanner.stop).toHaveBeenCalledTimes(1);
});

test('libera o hardware ao sair durante a inicialização da câmera', async () => {
    let finish;
    const scanner = { isScanning: false, start: jest.fn(() => new Promise(resolve => { finish = () => { scanner.isScanning = true; resolve(); }; })),
        stop: jest.fn(async () => { scanner.isScanning = false; }), clear: jest.fn() };
    Html5Qrcode.mockImplementation(() => scanner);
    const view = render(<DeliveryScanner />);
    fireEvent.click(screen.getByRole('button', { name: 'Ativar scanner' }));
    await waitFor(() => expect(scanner.start).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => { finish(); });
    await waitFor(() => expect(scanner.stop).toHaveBeenCalledTimes(1));
    expect(scanner.clear).toHaveBeenCalled();
});
