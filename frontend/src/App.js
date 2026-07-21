import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardCliente from './pages/DashboardCliente';
import DashboardAdmin from './pages/DashboardAdmin';
import GestaoEstoque from './pages/GestaoEstoque';
import LogExclusoes from './pages/LogExclusoes';
import HistoricoConcluido from './pages/HistoricoConcluido';
import Configuracoes from './pages/Configuracoes';
import ConfiguracoesPerfil from './pages/ConfiguracoesPerfil';
import ListaClientes from './pages/ListaClientes';
import DetalhesCliente from './pages/DetalhesCliente';
import Recibos from './pages/ReciboPersonalizado';
import Servicos from './pages/Servicos';
import Sobre from './pages/Sobre';
import EscalaTecnica from './pages/EscalaTecnica';
import VisualizacaoRecibo from './pages/VisualizacaoRecibo';
import DashboardFinanceiro from './pages/DashboardFinanceiro';
import ScannerEntrega from './pages/ScannerEntrega';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ConfirmEmail from './pages/ConfirmEmail';


function App() {
  return (
    <Router>
      {/* O Routes é o "container" obrigatório para as rotas */}
      <Routes>
        {/* Página Inicial */}
        <Route path="/" element={<Home />} />
        
        {/* Autenticação */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />

        {/* Dashboards */}
        <Route path="/cliente/dashboard" element={<DashboardCliente />} />
        <Route path="/admin/dashboard" element={<DashboardAdmin />} />
        <Route path="/admin/estoque" element={<GestaoEstoque />} />
        <Route path="/admin/logs" element={<LogExclusoes />} />
        <Route path="/admin/Agenda" element={<EscalaTecnica/>} />
        <Route path="/admin/concluidos" element={<HistoricoConcluido />} />
        <Route path="/admin/configuracoes" element={<Configuracoes />} />
        <Route path="/cliente/qr-confirmacao" element={<ScannerEntrega />} />
        <Route path="/cliente/os/:osId" element={<VisualizacaoRecibo />} />
        <Route path="/admin/dashboard/financeiro" element={<DashboardFinanceiro />} />
        <Route path="/cliente/perfil" element={<ConfiguracoesPerfil />} />
        <Route path="/admin/clientes" element={<ListaClientes />} />
        <Route path="/admin/cliente/:id" element={<DetalhesCliente />} />
        <Route path="/admin/recibos" element={<Recibos />} />
        <Route path="/home/servicos" element={<Servicos />} />
        <Route path="/home/sobre" element={<Sobre />} />
        <Route path="/confirmar-email" element={<ConfirmEmail />} />

        

        {/* Rota de fallback (Redireciona qualquer coisa errada para a Home) */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;