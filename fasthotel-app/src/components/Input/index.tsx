// src/components/Input/index.tsx
import React, { InputHTMLAttributes } from 'react';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { InputContainer, StyledInputWrapper, StyledInput, Label } from './styles'; // Importe os novos componentes

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: IconDefinition;
  onIconClick?: () => void;
  label?: string;
}

const Input: React.FC<InputProps> = ({ icon, onIconClick, label, ...rest }) => {
  return (
    <InputContainer> {/* Novo container para todo o input (label + campo) */}
      {label && <Label>{label}</Label>} {/* Renderiza o label se existir */}
      <StyledInputWrapper> {/* Wrapper visual do input */}
        <StyledInput {...rest} />
        {icon && <FontAwesomeIcon icon={icon} onClick={onIconClick} />}
      </StyledInputWrapper>
    </InputContainer>
  );
};

export default Input;