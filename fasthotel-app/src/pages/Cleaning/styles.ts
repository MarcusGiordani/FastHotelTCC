// src/pages/Cleaning/styles.ts
// Mesmo padrão visual de Guests/styles.ts e Payments/styles.ts — reaproveita as
// variáveis de tema (--card-bg, --table-*, etc.) e a paleta já usada no FastHotel.
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const CleaningContainer = styled.div`
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
  background-color: var(--card-bg);
  color: var(--card-text);

  @media (max-width: 768px) {
    /* Mobile: o menu vira overlay (position:fixed) — o conteúdo nunca reserva espaço pra ele. */
    padding-left: 20px;
  }
`;

export const Header = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  color: var(--card-text);
  margin-bottom: 20px;
  font-size: 24px;
`;

// Indicadores do dashboard — mesmo visual dos cards de resumo da Home.
export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

export const SummaryCard = styled.div<{ accent: string }>`
  background-color: var(--card-bg);
  color: var(--card-text);
  padding: 18px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  border-left: 4px solid ${({ accent }) => accent};

  h2 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--card-text);
  }

  p {
    font-size: 30px;
    font-weight: bold;
    color: ${({ accent }) => accent};
  }
`;

export const TabsBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
`;

export const TabButton = styled.button<{ active: boolean }>`
  padding: 8px 16px;
  border-radius: 6px;
  border: 1px solid ${colors.primaryBlue};
  background-color: ${({ active }) => (active ? colors.primaryBlue : 'transparent')};
  color: ${({ active }) => (active ? colors.white : colors.primaryBlue)};
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
`;

export const ActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  background-color: ${colors.primaryBlue};
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

  span {
    color: ${colors.white};
    font-size: 14px;
    margin-left: auto;
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px;

    select {
      width: 100%;
      margin-bottom: 10px;
    }

    span {
      width: 100%;
      text-align: center;
      margin-left: 0;
    }
  }
`;

export const FilterSelect = styled.select`
  padding: 10px 15px;
  border-radius: 5px;
  border: 1px solid var(--input-border);
  background-color: var(--select-bg);
  font-size: 14px;
  color: var(--select-text);
  cursor: pointer;
  outline: none;
`;

export const TableContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow-x: auto;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid var(--table-border);
    white-space: nowrap;
  }

  th {
    background-color: var(--table-header-bg);
    color: var(--table-text);
    font-weight: bold;
    font-size: 14px;
  }
`;

export const TableHeader = styled.th``;

export const TableRow = styled.tr<{ header?: boolean }>`
  &:nth-child(even) {
    background-color: var(--table-row-even);
  }

  &:hover {
    background-color: var(--table-row-hover);
  }
`;

export const TableCell = styled.td`
  color: var(--table-text);
  font-size: 14px;
`;

export const StatusBadge = styled.span<{ status: string | null }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
  color: ${colors.white};
  background-color: ${({ status }) =>
    status === 'concluida' ? '#28a745' : status === 'em_andamento' ? '#f59e0b' : status === 'pendente' ? '#dc3545' : '#9ca3af'};
`;

export const SmallSelect = styled.select`
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--input-border);
  background-color: var(--select-bg);
  color: var(--select-text);
  font-size: 13px;
  cursor: pointer;
  outline: none;
`;

export const SmallInput = styled.input`
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 13px;
  outline: none;
  width: 160px;
`;

export const FeedbackMessage = styled.p<{ error?: boolean }>`
  color: ${({ error }) => (error ? '#dc3545' : '#28a745')};
  font-size: 14px;
  margin-bottom: 16px;
`;
