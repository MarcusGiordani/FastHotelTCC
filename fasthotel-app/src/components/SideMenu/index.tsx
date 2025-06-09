// src/components/SideMenu/index.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faUsers, faBook, faCreditCard, faComments, faBars } from '@fortawesome/free-solid-svg-icons';
import { MenuContainer, LogoSection, MenuItem, MenuTitle, MenuToggleIcon } from './styles';
import { useLocation } from 'react-router-dom';
import logo from '../../assets/logofasthotel.png';

interface SideMenuProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onToggle }) => {
  const location = useLocation();

  return (
    <MenuContainer isOpen={isOpen}>
      <MenuToggleIcon onClick={onToggle}>
        <FontAwesomeIcon icon={faBars} />
      </MenuToggleIcon>

      <LogoSection>
        <img src={logo} alt="FastHotel Logo" />
        <MenuTitle>HOME</MenuTitle>
      </LogoSection>

      <MenuItem href="/home" active={location.pathname === '/home'}>
        <FontAwesomeIcon icon={faHome} /> Home
      </MenuItem>
      <MenuItem href="/guests" active={location.pathname === '/guests' || location.pathname === '/guests/register'}> {/* Ativa Hóspedes e Cadastro */}
        <FontAwesomeIcon icon={faUsers} /> Hóspedes
      </MenuItem>
      {/* Você pode adicionar um sub-item para cadastro aqui, ou navegar do Guests */}
      <MenuItem href="#" active={location.pathname === '/reservations'}>
        <FontAwesomeIcon icon={faBook} /> Reservas
      </MenuItem>
      <MenuItem href="/payments" active={location.pathname === '/payments'}> {/* Novo link para Pagamentos */}
        <FontAwesomeIcon icon={faCreditCard} /> Pagamento
      </MenuItem>
      <MenuItem href="#" active={location.pathname === '/chat'}>
        <FontAwesomeIcon icon={faComments} /> Chat Virtual
      </MenuItem>
    </MenuContainer>
  );
};

export default SideMenu;