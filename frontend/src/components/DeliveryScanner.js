import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import api from '../pages/api';
import { parseDeliveryQr } from '../utils/deliveryQr';
import { requestError } from '../utils/requestError';
import notify from '../utils/notifications';

export default function DeliveryScanner({ onConfirmed }) {
    const readerId = 'delivery-reader-' + useId().replace(/:/g, '');
    const [active, setActive] = useState(false);
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState('Ative a câmera e aponte para o QR exibido no balcão.');
    const scannerRef = useRef(null);
    const operationRef = useRef(Promise.resolve());
    const mounted = useRef(false);
    const processing = useRef(false);
    const callback = useRef(onConfirmed);
    useEffect(() => { callback.current = onConfirmed; }, [onConfirmed]);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            // Se a câmera ainda estiver iniciando, aguarda antes de liberar o hardware.
            operationRef.current = operationRef.current.catch(() => {}).then(async () => {
                const scanner = scannerRef.current;
                if (scanner?.isScanning) await scanner.stop();
                if (scanner) scanner.clear();
                scannerRef.current = null;
            }).catch(() => {});
        };
    }, []);

    const stopCamera = async () => {
        const scanner = scannerRef.current;
        if (scanner?.isScanning) await scanner.stop();
        if (scanner) scanner.clear();
        scannerRef.current = null;
        if (mounted.current) setActive(false);
    };

    const startCamera = () => {
        if (busy || processing.current) return;
        processing.current = true;
        setBusy(true);
        setStatus('Solicitando acesso à câmera…');
        operationRef.current = operationRef.current.catch(() => {}).then(async () => {
            if (!mounted.current) return;
            await stopCamera();
            const scanner = new Html5Qrcode(readerId, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE] });
            scannerRef.current = scanner;
            const onRead = async text => {
                if (processing.current || !mounted.current) return;
                processing.current = true;
                setBusy(true);
                setStatus('Confirmando retirada…');
                try {
                    const data = parseDeliveryQr(text);
                    await stopCamera();
                    await api.post('/os/validar-qr-entrega', data);
                    if (mounted.current) {
                        setStatus('Entrega confirmada!');
                        notify.success('Entrega confirmada!');
                        callback.current?.(data.os_id);
                    }
                } catch (error) {
                    await stopCamera().catch(() => {});
                    if (mounted.current) setStatus(error.response || error.code ? requestError(error) : error.message || 'QR inválido. Tente novamente.');
                } finally {
                    processing.current = false;
                    if (mounted.current) setBusy(false);
                }
            };
            await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 220, height: 220 } }, onRead);
            if (mounted.current) {
                setActive(true);
                setStatus('Câmera pronta. Aponte para o QR de retirada.');
            }
        }).catch(() => {
            if (mounted.current) setStatus('Não foi possível acessar a câmera. Permita o acesso no navegador e tente novamente.');
        }).finally(() => {
            processing.current = false;
            if (mounted.current) setBusy(false);
        });
    };

    return (
        <div className="mx-auto w-full max-w-sm text-center">
            <div id={readerId} className="aspect-square w-full overflow-hidden rounded-3xl border-4 border-cyan-600 bg-slate-900 [&_video]:object-cover" />
            <p role="status" className="my-4 text-sm text-slate-200">{status}</p>
            <button type="button" disabled={busy} onClick={active ? () => stopCamera().catch(() => {}) : startCamera}
                className="rounded-2xl bg-cyan-600 px-6 py-4 font-bold text-white hover:bg-cyan-500 disabled:opacity-50">
                {busy ? 'Aguarde…' : active ? 'Desativar câmera' : 'Ativar scanner'}
            </button>
        </div>
    );
}
