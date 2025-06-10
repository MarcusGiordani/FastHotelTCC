// src/pages/Payments/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom'; // <--- Importe useNavigate

import {
  PaymentsContainer,
  MainContent,
  Header,
  Title,
  TableContainer,
  StyledTable,
  TableHeader,
  TableRow,
  TableCell,
  TableActionCell,
  PageIndicator,
  StatusCell,
} from './styles';

const Payments: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const navigate = useNavigate(); // <--- Inicialize useNavigate

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Dados mock para a tabela de pagamentos
  const paymentsData = [
    { id: 1, nome: 'Bruno eduardo callegaro de jesus', cpf: 'xxx.xxx.xxx-xx', apto: '15', status: 'NÃO PAGO' },
    { id: 2, nome: 'Michel liberali', cpf: 'xxx.xxx.xxx-xx', apto: '02', status: 'PAGO' },
    { id: 3, nome: 'João oliveira', cpf: 'xxx.xxx.xxx-xx', apto: '06', status: 'PAGO' },
    { id: 4, nome: 'Rodrigo fetter', cpf: 'xxx.xxx.xxx-xx', apto: '23', status: 'PAGO' },
    { id: 5, nome: 'Bruna da silva', cpf: 'xxx.xxx.xxx-xx', apto: '20', status: 'PAGO' },
  ];

  const handlePay = (id: number) => {
    // alert(`Pagar pelo hóspede ID: ${id}`);
    navigate('/payments/details'); // <--- NAVEGA PARA A TELA DE DETALHES DO PAGAMENTO
  };

  return (
    <PaymentsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Gerenciamento de Pagamentos</Title>
          <PageIndicator>1/1</PageIndicator>
        </Header>

        <TableContainer>
          <StyledTable>
            <thead>
              <TableRow header={true}>
                <TableHeader>Nome</TableHeader>
                <TableHeader>CPF</TableHeader>
                <TableHeader>Apartamento</TableHeader>
                <TableHeader>Pagar</TableHeader>
                <TableHeader>Situação</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {paymentsData.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>{payment.nome}</TableCell>
                  <TableCell>{payment.cpf}</TableCell>
                  <TableCell>{payment.apto}</TableCell>
                  <TableActionCell onClick={() => handlePay(payment.id)}> {/* <--- Adicione o onClick aqui */}
                    <FontAwesomeIcon icon={faDollarSign} />
                  </TableActionCell>
                  <StatusCell status={payment.status}>{payment.status}</StatusCell>
                </TableRow>
              ))}
              {/* Preencher linhas vazias */}
              {[...Array(10 - paymentsData.length)].map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
                </TableRow>
              ))}
            </tbody>
          </StyledTable>
        </TableContainer>
      </MainContent>
    </PaymentsContainer>
  );
};

export default Payments;