// src/pages/PaymentDetails/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import Button from '../../components/Button'; // Reutilizando o componente Button
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons'; // Ícone de engrenagem

import {
  PaymentDetailsContainer,
  MainContent,
  Header,
  Title,
  Section,
  SectionContent,
  SectionTitle,
  DetailRow,
  DetailLabel,
  DetailValue,
  TotalRow,
  FinalActions,
  PaymentOptions,
  ActionButton,
  SettingsIcon,
} from './styles';

const PaymentDetails: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Dados mock para o extrato
  const guestData = {
    nome: 'Hóspede: Bruno eduardo callegaro de jesus',
    cpf: 'CPF: xxx.xxx.xxx-xx',
    apto: 'Apartamento: 15',
    tipo: 'Tipo: Duplo cama de casal',
    pessoas: 'Número de pessoas no apartamento: 4',
    dataEntrada: 'Data de entrada: 28/03/2024',
    dataSaida: 'Data de saída: 01/04/2024',
    totalHospedagem: 'R$ 310,00',
  };

  const consumedItems = [
    { item: 'Refrigerante consumido:', quantidade: '5' },
    { item: 'Água consumida:', quantidade: '10' },
    { item: 'Suco consumido:', quantidade: '15' },
    { item: 'Serviços de quarto solicitados:', quantidade: '3' },
    { item: 'Comidas e afins:', quantidade: '3' },
  ];

  const financialSummary = {
    totalBruto: 'R$ 495,00',
    desconto: '5% (R$ 24,75)',
    valorFinal: 'R$ 470,25',
    status: 'Não pago',
  };

  const handleSelectPayment = () => {
    alert('Selecionar pagamento clicado!');
    // Lógica para abrir modal/tela de seleção de forma de pagamento
  };

  const handleFinalizeHosting = () => {
    alert('Finalizar hospedagem clicado!');
    // Lógica para finalizar a hospedagem
  };

  return (
    <PaymentDetailsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Pagamento | Extrato</Title>
        </Header>

        <Section>
          <SectionContent>
            {/* Seção de Dados do Hóspede e Reserva */}
            <DetailRow>
              <DetailLabel>{guestData.nome}</DetailLabel>
            </DetailRow>
            <DetailRow>
              <DetailLabel>{guestData.cpf}</DetailLabel>
              <DetailValue>{guestData.dataEntrada}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>{guestData.apto}</DetailLabel>
              <DetailValue>{guestData.dataSaida}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>{guestData.tipo}</DetailLabel>
            </DetailRow>
            <DetailRow>
              <DetailLabel>{guestData.pessoas}</DetailLabel>
            </DetailRow>
            <TotalRow>
              <DetailLabel>Total:</DetailLabel>
              <DetailValue>{guestData.totalHospedagem}</DetailValue>
            </TotalRow>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>Consumo e Serviços</SectionTitle>
          <SectionContent>
            {consumedItems.map((item, index) => (
              <DetailRow key={index}>
                <DetailLabel>{item.item}</DetailLabel>
                <DetailValue>{item.quantidade}</DetailValue>
              </DetailRow>
            ))}
            <TotalRow>
              <DetailLabel>Total:</DetailLabel>
              <DetailValue>R$ 185,00</DetailValue> {/* Valor fixo conforme imagem */}
            </TotalRow>
          </SectionContent>
        </Section>

        <Section>
          <SectionContent>
            {/* Resumo Financeiro */}
            <DetailRow>
              <DetailLabel>Total bruto a pagar:</DetailLabel>
              <DetailValue>{financialSummary.totalBruto}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Desconto:</DetailLabel>
              <DetailValue>{financialSummary.desconto}</DetailValue>
            </DetailRow>
            <TotalRow isFinal={true}>
              <DetailLabel>Valor final:</DetailLabel>
              <DetailValue>{financialSummary.valorFinal}</DetailValue>
            </TotalRow>
            <DetailRow>
              <DetailLabel>Status:</DetailLabel>
              <DetailValue status={financialSummary.status}>{financialSummary.status}</DetailValue>
            </DetailRow>
          </SectionContent>
        </Section>

        <PaymentOptions>
          Formas de pagamento: Pix, Crédito, Débito ou Faturado
        </PaymentOptions>

        <FinalActions>
          <ActionButton onClick={handleSelectPayment} variant="green">Selecionar pago</ActionButton>
          <ActionButton onClick={handleFinalizeHosting} variant="red">Finalizar Hospedagem</ActionButton>
        </FinalActions>

        <SettingsIcon>
          <FontAwesomeIcon icon={faCog} />
        </SettingsIcon>
      </MainContent>
    </PaymentDetailsContainer>
  );
};

export default PaymentDetails;