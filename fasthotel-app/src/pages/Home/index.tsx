// src/pages/Home/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { HomeContainer, MainContent } from './styles';

const Home: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <HomeContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        {/* Título e descrição da Home */}
        <h1>Bem-vindo ao FastHotel!</h1>
        <p>Aqui você pode gerenciar hóspedes, reservas e pagamentos.</p>

        {/* Placeholder para preencher o espaço */}
        <div style={{
          marginTop: '40px',
          padding: '20px',
          backgroundColor: '#e0f2f7', /* Um azul bem claro para o placeholder */
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h2>Visão Geral do Hotel</h2>
          <p style={{ margin: '15px 0' }}>Sua imagem de fundo do hotel estaria aqui.</p>
          <img
            src="https://via.placeholder.com/700x450/A4D2E1/FFFFFF?text=Imagem+do+Hotel" /* URL de placeholder com cor azul */
            alt="Placeholder Hotel"
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px', border: '1px solid #c0e2ec' }}
          />
          <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Esta é uma representação visual do seu ambiente de hotel.
          </p>
        </div>
        {/* Você pode adicionar mais conteúdo ou componentes aqui */}
      </MainContent>
    </HomeContainer>
  );
};

export default Home;