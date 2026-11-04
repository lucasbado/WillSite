// Apenas extrai dados. Nunca encaminha o token da sessão para uma URL lida pela câmera.
export function parseDeliveryQr(text) {
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        let path = text.trim();
        if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
        const match = path.match(/^(?:\/(?:api\/)?os\/validar-qr\/)?([1-9]\d*)\/(\d{4})\/?$/);
        if (!match) throw new Error('QR de entrega inválido');
        data = { os_id: Number(match[1]), token: match[2] };
    }
    if (!data || !Number.isSafeInteger(data.os_id) || data.os_id <= 0 ||
        typeof data.token !== 'string' || !/^\d{4}$/.test(data.token)) {
        throw new Error('QR de entrega inválido');
    }
    return { os_id: data.os_id, token: data.token };
}
