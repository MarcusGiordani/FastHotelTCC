// src/routes/index.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Home from '../pages/Home';
import Guests from '../pages/Guests';
import GuestRegistration from '../pages/GuestRegistration'; // Importe a página de Cadastro
import Payments from '../pages/Payments'; // Importe a página de Pagamentos

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/guests/register" element={<GuestRegistration />} /> {/* Rota para Cadastro */}
        <Route path="/payments" element={<Payments />} /> {/* Rota para Pagamentos */}
        {/* Adicione outras rotas aqui */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;