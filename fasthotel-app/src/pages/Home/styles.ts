// src/pages/Home/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const HomeContainer = styled.div`
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
  background-color: ${colors.white};
  color: ${colors.black};

  h1 {
    margin-bottom: 20px;
    color: ${colors.black};
  }

  p {
    line-height: 1.5;
  }

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
  }
`;