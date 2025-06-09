// src/pages/GuestRegistration/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const RegistrationContainer = styled.div`
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

export const FormSection = styled.form`
  background-color: ${colors.white};
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

export const SectionTitle = styled.h2`
  color: ${colors.primaryBlue};
  font-size: 20px;
  margin-bottom: 25px;
  border-bottom: 2px solid ${colors.primaryBlue};
  padding-bottom: 10px;
  text-align: center;
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px 30px;
  margin-bottom: 30px;

  /* Os labels agora são gerenciados pelo componente Input internamente */
  /* Removemos as regras que estavam aqui para labels */

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FullWidthInput = styled.div`
  grid-column: 1 / -1;
  /* Não precisa de margin-top aqui, o InputContainer já tem o espaçamento */
`;

// RENOMEADO para ser um container para o Input + ícones externos
export const InputWithIconContainer = styled.div`
  display: flex;
  flex-direction: column; /* Para o label do Input ficar em cima */
  position: relative; /* Para posicionar os ícones */
  width: 100%;

  /* Posiciona os ícones APÓS o componente Input (que é um div) */
  & > svg:nth-of-type(1) { /* Primeiro ícone (calendário) */
    position: absolute;
    right: 15px;
    top: 50%; /* Centraliza em relação ao input field */
    transform: translateY(calc(-50% + 10px)); /* Ajusta para descer abaixo do label */
    color: ${colors.textLight};
    font-size: 18px;
    z-index: 2; /* Garante que o ícone esteja acima do input */
  }
  & > svg:nth-of-type(2) { /* Segundo ícone (relógio) */
    position: absolute;
    right: 40px; /* Posição para o segundo ícone */
    top: 50%;
    transform: translateY(calc(-50% + 10px));
    color: ${colors.textLight};
    font-size: 18px;
    z-index: 2;
  }
  /* Ajuste o padding-right do StyledInputWrapper DENTRO DO INPUT para acomodar ícones */
  & > div > div { /* Acessa StyledInputWrapper dentro do InputContainer */
     padding-right: 60px; /* Mais padding para acomodar os 2 ícones */
  }
`;

export const SelectInput = styled.div`
  display: flex;
  flex-direction: column;
  label {
    font-size: 14px;
    color: ${colors.black};
    margin-bottom: 5px;
    font-weight: bold;
  }
  div { /* Para envolver o select e o ícone de refresh */
    display: flex;
    align-items: center;
    gap: 5px;
    position: relative; /* Para posicionar a seta padrão e o ícone de refresh */
    height: 48px; /* Mesma altura do input */
  }
  select {
    width: 100%;
    padding: 10px 15px;
    height: 100%; /* Ocupa 100% da altura do div pai */
    border-radius: 8px;
    border: 1px solid ${colors.grayBorder};
    background-color: ${colors.white};
    font-size: 16px;
    color: ${colors.black};
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 12px;
  }
  /* Posiciona o ícone de refresh ao lado do select */
  & > div > svg { /* Acessa o ícone SVG dentro do div que envolve o select */
    position: absolute; /* Torna o ícone absoluto dentro do div pai */
    right: 30px; /* Ajuste para não sobrepor a seta padrão do select */
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    z-index: 2; /* Garante que o ícone esteja acima do select */
  }
`;

export const NumberInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  label {
    font-size: 14px;
    color: ${colors.black};
    margin-bottom: 5px;
    font-weight: bold;
  }
  div {
    display: flex;
    align-items: center;
    border: 1px solid ${colors.grayBorder};
    border-radius: 8px;
    height: 48px;
    overflow: hidden;
  }
`;

export const NumberInputButton = styled.button`
  background-color: ${colors.lightGray};
  color: ${colors.black};
  border: none;
  width: 40px;
  height: 100%;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #ddd;
  }
  &:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  &:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
`;

export const NumberInput = styled.input`
  flex: 1;
  text-align: center;
  border: none;
  outline: none;
  font-size: 16px;
  color: ${colors.black};
  background-color: ${colors.white};
  height: 100%;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const SaveButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
  button {
    max-width: 250px;
    background-color: #28a745;
    &:hover {
      background-color: #218838;
    }
  }
`;