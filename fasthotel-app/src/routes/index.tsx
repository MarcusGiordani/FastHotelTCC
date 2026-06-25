import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import PrivateRoute from '../components/PrivateRoute';
import Login from '../pages/Login';
import UserRegistration from '../pages/UserRegistration';
import Home from '../pages/Home';
import Guests from '../pages/Guests';
import GuestRegistration from '../pages/GuestRegistration';
import GuestReservationsList from '../pages/GuestReservationsList';
import Payments from '../pages/Payments';
import PaymentDetails from '../pages/PaymentDetails';
import Reservations from '../pages/Reservations';
import ChatList from '../pages/ChatList';
import ChatOnline from '../pages/ChatOnline';
import Settings from '../pages/Settings';
import Analytics from '../pages/Analytics';

const AppRoutes: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<UserRegistration />} />

        <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
        <Route path="/guests" element={<PrivateRoute><Guests /></PrivateRoute>} />
        <Route path="/guests/register" element={<PrivateRoute><GuestRegistration /></PrivateRoute>} />
        <Route path="/guests/edit/:id" element={<PrivateRoute><GuestRegistration /></PrivateRoute>} />
        <Route path="/guests/:id/reservations" element={<PrivateRoute><GuestReservationsList /></PrivateRoute>} />

        <Route path="/payments" element={<PrivateRoute><Payments /></PrivateRoute>} />
        <Route path="/payments/details/:reservaId" element={<PrivateRoute><PaymentDetails /></PrivateRoute>} />

        <Route path="/reservations" element={<PrivateRoute><Reservations /></PrivateRoute>} />

        <Route path="/chat" element={<PrivateRoute><ChatList /></PrivateRoute>} />
        <Route path="/chat/online/:conversaId" element={<PrivateRoute><ChatOnline /></PrivateRoute>} />

        <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
        <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
