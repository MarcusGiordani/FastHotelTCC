// src/App.tsx
import React from 'react';
import AppRoutes from './routes'; // Importe suas rotas

const App: React.FC = () => { // <--- Verifique se esta linha e a de baixo estão corretas
  return (
    <AppRoutes />
  );
}; // <--- E esta chave de fechamento aqui

export default App;