import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const StyledButton = styled.button`
  background: ${colors.black};
  color: ${colors.white};
  height: 48px;
  border-radius: 8px;
  border: 0;
  padding: 0 16px;
  width: 100%;
  max-width: 300px; /* Mesma largura dos inputs */
  font-weight: bold;
  font-size: 18px;
  margin-top: 24px;
  transition: background-color 0.2s;
  cursor: pointer;

  &:hover {
    background: #333;
  }
`;