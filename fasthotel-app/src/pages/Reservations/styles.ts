// src/pages/Reservations/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const ReservationsContainer = styled.div`
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
  background-color: ${colors.lightGray}; /* Fundo claro para a área de conteúdo */
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
  display: flex;
  flex-direction: column; /* Título em cima, navegação embaixo */
  align-items: center;
`;

export const Title = styled.h1`
  font-size: 24px;
  color: ${colors.white};
  margin-bottom: 15px; /* Espaçamento entre título e navegação de data */
`;

export const DateNavigation = styled.div`
  display: flex;
  justify-content: center;
  gap: 30px; /* Espaçamento entre Dia, Mês, Ano */
  width: 100%; /* Ocupa a largura total do Header */

  @media (max-width: 768px) {
    flex-direction: column; /* Empilha em telas menores */
    gap: 10px;
  }
`;

export const DateControl = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 16px;
  color: ${colors.white};
  font-weight: bold;

  svg {
    cursor: pointer;
    font-size: 20px;
    transition: color 0.2s;
    &:hover {
      color: #ccc; /* Cor mais clara no hover */
    }
  }
`;

export const DateLabel = styled.span`
  /* Ocupa o espaço para o texto da data */
  width: 120px; /* Largura fixa para manter o alinhamento */
  text-align: center;
`;

export const ApartmentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); /* 5 colunas por linha */
  gap: 20px; /* Espaçamento entre os cards */
  padding: 10px; /* Padding ao redor da grade */
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);

  @media (max-width: 1200px) {
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); /* Reduz um pouco o min-width */
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); /* Mais estreito para mobile */
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr; /* Uma coluna em telas muito pequenas */
  }
`;

export const ApartmentCard = styled.div`
  background-color: ${colors.lightGray}; /* Fundo cinza claro para os cards */
  border-radius: 8px;
  padding: 15px;
  display: flex;
  flex-direction: column;
  align-items: flex-start; /* Alinha o conteúdo à esquerda */
  text-align: left;
  box-shadow: 0 2px 5px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.15);
  }
`;

export const ApartmentNumber = styled.div`
  font-size: 20px;
  font-weight: bold;
  color: ${colors.primaryBlue};
  margin-bottom: 10px;
  align-self: flex-end; /* Alinha o número no canto superior direito do card */
`;

export const ApartmentGuest = styled.p`
  font-size: 14px;
  color: ${colors.black};
  margin-bottom: 15px;
  min-height: 3em; /* Para garantir que o espaço seja consistente mesmo sem hóspede */
`;

export const ApartmentStatus = styled.div<{ status: string }>`
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export const StatusButton = styled.button<{ status: string }>`
  background-color: ${({ status }) => {
    switch (status) {
      case 'DISPONÍVEL': return '#28a745'; // Verde
      case 'RESERVADO': return '#ffc107'; // Amarelo
      case 'OCUPADO': return '#dc3545'; // Vermelho
      default: return '#6c757d'; // Cinza padrão
    }
  }};
  color: ${({ status }) => (status === 'RESERVADO' ? colors.black : colors.white)}; /* Texto preto para o amarelo */
  border: none;
  border-radius: 5px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  cursor: pointer;
  width: 100%; /* Botão ocupa a largura total do status */
  max-width: 120px; /* Largura máxima para o botão */
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;