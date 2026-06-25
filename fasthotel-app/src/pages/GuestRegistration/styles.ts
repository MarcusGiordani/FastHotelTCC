import styled from 'styled-components';
import { colors } from '../../styles/colors';

export const RegistrationContainer = styled.div`
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
  background-color: var(--page-bg);
  color: var(--card-text);
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '220px' : '20px')};
    padding: 15px;
  }
`;

export const Header = styled.div`
  background-color: ${colors.primaryBlue};
  color: ${colors.white};
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`;

export const Title = styled.h1`
  font-size: 24px;
  color: ${colors.white};
`;

export const FormSection = styled.form`
  background-color: var(--card-bg);
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  margin-bottom: 20px;
`;

export const SectionTitle = styled.h2`
  color: ${colors.primaryBlue};
  font-size: 20px;
  margin-bottom: 25px;
  border-bottom: 2px solid ${colors.primaryBlue};
  padding-bottom: 10px;
  text-align: center;
`;

export const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px 30px;
  margin-bottom: 30px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

export const FullWidthInput = styled.div`
  grid-column: 1 / -1;
`;

export const InputWithIconContainer = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;
  width: 100%;

  & > svg:nth-of-type(1) {
    position: absolute;
    right: 15px;
    top: 50%;
    transform: translateY(calc(-50% + 10px));
    color: var(--input-placeholder);
    font-size: 18px;
    z-index: 2;
  }
  & > svg:nth-of-type(2) {
    position: absolute;
    right: 40px;
    top: 50%;
    transform: translateY(calc(-50% + 10px));
    color: var(--input-placeholder);
    font-size: 18px;
    z-index: 2;
  }
  & > div > div {
     padding-right: 60px;
  }
`;

export const SelectInput = styled.div`
  display: flex;
  flex-direction: column;
  label {
    font-size: 14px;
    color: var(--label-text);
    margin-bottom: 5px;
    font-weight: bold;
  }
  div {
    display: flex;
    align-items: center;
    gap: 5px;
    position: relative;
    height: 48px;
  }
  select {
    width: 100%;
    padding: 10px 15px;
    height: 100%;
    border-radius: 8px;
    border: 1px solid var(--input-border);
    background-color: var(--select-bg);
    font-size: 16px;
    color: var(--select-text);
    outline: none;
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='currentColor' class='bi bi-chevron-down' viewBox='0 0 16 16'%3E%3Cpath fill-rule='evenodd' d='M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 12px;
  }
  & > div > svg {
    position: absolute;
    right: 30px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--input-placeholder);
    z-index: 2;
  }
`;

export const NumberInputContainer = styled.div`
  display: flex;
  flex-direction: column;
  label {
    font-size: 14px;
    color: var(--label-text);
    margin-bottom: 5px;
    font-weight: bold;
  }
  div {
    display: flex;
    align-items: center;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    height: 48px;
    overflow: hidden;
  }
`;

export const NumberInputButton = styled.button`
  background-color: var(--num-btn-bg);
  color: var(--card-text);
  border: none;
  width: 40px;
  height: 100%;
  font-size: 20px;
  cursor: pointer;
  transition: background-color 0.2s;
  &:hover {
    background-color: #ddd;
  }
  &:first-child {
    border-top-left-radius: 8px;
    border-bottom-left-radius: 8px;
  }
  &:last-child {
    border-top-right-radius: 8px;
    border-bottom-right-radius: 8px;
  }
`;

export const NumberInput = styled.input`
  flex: 1;
  text-align: center;
  border: none;
  outline: none;
  font-size: 16px;
  color: var(--input-text);
  background-color: var(--input-bg);
  height: 100%;
  -moz-appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
`;

export const SaveButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
  button {
    max-width: 250px;
    background-color: #28a745;
    &:hover {
      background-color: #218838;
    }
  }
`;
