// src/pages/ChatList/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const ChatListContainer = styled.div`
  display: flex;
  width: 100%;
  min-height: 100vh;
  background-color: ${colors.white};
`;

export const MainContent = styled.div<{ isMenuOpen: boolean }>`
  flex: 1;
  padding: 20px;
  padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '270px' : '20px')};
  transition: padding-left 0.3s ease-in-out;
  background-color: ${colors.lightGray}; /* Fundo cinza claro */
  color: ${colors.black};
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
    padding: 15px;
  }
`;

export const Header = styled.div`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const Title = styled.h1`
  font-size: 24px;
  color: ${colors.white};
`;

export const ChatCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); /* Colunas flexíveis */
  gap: 20px;
  padding: 10px;
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  }
  @media (max-width: 480px) {
    grid-template-columns: 1fr; /* Uma coluna em telas muito pequenas */
  }
`;

export const ChatCard = styled.div`
  background-color: ${colors.lightGray};
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: center; /* Centraliza o conteúdo do card */
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  text-align: center;
  gap: 8px; /* Espaçamento entre os itens do card */
`;

export const ChatCardTitle = styled.h2`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 16px;
  margin-bottom: 10px;
`;

export const ChatInfo = styled.p`
  font-size: 14px;
  color: ${colors.black};
  font-weight: 500;
`;

export const ChatStatusButton = styled.button<{ status: 'active' | 'inactive' }>`
  background-color: ${({ status }) => (status === 'active' ? '#28a745' : '#dc3545')}; /* Verde ou Vermelho */
  color: ${colors.white};
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: ${({ status }) => (status === 'active' ? 'pointer' : 'not-allowed')}; /* Cursor */
  opacity: ${({ status }) => (status === 'active' ? 1 : 0.6)}; /* Opacidade para indisponível */
  transition: opacity 0.2s;
  width: 100%;
  margin-top: 10px;

  &:hover {
    opacity: ${({ status }) => (status === 'active' ? 0.9 : 0.6)};
  }
`;