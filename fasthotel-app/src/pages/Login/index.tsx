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
} from './styles';
import Input from '../../components/Input';
import Button from '../../components/Button';
import AccountMenu from '../../components/AccountMenu';

import logo from '../../assets/logofasthotel.png';

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleAccountMenu = () => {
    setIsAccountMenuOpen(!isAccountMenuOpen);
  };

  const handleLoginSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate('/home');
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
          {/* Apenas placeholder, sem a prop label para esta tela */}
          <Input placeholder="User" type="text" />
          <Input
            placeholder="Senha"
            type={showPassword ? 'text' : 'password'}
            icon={showPassword ? faEye : faEyeSlash}
            onIconClick={togglePasswordVisibility}
          />

          <ForgotPasswordLink href="#">Esqueceu a sua senha?</ForgotPasswordLink>

          <Button type="submit">Login</Button>
        </Form>
      </Content>
    </Container>
  );
};

export default Login;