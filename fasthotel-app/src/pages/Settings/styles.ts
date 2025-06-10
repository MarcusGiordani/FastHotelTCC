// src/pages/Settings/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const SettingsContainer = styled.div`
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
  background-color: ${colors.darkBlueBackground}; /* Fundo escuro como na imagem */
  color: ${colors.white}; /* Cor do texto no fundo escuro */
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
    padding: 15px;
  }
`;

export const Header = styled.div`
  background-color: transparent; /* Transparente para o fundo escuro */
  color: ${colors.white};
  padding: 20px 0; /* Ajuste o padding para não ter background próprio */
  margin-bottom: 20px;
  text-align: left; /* Alinha o título à esquerda */
`;

export const Title = styled.h1`
  font-size: 28px;
  color: ${colors.white};
`;

export const Section = styled.div`
  background-color: ${colors.white}; /* Fundo branco para cada seção de configurações */
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
  padding: 30px; /* Padding interno das seções */
  display: flex;
  flex-direction: column;
`;

export const SectionTitle = styled.h2`
  color: ${colors.primaryBlue};
  font-size: 22px;
  margin-bottom: 25px;
  text-align: center;
  border-bottom: 2px solid ${colors.primaryBlue};
  padding-bottom: 10px;
`;

export const ThemeOptions = styled.div`
  display: flex;
  justify-content: center; /* Centraliza os cards de tema */
  gap: 30px;
  flex-wrap: wrap; /* Quebra linha em telas menores */
`;

export const ThemeCard = styled.div<{ selected: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 15px;
  border-radius: 10px;
  border: 2px solid ${({ selected }) => (selected ? colors.primaryBlue : colors.grayBorder)};
  background-color: ${colors.white};
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  box-shadow: ${({ selected }) => (selected ? `0 0 15px rgba(${colors.primaryBlue}, 0.5)` : 'none')};

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
  }
`;

export const ThemeImage = styled.img`
  width: 150px; /* Largura da imagem do tema */
  height: 100px; /* Altura da imagem do tema */
  border-radius: 5px;
  border: 1px solid ${colors.lightGray};
`;

export const ThemeLabel = styled.span`
  font-size: 16px;
  font-weight: bold;
  color: ${colors.black};
`;

export const TextOptions = styled.div`
  display: flex;
  justify-content: center;
  gap: 50px; /* Espaçamento entre grupos de opções */
  flex-wrap: wrap;

  @media (max-width: 600px) {
    flex-direction: column;
    gap: 20px;
    align-items: center;
  }
`;

export const OptionGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center; /* Centraliza label e select */
  gap: 10px;
`;

export const OptionLabel = styled.label`
  font-size: 16px;
  color: ${colors.black};
  font-weight: bold;
`;

export const SelectInput = styled.select`
  width: 180px; /* Largura do select */
  padding: 10px 15px;
  height: 48px;
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
`;