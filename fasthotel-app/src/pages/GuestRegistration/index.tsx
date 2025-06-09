// src/pages/GuestRegistration/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import Input from '../../components/Input'; // Reutilizando o componente Input
import Button from '../../components/Button'; // Reutilizando o componente Button
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarAlt, faClock, faRedo } from '@fortawesome/free-solid-svg-icons'; // Ícones de calendário, relógio, refresh

import {
  RegistrationContainer,
  MainContent,
  Header,
  Title,
  FormSection,
  SectionTitle,
  FormGrid,
  FullWidthInput,
  SelectInput,
  NumberInputContainer,
  NumberInputButton,
  NumberInput,
  SaveButtonContainer,
  InputWithIconContainer, // Renomeado para evitar conflito e clareza
} from './styles';

const GuestRegistration: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    alert('Hóspede cadastrado! (Implementar lógica de salvamento)');
  };

  const handleNumberChange = (field: 'criancas' | 'adultos', type: 'increment' | 'decrement') => {
    alert(`Mudou ${field}: ${type}`);
  };

  return (
    <RegistrationContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Cadastro de hóspede</Title>
        </Header>

        <FormSection onSubmit={handleSave}>
          <SectionTitle>Dados pessoais</SectionTitle>
          <FormGrid>
            <Input label="Nome *" placeholder="" />
            <Input label="CPF *" placeholder="---.---.---.--" />
            <InputWithIconContainer> {/* Usando o novo container para inputs com ícones */}
              <Input label="Data de nascimento *" placeholder="__/__/____" />
              <FontAwesomeIcon icon={faCalendarAlt} />
            </InputWithIconContainer>
            <Input label="RG" placeholder="---------" />
            <FullWidthInput>
              <Input label="E-mail" placeholder="email@exemplo.com" />
            </FullWidthInput>
            <Input label="Telefone" placeholder="(--) -----.----" />
            <FullWidthInput>
              <Input label="Endereço" placeholder="" />
            </FullWidthInput>
            <Input label="Número" placeholder="" />
            <FullWidthInput>
              <Input label="Bairro" placeholder="" />
            </FullWidthInput>
            <Input label="CEP" placeholder="-----.---" />
            <FullWidthInput>
              <Input label="Cidade" placeholder="" />
            </FullWidthInput>
            <SelectInput>
              <label>Estado</label>
              <select>
                <option value="">Escolha</option>
                <option value="PR">Paraná</option>
                <option value="SP">São Paulo</option>
              </select>
            </SelectInput>
          </FormGrid>

          <SectionTitle>Dados da reserva</SectionTitle>
          <FormGrid>
            <SelectInput>
              <label>Apartamento *</label>
              <div> {/* O div interno para flex e gap */}
                <select>
                  <option value="">Selecione o apartamento</option>
                  <option value="101">101</option>
                  <option value="102">102</option>
                </select>
                <FontAwesomeIcon icon={faRedo} style={{ cursor: 'pointer', color: '#666', position: 'absolute', right: '10px' }} /> {/* Ajustado a posição */}
              </div>
            </SelectInput>
            <SelectInput>
              <label>Tipo *</label>
              <select>
                <option value="">Escolha</option>
                <option value="simples">Simples</option>
                <option value="duplo">Duplo</option>
              </select>
            </SelectInput>
            <InputWithIconContainer>
              <Input label="Data de Entrada" placeholder="__/__/____" />
              <FontAwesomeIcon icon={faCalendarAlt} />
              <FontAwesomeIcon icon={faClock} />
            </InputWithIconContainer>
            <NumberInputContainer>
              <label>Quantidade de crianças</label>
              <div>
                <NumberInputButton type="button" onClick={() => handleNumberChange('criancas', 'decrement')}>-</NumberInputButton>
                <NumberInput value={0} readOnly />
                <NumberInputButton type="button" onClick={() => handleNumberChange('criancas', 'increment')}>+</NumberInputButton>
              </div>
            </NumberInputContainer>
            <InputWithIconContainer>
              <Input label="Data da Saída" placeholder="__/__/____" />
              <FontAwesomeIcon icon={faCalendarAlt} />
              <FontAwesomeIcon icon={faClock} />
            </InputWithIconContainer>
            <NumberInputContainer>
              <label>Quantidade de adultos</label>
              <div>
                <NumberInputButton type="button" onClick={() => handleNumberChange('adultos', 'decrement')}>-</NumberInputButton>
                <NumberInput value={0} readOnly />
                <NumberInputButton type="button" onClick={() => handleNumberChange('adultos', 'increment')}>+</NumberInputButton>
              </div>
            </NumberInputContainer>
          </FormGrid>

          <SaveButtonContainer>
            <Button type="submit">Salvar</Button>
          </SaveButtonContainer>
        </FormSection>
      </MainContent>
    </RegistrationContainer>
  );
};

export default GuestRegistration;