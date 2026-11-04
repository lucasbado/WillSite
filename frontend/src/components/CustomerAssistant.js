import React from 'react';
import { useLocation } from 'react-router-dom';
import IntakeChat from './IntakeChat';

export default function CustomerAssistant() {
    const { pathname } = useLocation();
    const token = sessionStorage.getItem('token');
    if (pathname.startsWith('/admin') || sessionStorage.getItem('role') === 'admin' ||
        !['/', '/home/servicos', '/home/sobre', '/cliente/dashboard'].includes(pathname)) return null;
    // A conversa de uma sessão não passa para outro cliente ou para o visitante após logout.
    return <IntakeChat key={token || 'visitor'} />;
}
