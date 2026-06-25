// src/components/SideMenu/index.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faBook, faCreditCard, faComments, faBars, faCog, faChartBar, faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { MenuContainer, LogoSection, MenuItem, MenuTitle, MenuToggleIcon, SettingsLink, LogoutButton } from './styles';
import { useLocation, useNavigate } from 'react-router-dom';


import logo from '../../assets/logofasthotel.png'; // Certifique-se que o caminho e nome da logo estão corretos

interface SideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleSettingsClick = () => navigate('/settings');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_info');
    navigate('/');
  };

  return (
    <MenuContainer isOpen={isOpen}>
      {/* Ícone de toggle para mobile */}
      <MenuToggleIcon onClick={onToggle}>
        <FontAwesomeIcon icon={faBars} />
      </MenuToggleIcon>

      {/* Seção da Logo e Título */}
      <LogoSection>
        <img src={logo} alt="FastHotel Logo" />
        <MenuTitle>FASTHOTEL</MenuTitle> {/* Certifique-se que está escrito FASTHOTEL aqui se for o caso */}
      </LogoSection>

      {/* Itens do menu de navegação */}
      {/* Home */}
      <MenuItem href="/home" active={location.pathname === '/home'}>
        <FontAwesomeIcon icon={faHome} /> Home
      </MenuItem>
      {/* Hóspedes */}
      <MenuItem href="/guests" active={location.pathname === '/guests' || location.pathname === '/guests/register'}>
        <FontAwesomeIcon icon={faUsers} /> Hóspedes
      </MenuItem>
      {/* Reservas */}
      <MenuItem href="/reservations" active={location.pathname === '/reservations'}>
        <FontAwesomeIcon icon={faBook} /> Reservas
      </MenuItem>
      {/* Pagamento */}
      <MenuItem href="/payments" active={location.pathname === '/payments' || location.pathname === '/payments/details'}>
        <FontAwesomeIcon icon={faCreditCard} /> Pagamento
      </MenuItem>
      {/* Chat Virtual */}
      <MenuItem href="/chat" active={location.pathname.startsWith('/chat')}>
        <FontAwesomeIcon icon={faComments} /> Chat Virtual
      </MenuItem>
      {/* Analytics */}
      <MenuItem href="/analytics" active={location.pathname.startsWith('/analytics')}>
        <FontAwesomeIcon icon={faChartBar} /> Analytics
      </MenuItem>

      <SettingsLink onClick={handleSettingsClick}>
        <FontAwesomeIcon icon={faCog} />
      </SettingsLink>

      <LogoutButton onClick={handleLogout}>
        <FontAwesomeIcon icon={faSignOutAlt} />
        Sair
      </LogoutButton>
    </MenuContainer>
  );
};

export default SideMenu;