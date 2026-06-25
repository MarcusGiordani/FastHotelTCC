// src/pages/Payments/index.tsx
import React, { useState, useEffect } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDollarSign } from '@fortawesome/free-solid-svg-icons';
import { useNavigate, useLocation } from 'react-router-dom';

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
} from './styles'; // Seus styled-components

// Interface para os dados de resumo de pagamento por reserva recebidos da API
interface ReservationPaymentSummary {
  reserva_id: number;
  usuario_nome: string;
  usuario_email: string;
  quarto_numero: string;
  status_reserva: string;
  total_diarias: number;
  total_consumo: number;
  total_bruto_a_pagar: number;
  desconto_percentual: number;
  valor_final_com_desconto: number;
  total_pago: number;
  status_pagamento_geral: string; // Ex: 'Pago', 'Não Pago', 'Parcialmente Pago'
  data_checkin: string;
  data_checkout: string;
}

const Payments: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [summaries, setSummaries] = useState<ReservationPaymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Função para buscar os resumos de pagamento da API
  useEffect(() => {
    const fetchPaymentSummaries = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Você não está autenticado. Por favor, faça login.');
          setLoading(false);
          navigate('/login');
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/pagamentos/resumos-reservas`, {
          method: 'GET',
          headers: {
            'x-auth-token': token,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setSummaries(data);
        } else {
          setError(data.message || 'Erro ao buscar resumos de pagamentos.');
        }
      } catch (err) {
        console.error('Erro de rede ou servidor ao buscar resumos de pagamentos:', err);
        setError('Não foi possível conectar ao servidor para buscar pagamentos. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchPaymentSummaries();
  }, [navigate, location.pathname]);

  const handlePay = (reservaId: number) => {
    navigate(`/payments/details/${reservaId}`);
  };

  // Renderização condicional para loading e erro
  if (loading) {
    return (
      <PaymentsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Carregando resumos de pagamentos...</p></MainContent>
      </PaymentsContainer>
    );
  }

  if (error) {
    return (
      <PaymentsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
      </PaymentsContainer>
    );
  }

  return (
    <PaymentsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Gerenciamento de Pagamentos</Title>
          <PageIndicator>1/{summaries.length > 0 ? summaries.length : 0}</PageIndicator>
        </Header>

        <TableContainer>
          <StyledTable>
            <thead>
              <TableRow header={true}>
                <TableHeader>Nome</TableHeader>
                <TableHeader>CPF</TableHeader>
                <TableHeader>Apartamento</TableHeader>
                <TableHeader>Situação</TableHeader> {/* <-- ORDEM INVERTIDA AQUI */}
                <TableHeader>Pagar</TableHeader>     {/* <-- ORDEM INVERTIDA AQUI */}
              </TableRow>
            </thead>
            <tbody>
              {summaries.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} style={{textAlign: 'center'}}>Nenhum pagamento encontrado para reservas ativas.</TableCell>
                </TableRow>
              )}
              {summaries.map((summary) => (
                <TableRow key={summary.reserva_id}>
                  <TableCell>{summary.usuario_nome}</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableCell>{summary.quarto_numero}</TableCell>
                  <StatusCell status={summary.status_pagamento_geral.toUpperCase()}> {/* <-- ORDEM INVERTIDA AQUI */}
                    {summary.status_pagamento_geral.toUpperCase()}
                  </StatusCell>
                  <TableActionCell onClick={() => handlePay(summary.reserva_id)}> {/* <-- ORDEM INVERTIDA AQUI */}
                    <FontAwesomeIcon icon={faDollarSign} />
                  </TableActionCell>
                </TableRow>
              ))}
              {/* Preencher linhas vazias para visualização se houver menos de 10 resumos */}
              {summaries.length < 10 && [...Array(10 - summaries.length)].map((_, index) => (
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