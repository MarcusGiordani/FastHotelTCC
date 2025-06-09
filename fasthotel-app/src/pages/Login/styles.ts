// src/pages/Login/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

interface ContainerProps {
  backgroundType: 'primary' | 'darkened'; // Novo tipo de background
}

export const Container = styled.div<ContainerProps>`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  width: 100%;
  background-color: ${({ backgroundType }) =>
    backgroundType === 'primary' ? colors.primaryBlue : colors.darkBlueBackground}; /* Cor mais escura quando o menu abre */
  transition: background-color 0.3s ease-in-out;
  position: relative;
`;

export const Content = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  width: 100%;
  max-width: 400px;
  z-index: 1; /* Garante que o conteúdo fique acima do overlay */

  @media (max-width: 768px) {
    max-width: 90%;
    padding: 30px 15px;
  }
`;

export const LogoContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32px;

  img {
    width: 120px;
    margin-bottom: 16px;
  }

  h1 {
    color: ${colors.fastHotelBlack};
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 2px;
  }
`;

export const Title = styled.h2`
  color: ${colors.white};
  margin-bottom: 24px;
  font-size: 18px;
  text-align: center;
`;

export const Form = styled.form`
  display: flex;
  flex-direction: column;
  width: 100%;
  align-items: center;
`;

export const ForgotPasswordLink = styled.a`
  color: ${colors.white};
  text-decoration: none;
  margin-top: 16px;
  font-size: 14px;
  align-self: flex-end;

  &:hover {
    text-decoration: underline;
  }
`;

export const MenuIconContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  cursor: pointer;
  z-index: 100; /* Alto z-index para estar sempre visível */
  color: ${colors.white};
  font-size: 28px;

  @media (max-width: 768px) {
    font-size: 24px;
    top: 15px;
    right: 15px;
  }
`;

export const Overlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3); /* Escurece o fundo */
  z-index: 40; /* Abaixo do menu de contas */
  display: ${({ isOpen }) => (isOpen ? 'block' : 'none')};
`;