import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const MenuContainer = styled.div`
  position: absolute; /* Posição absoluta em relação ao Login Container */
  top: 60px; /* Abaixo do ícone do menu sanduíche */
  right: 20px;
  background-color: ${colors.white};
  border-radius: 5px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  width: 180px; /* Largura da "tabelinha" */
  padding: 10px 0;
  z-index: 50; /* Z-index para aparecer acima do conteúdo, mas abaixo do ícone */
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    top: 50px;
    right: 15px;
    width: 150px;
  }
`;

export const MenuTitle = styled.div`
  padding: 8px 15px;
  font-size: 14px;
  color: ${colors.black};
  font-weight: bold;
  border-bottom: 1px solid ${colors.lightGray};
  margin-bottom: 8px;
`;

export const MenuItem = styled.a`
  display: flex;
  align-items: center;
  padding: 8px 15px;
  color: ${colors.black};
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: ${colors.lightGray};
  }

  svg {
    margin-right: 8px;
    color: ${colors.textLight};
  }
`;