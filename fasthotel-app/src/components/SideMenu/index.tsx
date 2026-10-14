// src/components/SideMenu/index.tsx
import React, { useEffect, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faBook, faCreditCard, faComments, faBars, faCog, faChartBar, faSignOutAlt, faBroom, faBoxesStacked, faMoneyBillWave, faBed } from '@fortawesome/free-solid-svg-icons';
import { MenuContainer, LogoSection, MenuItem, MenuTitle, MenuToggleIcon, SettingsLink, LogoutButton } from './styles';
import { useLocation, useNavigate } from 'react-router-dom';


import logo from '../../assets/logofasthotel.png'; // Certifique-se que o caminho e nome da logo estão corretos

// Mesmo limite de @media (max-width: 768px) usado em styles.ts (aqui e em cada MainContent).
const MOBILE_BREAKPOINT = 768;

interface SideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Cada página inicializa isMenuOpen=true (comportamento de desktop, preservado).
  // Em telas móveis isso cobria o conteúdo inteiro ao carregar a página, sem opção
  // de recuperar o espaço — aqui fechamos uma única vez no primeiro carregamento
  // em viewport móvel, usando o próprio onToggle que cada página já fornece.
  const jaAjustouInicial = useRef(false);
  useEffect(() => {
    if (!jaAjustouInicial.current && isOpen && window.innerWidth <= MOBILE_BREAKPOINT) {
      onToggle();
    }
    jaAjustouInicial.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Apartamentos (quartos + tipos de apartamento) */}
      <MenuItem href="/apartamentos" active={location.pathname === '/apartamentos'}>
        <FontAwesomeIcon icon={faBed} /> Apartamentos
      </MenuItem>
      {/* Limpeza */}
      <MenuItem href="/limpeza" active={location.pathname === '/limpeza'}>
        <FontAwesomeIcon icon={faBroom} /> Limpeza
      </MenuItem>
      {/* Estoque */}
      <MenuItem href="/estoque" active={location.pathname === '/estoque'}>
        <FontAwesomeIcon icon={faBoxesStacked} /> Estoque
      </MenuItem>
      {/* Fluxo de Caixa */}
      <MenuItem href="/financeiro" active={location.pathname === '/financeiro'}>
        <FontAwesomeIcon icon={faMoneyBillWave} /> Fluxo de Caixa
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