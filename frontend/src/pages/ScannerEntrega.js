import { useNavigate } from 'react-router-dom';
import DeliveryScanner from '../components/DeliveryScanner';

export default function ScannerEntrega() {
    const navigate = useNavigate();
    return (
        <main className="min-h-screen bg-slate-950 p-6 text-center text-white">
            <button type="button" onClick={() => navigate('/cliente/dashboard')} className="mb-6 rounded-xl bg-slate-800 px-4 py-3">Voltar aos meus reparos</button>
            <h1 className="mb-6 text-2xl font-black text-cyan-400">Confirmar retirada</h1>
            <DeliveryScanner />
        </main>
    );
}
