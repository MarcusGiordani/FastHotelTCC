// src/routes/index.tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Login from '../pages/Login';
import Home from '../pages/Home';
import Guests from '../pages/Guests';
import GuestRegistration from '../pages/GuestRegistration';
import Payments from '../pages/Payments';
import PaymentDetails from '../pages/PaymentDetails';
import Reservations from '../pages/Reservations';
import ChatList from '../pages/ChatList';
import ChatOnline from '../pages/ChatOnline';
import Settings from '../pages/Settings'; // Importe a página de Configurações

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/guests" element={<Guests />} />
        <Route path="/guests/register" element={<GuestRegistration />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/payments/details" element={<PaymentDetails />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/chat" element={<ChatList />} />
        <Route path="/chat/online/:id" element={<ChatOnline />} />
        <Route path="/settings" element={<Settings />} /> {/* Nova rota para Configurações */}
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;