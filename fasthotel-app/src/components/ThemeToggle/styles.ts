import styled from 'styled-components';

interface ToggleProps {
  isDark: boolean;
}

export const ToggleContainer = styled.div<ToggleProps>`
  width: 70px;
  height: 35px;
  background: ${({ isDark }) => (isDark ? '#1e293b' : '#3b82f6')};
  border-radius: 50px;
  display: flex;
  align-items: center;
  padding: 5px;
  cursor: pointer;
  transition: all 0.3s ease;
   &:hover {
    opacity: 0.85;
  }
`;

export const Circle = styled.div<ToggleProps>`
  width: 25px;
  height: 25px;
  background: #fff;
  border-radius: 50%;
  transform: ${({ isDark }) =>
    isDark ? 'translateX(35px)' : 'translateX(0)'};
  transition: all 0.3s ease;

  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
`;