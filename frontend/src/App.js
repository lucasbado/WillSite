import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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


function ProtectedRoute({ admin = false, children }) {
  const location = useLocation();
  if (!sessionStorage.getItem('token')) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (admin && sessionStorage.getItem('role') !== 'admin') {
    return <Navigate to="/cliente/dashboard" replace />;
  }
  return children;
}

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
        <Route path="/cliente/dashboard" element={<ProtectedRoute><DashboardCliente /></ProtectedRoute>} />
        <Route path="/admin/dashboard" element={<ProtectedRoute admin><DashboardAdmin /></ProtectedRoute>} />
        <Route path="/admin/estoque" element={<ProtectedRoute admin><GestaoEstoque /></ProtectedRoute>} />
        <Route path="/admin/logs" element={<ProtectedRoute admin><LogExclusoes /></ProtectedRoute>} />
        <Route path="/admin/Agenda" element={<ProtectedRoute admin><EscalaTecnica/></ProtectedRoute>} />
        <Route path="/admin/concluidos" element={<ProtectedRoute admin><HistoricoConcluido /></ProtectedRoute>} />
        <Route path="/admin/configuracoes" element={<ProtectedRoute admin><Configuracoes /></ProtectedRoute>} />
        <Route path="/cliente/qr-confirmacao" element={<ProtectedRoute><ScannerEntrega /></ProtectedRoute>} />
        <Route path="/cliente/os/:osId" element={<ProtectedRoute><VisualizacaoRecibo /></ProtectedRoute>} />
        <Route path="/admin/dashboard/financeiro" element={<ProtectedRoute admin><DashboardFinanceiro /></ProtectedRoute>} />
        <Route path="/cliente/perfil" element={<ProtectedRoute><ConfiguracoesPerfil /></ProtectedRoute>} />
        <Route path="/admin/clientes" element={<ProtectedRoute admin><ListaClientes /></ProtectedRoute>} />
        <Route path="/admin/cliente/:id" element={<ProtectedRoute admin><DetalhesCliente /></ProtectedRoute>} />
        <Route path="/admin/recibos" element={<ProtectedRoute admin><Recibos /></ProtectedRoute>} />
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
