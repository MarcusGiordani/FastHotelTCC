// src/pages/ChatOnline/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const ChatOnlineContainer = styled.div`
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
  position: relative; /* Para a engrenagem */

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
    padding: 15px;
  }
`;

export const Header = styled.div`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  padding: 15px 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: center; /* Centraliza as informações do hóspede */
`;

export const GuestInfo = styled.div`
  display: flex;
  flex-wrap: wrap; /* Permite quebrar linha em telas menores */
  gap: 15px; /* Espaçamento entre as informações */
  font-size: 16px;
  font-weight: bold;
  color: ${colors.white};

  span {
    white-space: nowrap; /* Impede que as informações quebrem linha individualmente */
  }

  @media (max-width: 600px) {
    font-size: 14px;
    justify-content: center;
    text-align: center;
  }
`;

export const ChatArea = styled.div`
  flex: 1; /* Ocupa o espaço restante */
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto; /* Scroll para a área do chat */
  height: calc(100vh - 250px); /* Altura calculada para preencher a tela */
  max-height: 500px; /* Limite de altura para melhor visualização */

  @media (max-width: 768px) {
    max-height: 400px; /* Ajuste para telas menores */
  }
`;

export const MessageBubble = styled.div<{ sender: 'user' | 'reception' }>`
  background-color: ${({ sender }) => (sender === 'user' ? '#f0f0f0' : colors.primaryBlue)}; /* Cinza para hóspede, azul para recepção */
  color: ${({ sender }) => (sender === 'user' ? colors.black : colors.white)};
  border-radius: 15px;
  padding: 10px 15px;
  max-width: 70%; /* Limita a largura do balão */
  margin-bottom: 10px;
  align-self: ${({ sender }) => (sender === 'user' ? 'flex-start' : 'flex-end')}; /* Alinha à esquerda ou direita */
  text-align: ${({ sender }) => (sender === 'user' ? 'left' : 'right')};
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);

  p { /* Nome do remetente */
    font-size: 12px;
    font-weight: bold;
    margin-bottom: 5px;
    color: ${({ sender }) => (sender === 'user' ? '#666' : 'rgba(255,255,255,0.8)')};
  }
  span { /* Conteúdo da mensagem */
    font-size: 14px;
    word-wrap: break-word; /* Quebra palavras longas */
  }
`;

export const MessageInputContainer = styled.div`
  display: flex;
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 10px;
  gap: 10px;
  margin-top: 20px; /* Espaçamento acima do input */
  position: relative; /* Para a seta do input */
`;

export const MessageInput = styled.input`
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  padding: 10px;
  background-color: transparent;
  color: ${colors.black};

  &::placeholder {
    color: ${colors.textLight};
  }
`;

export const SendButton = styled.button`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  border: none;
  border-radius: 50%; /* Botão circular */
  width: 45px;
  height: 45px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background-color: #216bbd; /* Azul um pouco mais escuro */
  }
`;

export const SettingsIcon = styled.div`
  position: absolute;
  bottom: 20px;
  right: 20px;
  font-size: 30px;
  color: ${colors.black};
  cursor: pointer;
  z-index: 10;
  transition: transform 0.2s;
  &:hover {
    transform: rotate(30deg);
  }

  @media (max-width: 768px) {
    font-size: 24px;
    bottom: 15px;
    right: 15px;
  }
`;