// src/components/SideMenu/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const MenuContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: ${({ isOpen }) => (isOpen ? '0' : '-250px')}; /* Posição do menu */
  width: 250px; /* Largura do menu */
  height: 100%;
  background-color: ${colors.primaryBlue}; /* Cor de fundo do menu */
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  transition: left 0.3s ease-in-out;
  padding: 20px 0; /* Padding superior/inferior */
  display: flex;
  flex-direction: column; /* Itens empilhados verticalmente */
  z-index: 10; /* Para garantir que o menu esteja acima de outros conteúdos */

  @media (max-width: 768px) {
    width: 200px;
    left: ${({ isOpen }) => (isOpen ? '0' : '-200px')};
  }
`;

export const LogoSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center; /* Centraliza logo e texto */
  padding: 0 20px 30px; /* Padding e espaçamento inferior */
  margin-top: 20px; /* Espaço do topo */

  img {
    width: 80px; /* Tamanho da logo */
    margin-bottom: 10px; /* Espaçamento entre logo e texto */
  }
`;

export const MenuTitle = styled.h2`
  color: ${colors.white}; /* Cor do texto "FASTHOTEL" / "HOME" */
  font-size: 18px;
  font-weight: bold;
`;

export const MenuItem = styled.a<{ active?: boolean }>`
  display: flex;
  align-items: center; /* Alinha ícone e texto */
  padding: 15px 20px; /* Padding interno do item de menu */
  color: ${({ active }) => (active ? colors.black : colors.white)}; /* Cor do texto ativo/inativo */
  background-color: ${({ active }) => (active ? colors.white : 'transparent')}; /* Fundo do item ativo */
  text-decoration: none;
  font-size: 16px;
  margin-bottom: 5px; /* Espaçamento entre itens de menu */
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 0 50px 50px 0; /* Borda arredondada no lado direito */

  &:hover {
    background-color: ${colors.white};
    color: ${colors.black};
  }

  svg {
    margin-right: 15px; /* Espaçamento entre ícone e texto */
    font-size: 20px;
  }
`;

export const MenuToggleIcon = styled.div`
  position: absolute;
  top: 20px;
  right: -50px;
  color: ${colors.black};
  font-size: 24px;
  cursor: pointer;
  z-index: 11;
  display: none; /* Esconde por padrão, só aparece em mobile */

  @media (max-width: 768px) {
    display: block;
  }
`;

export const SettingsLink = styled.div`
  position: absolute;
  bottom: 60px;
  left: 20px;
  color: ${colors.white};
  font-size: 28px;
  cursor: pointer;
  transition: color 0.2s;
  z-index: 12;

  &:hover {
    color: #ccc;
  }

  @media (max-width: 768px) {
    font-size: 24px;
    bottom: 55px;
    left: 15px;
  }
`;

export const LogoutButton = styled.div`
  position: absolute;
  bottom: 20px;
  left: 20px;
  color: ${colors.white};
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.75;
  transition: opacity 0.2s;
  z-index: 12;

  &:hover {
    opacity: 1;
  }

  svg {
    font-size: 16px;
  }
`;