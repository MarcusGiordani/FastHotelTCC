// src/components/AccountMenu/index.tsx
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons'; // Ícone de usuário
import { MenuContainer, MenuItem, MenuTitle } from './styles';

interface AccountMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

const AccountMenu: React.FC<AccountMenuProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null; // Não renderiza se não estiver aberto

  return (
    <MenuContainer>
      <MenuTitle>Acessar outras contas</MenuTitle>
      <MenuItem onClick={onClose}>
        <FontAwesomeIcon icon={faUser} /> Hotel 1
      </MenuItem>
      <MenuItem onClick={onClose}>
        <FontAwesomeIcon icon={faUser} /> Hotel 2
      </MenuItem>
      <MenuItem onClick={onClose}>
        <FontAwesomeIcon icon={faUser} /> Hotel 3
      </MenuItem>
    </MenuContainer>
  );
};

export default AccountMenu;