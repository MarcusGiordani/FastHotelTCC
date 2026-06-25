import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const GuestsContainer = styled.div`
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
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
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

export const ActionsBar = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  background-color: ${colors.primaryBlue};
  padding: 15px 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);

  span {
    color: ${colors.white};
    font-size: 14px;
    margin-left: auto;
  }

  @media (max-width: 768px) {
    flex-wrap: wrap;
    justify-content: center;
    padding: 10px;

    input, select, button {
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
  flex: 1;
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

export const TableContainer = styled.div`
  background-color: var(--card-bg);
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
  svg {
    color: ${colors.primaryBlue};
    cursor: pointer;
    font-size: 18px;
    &:hover {
      color: var(--card-text);
    }
  }
`;
