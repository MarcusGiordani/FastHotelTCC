import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideMenu from '../../components/SideMenu';
import Button from '../../components/Button';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCog } from '@fortawesome/free-solid-svg-icons';

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
  StyledActionButton, // <- StyledActionButton é do styles.ts deste componente e aceita 'variant'
  SettingsIcon,
  // IMPORTS DO STYLES.TS PARA O MODAL
  PaymentModalOverlay,
  PaymentModalContent
} from './styles'; // Importa TUDO dos estilos de styles.ts


// Interfaces para tipar os dados do extrato recebidos da API (manter as mesmas)
interface ReservaInfo {
  id: number;
  data_entrada: string;
  data_saida: string;
  total_diarias: number;
  hospede_principal_nome: string;
  hospede_principal_email: string;
}

interface QuartoInfo {
  numero: string;
  tipo: string;
  capacidade: number;
  preco_por_noite: number;
}

interface ConsumoItem {
  id: number;
  servico_nome: string;
  descricao: string;
  quantidade: number;
  preco_unitario: number;
  subtotal_item: number;
}

interface PagamentoRealizado {
  id: number;
  valor_pago: number;
  data_pagamento: string;
  metodo_pagamento: string;
  status_pagamento: string;
}

interface PaymentExtractData {
  reserva: ReservaInfo;
  quarto: QuartoInfo;
  consumos: ConsumoItem[];
  total_consumo: number;
  total_bruto_a_pagar: number;
  desconto_percentual: number;
  valor_final_com_desconto: number;
  pagamentos_realizados: PagamentoRealizado[];
  status_pagamento_geral: string;
}


const PaymentDetails: React.FC = () => {
  const { reservaId } = useParams<{ reservaId: string }>();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [extractData, setExtractData] = useState<PaymentExtractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // ESTADOS PARA O MODAL DE PAGAMENTO
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmountInput, setPaymentAmountInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('PIX');
  const [paymentModalMessage, setPaymentModalMessage] = useState('');
  const [paymentModalError, setPaymentModalError] = useState('');
  const [isRegisteringPayment, setIsRegisteringPayment] = useState(false);


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para buscar os dados do extrato da API (agora passível de ser chamada novamente)
  const fetchPaymentExtract = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!reservaId) {
      setError('ID da reserva não fornecido na URL.');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você não está autenticado. Por favor, faça login.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/pagamentos/extrato/${reservaId}`, {
        method: 'GET',
        headers: {
          'x-auth-token': token,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setExtractData(data);
        if (data.valor_final_com_desconto > 0) {
            setPaymentAmountInput(data.valor_final_com_desconto.toFixed(2));
        }
      } else {
        setError(data.message || 'Erro ao buscar detalhes do pagamento.');
      }
    } catch (err) {
      console.error('Erro de rede ou servidor ao buscar extrato:', err);
      setError('Não foi possível conectar ao servidor. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [reservaId, navigate]);

  useEffect(() => {
    fetchPaymentExtract();
  }, [fetchPaymentExtract]);


  // Lógica para os botões (agora reais)
  const handleSelectPayment = () => {
    setShowPaymentModal(true); // Abre o modal
    setPaymentModalMessage('');
    setPaymentModalError('');
  };

  // NOVO: Função para registrar o pagamento do modal
  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegisteringPayment(true);
    setPaymentModalMessage('');
    setPaymentModalError('');

    if (!paymentAmountInput || parseFloat(paymentAmountInput) <= 0) {
        setPaymentModalError('Informe um valor de pagamento válido.');
        setIsRegisteringPayment(false);
        return;
    }
    if (!paymentMethodInput) {
        setPaymentModalError('Selecione um método de pagamento.');
        setIsRegisteringPayment(false);
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token || !reservaId) {
            setPaymentModalError('Autenticação ou ID da reserva ausente.');
            setIsRegisteringPayment(false);
            navigate('/login');
            return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/pagamentos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token,
            },
            body: JSON.stringify({
                reserva_id: parseInt(reservaId),
                valor_pago: parseFloat(paymentAmountInput),
                metodo_pagamento: paymentMethodInput,
                status_pagamento: 'aprovado' // Este é o status da transação individual
            }),
        });

        const data = await response.json();

        if (response.ok) {
            setPaymentModalMessage('Pagamento registrado com sucesso!');
            setPaymentAmountInput(''); // Limpa o campo
            setPaymentMethodInput('PIX'); // Reseta o método
            await fetchPaymentExtract(); // Recarrega os dados do extrato para mostrar o novo pagamento
            setTimeout(() => setShowPaymentModal(false), 1500); // Fecha modal após um tempo
        } else {
            setPaymentModalError(data.message || 'Erro ao registrar pagamento.');
        }
    } catch (error) {
        console.error('Erro de rede ao registrar pagamento:', error);
        setPaymentModalError('Não foi possível conectar ao servidor para registrar pagamento.');
    } finally {
        setIsRegisteringPayment(false);
    }
  };


  const handleFinalizeHosting = async () => {
    setIsFinalizing(true);
    if (!reservaId) {
        alert('ID da reserva não disponível para finalizar.');
        setIsFinalizing(false);
        return;
    }

    try {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Você não está autenticado. Por favor, faça login.');
            setIsFinalizing(false);
            navigate('/login');
            return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/reservas/${reservaId}/finalizar`, {
            method: 'PUT',
            headers: {
                'x-auth-token': token,
            },
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message || 'Hospedagem finalizada com sucesso!');
            navigate('/payments'); // Redireciona para a lista de pagamentos
        } else {
            alert(data.message || 'Erro ao finalizar hospedagem. Verifique se a reserva está ativa.');
        }
    } catch (error) {
        console.error('Erro de rede ou servidor ao finalizar hospedagem:', error);
        alert('Não foi possível conectar ao servidor para finalizar hospedagem. Tente novamente mais tarde.');
    } finally {
        setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <PaymentDetailsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Carregando extrato de pagamento...</p></MainContent>
      </PaymentDetailsContainer>
    );
  }

  if (error) {
    return (
      <PaymentDetailsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
      </PaymentDetailsContainer>
    );
  }

  if (!extractData) {
    return (
      <PaymentDetailsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Dados do extrato não encontrados.</p></MainContent>
      </PaymentDetailsContainer>
    );
  }

  return (
    <PaymentDetailsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Pagamento | Extrato</Title>
        </Header>

        <Section>
          <SectionContent>
            <DetailRow>
              <DetailLabel>Hóspede: {extractData.reserva.hospede_principal_nome}</DetailLabel>
            </DetailRow>
            <DetailRow>
              <DetailLabel>E-mail: {extractData.reserva.hospede_principal_email}</DetailLabel>
              <DetailValue>Data de entrada: {formatDate(extractData.reserva.data_entrada)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Apartamento: {extractData.quarto.numero}</DetailLabel>
              <DetailValue>Data de saída: {formatDate(extractData.reserva.data_saida)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Tipo: {extractData.quarto.tipo}</DetailLabel>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Capacidade do apto: {extractData.quarto.capacidade} pessoas</DetailLabel>
            </DetailRow>
            <TotalRow>
              <DetailLabel>Total Hospedagem:</DetailLabel>
              <DetailValue>{formatCurrency(extractData.reserva.total_diarias)}</DetailValue>
            </TotalRow>
          </SectionContent>
        </Section>

        <Section>
          <SectionTitle>Consumo e Serviços</SectionTitle>
          <SectionContent>
            {extractData.consumos.length === 0 && <DetailRow><DetailLabel>Nenhum consumo registrado.</DetailLabel></DetailRow>}
            {extractData.consumos.map((item) => (
              <DetailRow key={item.id}>
                <DetailLabel>{item.servico_nome} ({item.quantidade}x):</DetailLabel>
                <DetailValue>{formatCurrency(item.subtotal_item)}</DetailValue>
              </DetailRow>
            ))}
            <TotalRow>
              <DetailLabel>Total Consumo:</DetailLabel>
              <DetailValue>{formatCurrency(extractData.total_consumo)}</DetailValue>
            </TotalRow>
          </SectionContent>
        </Section>

        <Section>
          <SectionContent>
            <DetailRow>
              <DetailLabel>Total bruto a pagar:</DetailLabel>
              <DetailValue>{formatCurrency(extractData.total_bruto_a_pagar)}</DetailValue>
            </DetailRow>
            <DetailRow>
              <DetailLabel>Desconto:</DetailLabel>
              <DetailValue>{extractData.desconto_percentual}% ({formatCurrency(extractData.total_bruto_a_pagar - extractData.valor_final_com_desconto)})</DetailValue>
            </DetailRow>
            <TotalRow isFinal={true}>
              <DetailLabel>Valor final:</DetailLabel>
              <DetailValue>{formatCurrency(extractData.valor_final_com_desconto)}</DetailValue>
            </TotalRow>
            <DetailRow>
              <DetailLabel>Status:</DetailLabel>
              <DetailValue status={extractData.status_pagamento_geral}>{extractData.status_pagamento_geral}</DetailValue>
            </DetailRow>
          </SectionContent>
        </Section>

        <PaymentOptions>
          Formas de pagamento: Pix, Crédito, Débito ou Faturado
          {extractData.pagamentos_realizados.length > 0 && (
            <div style={{ marginTop: '15px', borderTop: '1px dashed #eee', paddingTop: '10px' }}>
                <p style={{fontWeight: 'bold', marginBottom: '5px'}}>Pagamentos Registrados:</p>
                {extractData.pagamentos_realizados.map(p => (
                    <DetailRow key={p.id} style={{fontSize: '14px'}}>
                        <DetailLabel>{formatCurrency(p.valor_pago)} ({p.metodo_pagamento})</DetailLabel>
                        <DetailValue>{formatDate(p.data_pagamento)} - {p.status_pagamento.toUpperCase()}</DetailValue>
                    </DetailRow>
                ))}
            </div>
          )}
        </PaymentOptions>

        <FinalActions>
          <StyledActionButton onClick={handleSelectPayment} variant="green" disabled={isProcessingPayment}>
            {isProcessingPayment ? 'Processando...' : 'Selecionar pago'}
          </StyledActionButton>
          <StyledActionButton onClick={handleFinalizeHosting} variant="red" disabled={isFinalizing}>
            {isFinalizing ? 'Finalizando...' : 'Finalizar Hospedagem'}
          </StyledActionButton>
        </FinalActions>

        <SettingsIcon>
          <FontAwesomeIcon icon={faCog} />
        </SettingsIcon>
      </MainContent>

      {/* NOVO: MODAL DE REGISTRO DE PAGAMENTO */}
      {showPaymentModal && (
        <PaymentModalOverlay>
          <PaymentModalContent onSubmit={handleRegisterPayment}>
            <h3>Registrar Novo Pagamento</h3>
            <label>
              Valor Pago:
              <input
                type="number"
                step="0.01"
                value={paymentAmountInput}
                onChange={(e) => setPaymentAmountInput(e.target.value)}
                required
              />
            </label>
            <label>
              Método de Pagamento:
              <select value={paymentMethodInput} onChange={(e) => setPaymentMethodInput(e.target.value)} required>
                <option value="PIX">PIX</option>
                <option value="Credito">Cartão de Crédito</option>
                <option value="Debito">Cartão de Débito</option>
                <option value="Dinheiro">Dinheiro</option>
                <option value="Faturado">Faturado</option>
              </select>
            </label>
            {paymentModalError && <p style={{ color: 'red', fontSize: '14px' }}>{paymentModalError}</p>}
            {paymentModalMessage && <p style={{ color: 'green', fontSize: '14px' }}>{paymentModalMessage}</p>}
            <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: '20px' }}>
              <Button type="submit" disabled={isRegisteringPayment}>
                {isRegisteringPayment ? 'Registrando...' : 'Registrar'}
              </Button>
              <Button type="button" onClick={() => setShowPaymentModal(false)}>
                Cancelar
              </Button>
            </div>
          </PaymentModalContent>
        </PaymentModalOverlay>
      )}

    </PaymentDetailsContainer>
  );
};

export default PaymentDetails;  