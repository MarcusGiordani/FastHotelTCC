// src/pages/Settings/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'; // Ícones para claro/escuro

import {
  SettingsContainer,
  MainContent,
  Header,
  Title,
  Section,
  SectionTitle,
  ThemeOptions,
  ThemeCard,
  ThemeLabel,
  ThemeImage,
  TextOptions,
  OptionGroup,
  OptionLabel,
  SelectInput,
} from './styles';

const Settings: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark'>('light'); // Estado para o tema
  const [fontSize, setFontSize] = useState('20'); // Estado para o tamanho da fonte
  const [fontFamily, setFontFamily] = useState('Arial'); // Estado para a fonte

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleThemeChange = (theme: 'light' | 'dark') => {
    setSelectedTheme(theme);
    // Em um app real: Aqui você aplicaria a lógica para mudar o tema globalmente
    // Ex: salvar no localStorage, atualizar um contexto de tema, ou mudar uma classe no body
    alert(`Tema selecionado: ${theme === 'light' ? 'Claro' : 'Escuro'}`);
  };

  const handleFontSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFontSize(event.target.value);
    // Em um app real: Lógica para mudar o tamanho da fonte globalmente
    alert(`Tamanho da fonte: ${event.target.value}`);
  };

  const handleFontFamilyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setFontFamily(event.target.value);
    // Em um app real: Lógica para mudar a fonte globalmente
    alert(`Fonte selecionada: ${event.target.value}`);
  };

  return (
    <SettingsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Configurações</Title>
        </Header>

        <Section>
          <SectionTitle>Acessibilidade</SectionTitle>
          <ThemeOptions>
            <ThemeCard selected={selectedTheme === 'light'} onClick={() => handleThemeChange('light')}>
              {/* Imagem placeholder para o tema Claro */}
              <ThemeImage src="https://via.placeholder.com/150x100/F0F0F0/FFFFFF?text=Claro" alt="Tema Claro" />
              <ThemeLabel>Claro</ThemeLabel>
            </ThemeCard>
            <ThemeCard selected={selectedTheme === 'dark'} onClick={() => handleThemeChange('dark')}>
              {/* Imagem placeholder para o tema Escuro */}
              <ThemeImage src="https://via.placeholder.com/150x100/333333/FFFFFF?text=Escuro" alt="Tema Escuro" />
              <ThemeLabel>Escuro</ThemeLabel>
            </ThemeCard>
          </ThemeOptions>
        </Section>

        <Section>
          <SectionTitle>Tamanho e fonte das letras</SectionTitle>
          <TextOptions>
            <OptionGroup>
              <OptionLabel>Tamanho das letras</OptionLabel>
              <SelectInput value={fontSize} onChange={handleFontSizeChange}>
                <option value="16">16</option>
                <option value="18">18</option>
                <option value="20">20</option>
                <option value="22">22</option>
              </SelectInput>
            </OptionGroup>
            <OptionGroup>
              <OptionLabel>Fonte das letras</OptionLabel>
              <SelectInput value={fontFamily} onChange={handleFontFamilyChange}>
                <option value="Arial">Arial</option>
                <option value="Roboto">Roboto</option>
                <option value="Verdana">Verdana</option>
                <option value="sans-serif">Padrão</option>
              </SelectInput>
            </OptionGroup>
          </TextOptions>
        </Section>
      </MainContent>
    </SettingsContainer>
  );
};

export default Settings;