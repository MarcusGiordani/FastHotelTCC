// src/components/Input/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

// Este é o container visual do input (o campo branco com borda)
export const StyledInputWrapper = styled.div`
  display: flex;
  align-items: center;
  background: ${colors.white};
  border-radius: 8px;
  padding: 0 16px;
  width: 100%; /* Permite que ele ocupe 100% da largura do seu pai */
  height: 48px;
  border: 1px solid ${colors.grayBorder};
  position: relative; /* Para ícones posicionados absolutamente dentro */

  svg {
    margin-left: 8px; /* Espaçamento entre o texto do input e o ícone */
    color: ${colors.textLight};
    cursor: pointer;
    font-size: 18px;
  }
`;

// O elemento input em si
export const StyledInput = styled.input`
  flex: 1; /* Ocupa todo o espaço disponível no wrapper */
  background: transparent;
  border: 0;
  color: ${colors.black};
  font-size: 16px;
  outline: none;

  &::placeholder {
    color: ${colors.textLight};
  }
`;

// Estilo para o label
export const Label = styled.label`
  font-size: 14px;
  color: ${colors.black};
  margin-bottom: 5px;
  font-weight: bold;
`;

// NOVO: Container para o Input completo (label + wrapper + icons)
export const InputContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%; /* Ocupa 100% da largura do pai */

  /* Espaçamento entre múltiplos Inputs no formulário */
  & + & {
    margin-top: 16px;
  }
`;