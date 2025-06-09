import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const GuestsContainer = styled.div`
  display: flex;
  width: 100%;
  min-height: 100vh;
  background-color: ${colors.white};
`;

export const MainContent = styled.div<{ isMenuOpen: boolean }>`
  flex: 1;
  padding: 20px;
  padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '270px' : '20px')}; /* Espaço para o menu lateral */
  transition: padding-left 0.3s ease-in-out;
  background-color: ${colors.white};
  color: ${colors.black};

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
  }
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  color: ${colors.black};
  margin-bottom: 20px;
  font-size: 24px;
`;

export const ActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px; /* Espaçamento entre os elementos */
  margin-bottom: 20px;
  background-color: ${colors.primaryBlue}; /* Fundo azul da barra de ações */
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  span {
    color: ${colors.white};
    font-size: 14px;
    margin-left: auto; /* Empurra para a direita */
  }

  @media (max-width: 768px) {
    flex-wrap: wrap; /* Quebra linha em telas menores */
    justify-content: center;
    padding: 10px;

    input, select, button {
      width: 100%; /* Ocupa toda a largura em mobile */
      margin-bottom: 10px; /* Espaçamento entre eles */
    }

    span {
      width: 100%;
      text-align: center;
      margin-left: 0;
    }
  }
`;

export const ActionButton = styled.button`
  background-color: ${colors.white};
  color: ${colors.primaryBlue};
  border: none;
  border-radius: 5px;
  padding: 10px 15px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background-color 0.2s, color 0.2s;

  &:hover {
    background-color: #f0f0f0;
  }
`;

export const SearchInput = styled.input`
  flex: 1; /* Ocupa o espaço restante */
  padding: 10px 15px;
  border-radius: 5px;
  border: 1px solid ${colors.grayBorder};
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: ${colors.textLight};
  }
`;

export const FilterSelect = styled.select`
  padding: 10px 15px;
  border-radius: 5px;
  border: 1px solid ${colors.grayBorder};
  background-color: ${colors.white};
  font-size: 14px;
  color: ${colors.black};
  cursor: pointer;
  outline: none;
`;

export const TableContainer = styled.div`
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-x: auto; /* Permite scroll horizontal em telas menores */
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse; /* Remove espaçamento entre bordas de células */

  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid ${colors.lightGray};
    white-space: nowrap; /* Evita que o conteúdo quebre linha */
  }

  th {
    background-color: ${colors.lightGray};
    color: ${colors.black};
    font-weight: bold;
    font-size: 14px;
  }
`;

export const TableHeader = styled.th`
  /* Estilos específicos para o cabeçalho da tabela */
`;

export const TableRow = styled.tr<{ header?: boolean }>`
  &:nth-child(even) {
    background-color: ${colors.lightGray}; /* Fundo alternado para linhas pares */
  }

  &:hover {
    background-color: #e0f2f7; /* Um azul mais claro no hover */
  }
`;

export const TableCell = styled.td`
  color: ${colors.black};
  font-size: 14px;
`;

export const TableActionCell = styled.td`
  text-align: center;
  svg {
    color: ${colors.primaryBlue};
    cursor: pointer;
    font-size: 18px;
    &:hover {
      color: ${colors.black};
    }
  }
`;