import styled from 'styled-components';
import { colors } from '../../styles/colors';
import React from 'react';

export const PaymentDetailsContainer = styled.div`
  display: flex;
  width: 100%;
  min-height: 100vh;
  background-color: var(--card-bg);
`;

export const MainContent = styled.div<{ isMenuOpen: boolean }>`
  flex: 1;
  padding: 20px;
  padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '270px' : '20px')};
  transition: padding-left 0.3s ease-in-out;
  background-color: var(--page-bg);
  color: var(--card-text);
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
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  overflow: hidden;
`;

export const SectionTitle = styled.h2`
  background-color: var(--table-header-bg);
  color: var(--table-text);
  padding: 15px 20px;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid var(--input-border);
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
    border-bottom: 1px dashed var(--table-border);
    padding-bottom: 5px;
  }
  &:last-child {
    padding-bottom: 0;
  }
`;

export const DetailLabel = styled.span`
  color: var(--detail-label);
  font-weight: normal;
  flex: 1;
`;

export const DetailValue = styled.span<{ status?: string }>`
  color: ${({ status }) => {
    if (status === 'Não pago') return '#dc3545';
    if (status === 'Pago') return '#28a745';
    return 'var(--detail-value)';
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
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
  font-size: 16px;
  color: var(--card-text);
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

export interface StyledActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'green' | 'red' | 'secondary';
}

export const StyledActionButton = styled.button<StyledActionButtonProps>`
  background-color: ${({ variant }) => {
    switch (variant) {
      case 'green': return '#28a745';
      case 'red': return '#dc3545';
      case 'secondary': return '#cccccc';
      default: return colors.primaryBlue;
    }
  }};
  color: ${({ variant }) => (variant === 'secondary' ? '#000' : colors.white)};
  border: none;
  border-radius: 8px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  font-size: 16px;
  height: 50px;
  min-width: 150px;
  transition: background-color 0.2s;

  &:hover {
    background-color: ${({ variant }) => {
      switch (variant) {
        case 'green': return '#218838';
        case 'red': return '#c82333';
        case 'secondary': return '#d0d0d0';
        default: return '#0056b3';
      }
    }};
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
  color: var(--card-text);
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

export const PaymentModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

export const PaymentModalContent = styled.form`
  background: var(--modal-bg);
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: 15px;

  h3 {
    margin-bottom: 15px;
    color: ${colors.primaryBlue};
    text-align: center;
  }

  label {
    display: flex;
    flex-direction: column;
    font-size: 14px;
    font-weight: bold;
    color: var(--label-text);
  }

  input[type="number"], select {
    padding: 10px;
    border: 1px solid var(--input-border);
    border-radius: 5px;
    font-size: 16px;
    margin-top: 5px;
    background-color: var(--input-bg);
    color: var(--input-text);
  }

  button {
    flex: 1;
  }
`;
