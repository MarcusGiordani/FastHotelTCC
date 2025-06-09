import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const PaymentsContainer = styled.div`
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

export const Title = styled.h1`
  font-size: 24px;
  color: ${colors.white};
`;

export const PageIndicator = styled.span`
  color: ${colors.white};
  font-size: 14px;
  @media (max-width: 768px) {
    margin-top: 10px;
  }
`;

export const TableContainer = styled.div`
  background-color: ${colors.white};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th, td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid ${colors.lightGray};
    white-space: nowrap;
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
    background-color: ${colors.lightGray};
  }

  &:hover {
    background-color: #e0f2f7;
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

export const StatusCell = styled.td<{ status: string }>`
  text-align: center;
  font-weight: bold;
  color: ${({ status }) => (status === 'PAGO' ? '#28a745' : '#dc3545')}; /* Verde para pago, vermelho para não pago */
`;