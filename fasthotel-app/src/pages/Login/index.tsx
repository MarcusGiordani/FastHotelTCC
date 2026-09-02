import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { faEye, faEyeSlash, faBars } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Container,
  Content,
  LogoContainer,
  Title,
  Form,
  ForgotPasswordLink,
  MenuIconContainer,
  Overlay,
} from './styles'; // Importa os estilos do arquivo styles.ts

import Input from '../../components/Input';
import Button from '../../components/Button';
import AccountMenu from '../../components/AccountMenu';

import logo from '../../assets/logofasthotel.png';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [email, setEmail] = useState(''); // Estado para o email
  const [senha, setSenha] = useState(''); // Estado para a senha
  const [error, setError] = useState(''); // Estado para mensagens de erro da API
  const [loading, setLoading] = useState(false); // Estado para indicar que a requisição está em andamento

  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleAccountMenu = () => {
    setIsAccountMenuOpen(!isAccountMenuOpen);
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Por favor, informe o e-mail.');
      return;
    }
    if (!senha) {
      setError('Por favor, informe a senha.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), senha }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_info', JSON.stringify(data.user));
        navigate('/home');
      } else {
        setError(data.message || 'Credenciais inválidas ou problema no servidor.');
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container backgroundType={isAccountMenuOpen ? 'darkened' : 'primary'}>
      <Overlay isOpen={isAccountMenuOpen} onClick={toggleAccountMenu} />

      <MenuIconContainer onClick={toggleAccountMenu}>
        <FontAwesomeIcon icon={faBars} />
      </MenuIconContainer>

      <AccountMenu isOpen={isAccountMenuOpen} onClose={toggleAccountMenu} />

      <Content>
        <LogoContainer>
          <img src={logo} alt="FastHotel Logo" />
          <h1>FASTHOTEL</h1>
        </LogoContainer>

        <Title>Acesse sua conta por aqui</Title>

        <Form onSubmit={handleLoginSubmit}>
          <Input
            placeholder="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Senha"
            type={showPassword ? 'text' : 'password'}
            icon={showPassword ? faEye : faEyeSlash}
            onIconClick={togglePasswordVisibility}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
          />

          <ForgotPasswordLink href="#">Esqueceu a sua senha?</ForgotPasswordLink>
          <ForgotPasswordLink href="/register" style={{ marginTop: '4px', fontSize: '13px', opacity: 0.8 }}>Registrar novo usuário</ForgotPasswordLink>

          {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}

          <Button type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Login'}
          </Button>
        </Form>
      </Content>
    </Container>
  );
};

export default Login;