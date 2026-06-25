import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const HomeContainer = styled.div`
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

  h1 {
    margin-bottom: 20px;
    color: var(--card-text);
  }

  p {
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
  }
`;