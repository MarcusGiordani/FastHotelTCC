import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import SideMenu from '../../components/SideMenu';
import { apiFetch } from '../../utils/api';

// Mesmo padrão responsivo usado nas demais páginas: em mobile o menu vira overlay
// (position:fixed) e o conteúdo nunca reserva espaço para ele.
const Content = styled.div<{ isMenuOpen: boolean }>`
  flex: 1;
  padding: 30px;
  padding-left: ${({ isMenuOpen }) => (isMenuOpen ? '280px' : '30px')};
  color: #fff;
  transition: padding-left 0.3s ease-in-out;

  @media (max-width: 768px) {
    padding-left: 20px;
  }
`;

interface Reservation {
  id: number;
  quarto_numero: string;
  data_checkin: string;
  data_checkout: string;
  status: string;
}

const GuestReservationsList: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    apiFetch(`/reservas?hospede_id=${id}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setReservations(data);
        else setError(data.message || 'Erro ao carregar reservas.');
      })
      .catch(() => setError('Não foi possível carregar as reservas.'))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#1a2a42' }}>
      <SideMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(v => !v)} />
      <Content isMenuOpen={isMenuOpen}>
        <h1 style={{ marginBottom: '20px' }}>Reservas do Hóspede</h1>

        {loading && <p>Carregando reservas...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}

        {!loading && !error && reservations.length === 0 && (
          <p>Nenhuma reserva encontrada para este hóspede.</p>
        )}

        {reservations.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c73d2' }}>
                <th style={thStyle}>ID</th>
                <th style={thStyle}>Quarto</th>
                <th style={thStyle}>Check-in</th>
                <th style={thStyle}>Check-out</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #2c73d2' }}>
                  <td style={tdStyle}>{r.id}</td>
                  <td style={tdStyle}>{r.quarto_numero}</td>
                  <td style={tdStyle}>{new Date(r.data_checkin).toLocaleDateString('pt-BR')}</td>
                  <td style={tdStyle}>{new Date(r.data_checkout).toLocaleDateString('pt-BR')}</td>
                  <td style={tdStyle}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button
          onClick={() => navigate('/guests')}
          style={{ marginTop: '24px', padding: '10px 20px', cursor: 'pointer', borderRadius: '6px', border: 'none', backgroundColor: '#2c73d2', color: '#fff' }}
        >
          Voltar para Hóspedes
        </button>
      </Content>
    </div>
  );
};

const thStyle: React.CSSProperties = { padding: '12px 16px', textAlign: 'left', color: '#fff' };
const tdStyle: React.CSSProperties = { padding: '10px 16px', color: '#fff' };

export default GuestReservationsList;
