import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import ThemeToggle from '../../components/ThemeToggle';
import { useTheme } from '../../contexts/ThemeContext';
import { apiFetch } from '../../utils/api';

import {
  SettingsContainer,
  MainContent,
  Header,
  Title,
  Section,
  SectionTitle,
  TextOptions,
  OptionGroup,
  OptionLabel,
  SelectInput,
} from './styles';

const Settings: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const { isDark, toggleTheme } = useTheme();

  const [fontSize, setFontSize] = useState('20');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [savedMessage, setSavedMessage] = useState('');
  const [savedColor, setSavedColor] = useState('#4caf50');

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const showMsg = (msg: string, isError = false) => {
    setSavedColor(isError ? '#ef4444' : '#4caf50');
    setSavedMessage(msg);
    setTimeout(() => setSavedMessage(''), 3000);
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontSize(e.target.value);
    document.documentElement.style.fontSize = `${e.target.value}px`;
    showMsg(`Tamanho da fonte: ${e.target.value}px`);
  };

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFontFamily(e.target.value);
    document.documentElement.style.fontFamily = e.target.value;
    showMsg(`Fonte alterada para ${e.target.value}.`);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 3) { showMsg('A nova senha deve ter pelo menos 3 caracteres.', true); return; }
    if (novaSenha !== confirmarSenha) { showMsg('As senhas não coincidem.', true); return; }

    setPwLoading(true);
    try {
      const res = await apiFetch('/usuarios/change-password', {
        method: 'PUT',
        body: JSON.stringify({ senhaAtual, novaSenha }),
      });
      const data = await res.json();
      if (res.ok) {
        showMsg('Senha alterada com sucesso!');
        setSenhaAtual(''); setNovaSenha(''); setConfirmarSenha('');
      } else {
        showMsg(data.message || 'Erro ao alterar senha.', true);
      }
    } catch {
      showMsg('Não foi possível conectar ao servidor.', true);
    } finally {
      setPwLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1.5px solid var(--input-border, #d1d5db)',
    background: 'var(--input-bg, #fff)',
    color: 'var(--input-text, #1f2937)',
    fontSize: '15px',
    outline: 'none',
    marginTop: '4px',
  };

  return (
    <SettingsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(v => !v)} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Configurações</Title>
          {savedMessage && (
            <p style={{ color: savedColor, fontSize: '14px', marginTop: '8px' }}>{savedMessage}</p>
          )}
        </Header>

        {/* Tema */}
        <Section className="dm-card">
          <OptionGroup>
            <OptionLabel>Tema</OptionLabel>
            <ThemeToggle isDark={isDark} toggleTheme={toggleTheme} />
          </OptionGroup>
        </Section>

        {/* Fonte */}
        <Section className="dm-card">
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

        {/* Alterar senha */}
        <Section className="dm-card">
          <SectionTitle>Alterar Senha</SectionTitle>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px', margin: '0 auto' }}>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label-text, #374151)' }}>Senha atual</label>
              <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label-text, #374151)' }}>Nova senha</label>
              <input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--label-text, #374151)' }}>Confirmar nova senha</label>
              <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required style={inputStyle} />
            </div>
            <button
              type="submit"
              disabled={pwLoading}
              style={{ padding: '11px', borderRadius: '8px', border: 'none', background: '#2c73d2', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.7 : 1 }}
            >
              {pwLoading ? 'Salvando...' : 'Alterar senha'}
            </button>
          </form>
        </Section>
      </MainContent>
    </SettingsContainer>
  );
};

export default Settings;
