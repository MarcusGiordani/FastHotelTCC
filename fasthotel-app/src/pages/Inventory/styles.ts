// src/pages/Inventory/styles.ts
// Mesmo padrão visual de Cleaning/styles.ts, Guests/styles.ts e Payments/styles.ts —
// reaproveita as variáveis de tema e a paleta já usada no FastHotel.
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const InventoryContainer = styled.div`
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
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
`;

export const Title = styled.h1`
  color: var(--card-text);
  font-size: 24px;
`;

export const PrimaryButton = styled.button`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  border: none;
  border-radius: 6px;
  padding: 10px 18px;
  font-weight: bold;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background-color: #1f5aa8;
  }
`;

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
  flex-wrap: wrap;

  span {
    color: ${colors.white};
    font-size: 14px;
    margin-left: auto;
  }

  @media (max-width: 768px) {
    justify-content: center;

    input, select {
      width: 100%;
    }

    span {
      width: 100%;
      text-align: center;
      margin-left: 0;
    }
  }
`;

export const SearchInput = styled.input`
  flex: 1;
  min-width: 160px;
  padding: 10px 15px;
  border-radius: 5px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 14px;
  outline: none;

  &::placeholder {
    color: var(--input-placeholder);
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

export const FormCard = styled.form`
  background-color: var(--card-bg);
  border: 1px solid var(--table-border);
  border-radius: 8px;
  padding: 18px 20px;
  margin-bottom: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 14px;
  align-items: end;
`;

export const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: var(--label-text, var(--card-text));
  }

  input, select {
    padding: 9px 12px;
    border-radius: 6px;
    border: 1px solid var(--input-border);
    background-color: var(--input-bg);
    color: var(--input-text);
    font-size: 14px;
    outline: none;
  }
`;

export const FormActions = styled.div`
  display: flex;
  gap: 10px;
`;

export const SecondaryButton = styled.button`
  background-color: transparent;
  color: var(--card-text);
  border: 1px solid var(--input-border);
  border-radius: 6px;
  padding: 9px 16px;
  font-size: 14px;
  cursor: pointer;
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

  th, td {
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

export const TableActionCell = styled.td`
  text-align: center;
  white-space: nowrap;
  svg {
    color: ${colors.primaryBlue};
    cursor: pointer;
    font-size: 16px;
    margin: 0 6px;
    &:hover {
      color: var(--card-text);
    }
  }
`;

export const SituacaoBadge = styled.span<{ situacao: 'sem_estoque' | 'baixo' | 'normal' | 'inativo' }>`
  display: inline-block;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: bold;
  color: ${colors.white};
  background-color: ${({ situacao }) =>
    situacao === 'sem_estoque' ? '#dc3545' : situacao === 'baixo' ? '#f59e0b' : situacao === 'inativo' ? '#9ca3af' : '#28a745'};
`;

export const MovementPanel = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

export const SmallInput = styled.input`
  padding: 6px 8px;
  border-radius: 5px;
  border: 1px solid var(--input-border);
  background-color: var(--input-bg);
  color: var(--input-text);
  font-size: 13px;
  outline: none;
  width: 90px;
`;

export const FeedbackMessage = styled.p<{ error?: boolean }>`
  color: ${({ error }) => (error ? '#dc3545' : '#28a745')};
  font-size: 14px;
  margin-bottom: 16px;
`;
