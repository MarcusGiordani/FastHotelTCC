// src/pages/Reservations/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';

import {
  ReservationsContainer,
  MainContent,
  Header,
  Title,
  DateNavigation,
  DateControl,
  DateLabel,
  ApartmentGrid,
  ApartmentCard,
  ApartmentNumber,
  ApartmentGuest,
  ApartmentStatus,
  StatusButton,
} from './styles'; // Seus styled-components

// Interface para um quarto na resposta da API de disponibilidade diária
interface RoomDailyStatus {
    status: 'disponivel' | 'reservado' | 'ocupado';
    quarto_id: number;
    tipo: string;
    capacidade: number;
    hospede: string | null; // Nome do hospede, se houver
    numero: string; // <-- ADICIONADO AQUI: O número do quarto agora é uma propriedade
}

// Interface para os dados de disponibilidade de um dia específico
interface DailyAvailability {
    date: string; // YYYY-MM-DD
    rooms: { [numeroQuarto: string]: Omit<RoomDailyStatus, 'numero'> }; // 'rooms' mapeia número para status sem o 'numero' interno
}

const getMonthName = (monthIndex: number): string => {
    const months = [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return months[monthIndex];
};

const Reservations: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date()); // Estado principal para a data selecionada
  const [roomAvailabilityData, setRoomAvailabilityData] = useState<DailyAvailability[]>([]); // Dados do mês completo
  const [displayedRooms, setDisplayedRooms] = useState<RoomDailyStatus[]>([]); // Quartos para o dia selecionado
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Função para buscar a disponibilidade dos quartos para o mês/ano atual
  const fetchRoomAvailability = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você não está autenticado. Por favor, faça login.');
        setLoading(false);
        return;
      }

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1; // Mês é 0-indexed no JS, API espera 1-indexed

      const response = await fetch(`${process.env.REACT_APP_API_URL}/relatorios/calendario-quartos?ano=${year}&mes=${month}`, {
        method: 'GET',
        headers: {
          'x-auth-token': token,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setRoomAvailabilityData(data.availability);
      } else {
        setError(data.message || 'Erro ao buscar disponibilidade dos quartos.');
      }
    } catch (err) {
      console.error('Erro de rede ou servidor ao buscar disponibilidade:', err);
      setError('Não foi possível conectar ao servidor para buscar disponibilidade. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  }, [currentDate, /* token e api_url do env não precisam ser dependências diretas, pois são constantes */]);

  // Efeito para buscar dados quando o mês ou ano muda
  useEffect(() => {
    fetchRoomAvailability();
  }, [currentDate.getFullYear(), currentDate.getMonth(), fetchRoomAvailability]);

  // Efeito para atualizar os quartos exibidos quando a data atual ou os dados do mês mudam
  useEffect(() => {
    const currentDayFormatted = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
    const todayData = roomAvailabilityData.find(dayData => dayData.date === currentDayFormatted);

    if (todayData) {
      // Converte o objeto 'rooms' em um array, ADICIONANDO O NÚMERO DO QUARTO a cada objeto
      const roomsArray: RoomDailyStatus[] = Object.entries(todayData.rooms).map(([numero, roomStatus]) => ({
        numero: numero, // <-- ADICIONADO AQUI: a chave (número do quarto) é adicionada como propriedade
        ...roomStatus // Espalha as outras propriedades (status, quarto_id, tipo, etc.)
      }));
      setDisplayedRooms(roomsArray);
    } else {
      setDisplayedRooms([]); // Limpa se não houver dados para o dia
    }
  }, [currentDate, roomAvailabilityData]);


  // Funções de navegação de data
  const handleDayChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  const handleYearChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
    setCurrentDate(newDate);
  };

  // Renderização condicional para loading e erro
  if (loading) {
    return (
      <ReservationsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Carregando calendário de reservas...</p></MainContent>
      </ReservationsContainer>
    );
  }

  if (error) {
    return (
      <ReservationsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
      </ReservationsContainer>
    );
  }

  return (
    <ReservationsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Reservas</Title>
          <DateNavigation>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleDayChange('prev')} />
              <DateLabel>DIA: {String(currentDate.getDate()).padStart(2, '0')}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleDayChange('next')} />
            </DateControl>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleMonthChange('prev')} />
              <DateLabel>MÊS: {getMonthName(currentDate.getMonth()).toUpperCase()}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleMonthChange('next')} />
            </DateControl>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleYearChange('prev')} />
              <DateLabel>ANO: {currentDate.getFullYear()}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleYearChange('next')} />
            </DateControl>
          </DateNavigation>
        </Header>

        <ApartmentGrid>
          {displayedRooms.length === 0 && <p style={{width: '100%', textAlign: 'center'}}>Nenhum quarto encontrado ou dados de disponibilidade para este dia.</p>}
          {displayedRooms.map((room) => (
            <ApartmentCard key={room.quarto_id}>
              <ApartmentNumber>{room.numero}</ApartmentNumber> {/* Usando room.numero agora */}
              <ApartmentGuest>{room.hospede ? `Hóspede: ${room.hospede}` : 'Hóspede: ______'}</ApartmentGuest>
              <ApartmentStatus status={room.status.toUpperCase()}>
                <StatusButton status={room.status.toUpperCase()}>
                  {room.status.toUpperCase()}
                </StatusButton>
              </ApartmentStatus>
            </ApartmentCard>
          ))}
        </ApartmentGrid>
      </MainContent>
    </ReservationsContainer>
  );
};

export default Reservations;