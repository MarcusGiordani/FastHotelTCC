// src/components/SideMenu/styles.ts
import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const MenuContainer = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: ${({ isOpen }) => (isOpen ? '0' : '-250px')};
  width: 250px;
  height: 100%;
  background-color: ${colors.primaryBlue};
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.2);
  transition: left 0.3s ease-in-out;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  z-index: 10;

  @media (max-width: 768px) {
    width: 200px;
    left: ${({ isOpen }) => (isOpen ? '0' : '-200px')};
  }
`;

export const LogoSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 20px 30px;
  margin-top: 20px;

  img {
    width: 80px;
    margin-bottom: 10px;
  }
`;

export const MenuTitle = styled.h2`
  color: ${colors.white};
  font-size: 18px;
  font-weight: bold;
`;

export const MenuItem = styled.a<{ active?: boolean }>`
  display: flex;
  align-items: center;
  padding: 15px 20px;
  color: ${({ active }) => (active ? colors.black : colors.white)};
  background-color: ${({ active }) => (active ? colors.white : 'transparent')};
  text-decoration: none;
  font-size: 16px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 0 50px 50px 0;

  &:hover {
    background-color: ${colors.white};
    color: ${colors.black};
  }

  svg {
    margin-right: 15px;
    font-size: 20px;
  }
`;

export const MenuToggleIcon = styled.div`
  position: absolute;
  top: 20px;
  right: -50px;
  color: ${colors.black};
  font-size: 24px;
  cursor: pointer;
  z-index: 11;
  display: none;

  @media (max-width: 768px) {
    display: block;
  }
`;