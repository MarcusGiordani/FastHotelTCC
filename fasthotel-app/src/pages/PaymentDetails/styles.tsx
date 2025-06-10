// src/pages/PaymentDetails/styles.ts
import styled from 'styled-components'; // Mantenha apenas styled aqui
import { colors } from '../../styles/colors';

export const PaymentDetailsContainer = styled.div`
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
  background-color: ${colors.lightGray};
  color: ${colors.black};
  display: flex;
  flex-direction: column;
  position: relative;

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

export const Section = styled.div`
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
`;

export const SectionTitle = styled.h2`
  background-color: ${colors.lightGray};
  color: ${colors.black};
  padding: 15px 20px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid ${colors.grayBorder};
`;

export const SectionContent = styled.div`
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 16px;
  line-height: 1.5;

  &:not(:last-child) {
    border-bottom: 1px dashed ${colors.lightGray};
    padding-bottom: 5px;
  }
  &:last-child {
      padding-bottom: 0;
  }
`;

export const DetailLabel = styled.span`
  color: ${colors.black};
  font-weight: normal;
  flex: 1;
`;

export const DetailValue = styled.span<{ status?: string }>`
  color: ${({ status }) => {
    if (status === 'Não pago') return '#dc3545';
    if (status === 'Pago') return '#28a745';
    return colors.black;
  }};
  font-weight: bold;
  text-align: right;
`;

export const TotalRow = styled(DetailRow)<{ isFinal?: boolean }>`
  font-size: ${({ isFinal }) => (isFinal ? '20px' : '18px')};
  font-weight: bold;
  margin-top: ${({ isFinal }) => (isFinal ? '15px' : '10px')};
  border-top: ${({ isFinal }) => (isFinal ? `2px solid ${colors.primaryBlue}` : 'none')};
  padding-top: ${({ isFinal }) => (isFinal ? '10px' : '0')};
  
  ${DetailLabel} {
    color: ${colors.primaryBlue};
    font-weight: bold;
  }
  ${DetailValue} {
    color: ${colors.primaryBlue};
  }
`;

export const PaymentOptions = styled.div`
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 16px;
  color: ${colors.black};
`;

export const FinalActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 20px;
  margin-bottom: 40px;

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
`;

interface ActionButtonProps {
  variant: 'green' | 'red';
}

// CORREÇÃO AQUI: Mudança de styled(Button) para styled.button
export const ActionButton = styled.button<ActionButtonProps>`
  background-color: ${({ variant }) => (variant === 'green' ? '#28a745' : '#dc3545')};
  color: ${colors.white};
  border: none; /* Adicionado borda: none; para garantir que não tenha borda padrão de botão */
  border-radius: 8px; /* Adicionado border-radius para ser similar ao Button */
  padding: 10px 15px; /* Adicionado padding */
  cursor: pointer;
  font-weight: bold;
  font-size: 16px; /* Tamanho da fonte do botão */
  height: 50px;
  min-width: 150px; /* Adicionado um min-width para os botões */
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ variant }) => (variant === 'green' ? '#218838' : '#c82333')};
  }

  @media (max-width: 600px) {
    width: 90%;
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