import { parseDeliveryQr } from './deliveryQr';

test.each([
    ['{"os_id":8,"token":"0123"}', { os_id: 8, token: '0123' }],
    ['8/1234', { os_id: 8, token: '1234' }],
    ['https://example.test/api/os/validar-qr/8/1234', { os_id: 8, token: '1234' }],
    ['/os/validar-qr/8/1234', { os_id: 8, token: '1234' }],
])('extrai dados do QR %s', (text, expected) => {
    expect(parseDeliveryQr(text)).toEqual(expected);
});

test.each(['null', '[]', '{}', '{"os_id":8,"token":1234}', '{"os_id":-1,"token":"1234"}',
    'https://evil.test/delete-account', '8/12', '8/null', '{"os_id":9007199254740992,"token":"1234"}'])
('recusa conteúdo inválido sem gerar uma chamada externa: %s', text => {
    expect(() => parseDeliveryQr(text)).toThrow('QR de entrega inválido');
});
