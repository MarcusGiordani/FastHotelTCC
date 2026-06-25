import React, { useState, useEffect } from 'react'; // Importar useEffect
import SideMenu from '../../components/SideMenu';
import { HomeContainer, MainContent } from './styles'; // Seus styled-components
// Você pode precisar de styled-components adicionais para os cards de estatísticas,
// mas vamos usar estilos inline por enquanto para demonstrar.

// Interface para os dados de resumo do dashboard
interface DashboardSummary {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  checkInsToday: number;
  checkOutsToday: number;
  guestsInHouse: number;
  pendingPayments: number;
  latestReservations: {
    id: number;
    data_checkin: string;
    data_checkout: string;
    quarto_numero: string;
    usuario_nome: string;
  }[];
}

const Home: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [summaryData, setSummaryData] = useState<DashboardSummary | null>(null); // Estado para os dados do dashboard
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState<string | null>(null); // Estado para erros

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Função para buscar os dados do dashboard da API
  useEffect(() => {
    const fetchDashboardSummary = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Você não está autenticado. Por favor, faça login.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/relatorios/dashboard-summary`, {
          method: 'GET',
          headers: {
            'x-auth-token': token,
          },
        });

        const data = await response.json();

        if (response.ok) {
          setSummaryData(data); // Atualiza o estado com os dados do dashboard
        } else {
          setError(data.message || 'Erro ao buscar dados do dashboard.');
        }
      } catch (err) {
        console.error('Erro de rede ou servidor ao buscar dashboard:', err);
        setError('Não foi possível conectar ao servidor para buscar dados do dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardSummary();
  }, []); // Efeito roda apenas uma vez ao montar o componente

  // Renderização condicional para loading e erro
  if (loading) {
    return (
      <HomeContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Carregando dados do dashboard...</p></MainContent>
      </HomeContainer>
    );
  }

  if (error) {
    return (
      <HomeContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
      </HomeContainer>
    );
  }

  return (
    <HomeContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <h1>Bem-vindo ao FastHotel!</h1>
        <p>Aqui você pode gerenciar hóspedes, reservas e pagamentos.</p>

        {summaryData && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginTop: '40px' }}>
            {/* Card: Quartos Totais */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Quartos Totais</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#007bff' }}>{summaryData.totalRooms}</p>
            </div>

            {/* Card: Quartos Disponíveis */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Disponíveis Hoje</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#28a745' }}>{summaryData.availableRooms}</p>
            </div>

            {/* Card: Quartos Ocupados */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Ocupados Hoje</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#dc3545' }}>{summaryData.occupiedRooms}</p>
            </div>

            {/* Card: Check-ins Hoje */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Check-ins Hoje</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#ffc107' }}>{summaryData.checkInsToday}</p>
            </div>

            {/* Card: Check-outs Hoje */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Check-outs Hoje</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#6c757d' }}>{summaryData.checkOutsToday}</p>
            </div>

            {/* Card: Hóspedes na Casa */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Hóspedes na Casa</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#17a2b8' }}>{summaryData.guestsInHouse}</p>
            </div>

            {/* Card: Pagamentos Pendentes */}
            <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h2>Pagamentos Pendentes</h2>
              <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#fd7e14' }}>{summaryData.pendingPayments}</p>
            </div>
          </div>
        )}

        {/* Últimas Reservas (Atividade Recente) */}
        {summaryData && summaryData.latestReservations.length > 0 && (
          <div style={{ backgroundColor: 'var(--card-bg)', color: 'var(--card-text)', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginTop: '20px' }}>
            <h2>Últimas Reservas</h2>
            <ul style={{ listStyleType: 'none', padding: 0 }}>
              {summaryData.latestReservations.map(res => (
                <li key={res.id} style={{ borderBottom: '1px solid #eee', padding: '10px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    Reserva #{res.id} - Quarto {res.quarto_numero} ({res.usuario_nome})
                  </span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {new Date(res.data_checkin).toLocaleDateString()} a {new Date(res.data_checkout).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </MainContent>
    </HomeContainer>
  );
};

export default Home;