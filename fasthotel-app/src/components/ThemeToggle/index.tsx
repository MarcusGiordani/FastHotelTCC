import React from 'react';
import { ToggleContainer, Circle } from './styles';

interface ThemeToggleProps {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, toggleTheme }) => {
  return (
    <ToggleContainer isDark={isDark} onClick={toggleTheme}>
      <Circle isDark={isDark}>
        {isDark ? '🌙' : '☀️'}
      </Circle>
    </ToggleContainer>
  );
};

export default ThemeToggle;