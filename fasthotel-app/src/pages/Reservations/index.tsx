// src/pages/Reservations/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'; // Ícones de seta

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
} from './styles';

const Reservations: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [currentDay, setCurrentDay] = useState(6); // Exemplo: Dia 06
  const [currentMonth, setCurrentMonth] = useState('Abril'); // Exemplo: Mês Abril
  const [currentYear, setCurrentYear] = useState(2024); // Exemplo: Ano 2024

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Dados mock para os apartamentos
  const apartmentsData = [
    { number: '01', status: 'DISPONÍVEL', guest: '' },
    { number: '02', status: 'RESERVADO', guest: 'Hóspede MICHEL LIBERALI' },
    { number: '03', status: 'OCUPADO', guest: 'Hóspede BRUNO CALLEGARO' },
    { number: '04', status: 'DISPONÍVEL', guest: '' },
    { number: '05', status: 'DISPONÍVEL', guest: '' },
    { number: '06', status: 'DISPONÍVEL', guest: '' },
    { number: '07', status: 'DISPONÍVEL', guest: '' },
    { number: '08', status: 'DISPONÍVEL', guest: '' },
    { number: '09', status: 'DISPONÍVEL', guest: '' },
    { number: '10', status: 'DISPONÍVEL', guest: '' },
    { number: '11', status: 'DISPONÍVEL', guest: '' },
    { number: '12', status: 'RESERVADO', guest: 'Hóspede RODRIGO FETTER' },
    { number: '13', status: 'OCUPADO', guest: 'Hóspede JOÃO VICTOR' },
    { number: '14', status: 'DISPONÍVEL', guest: '' },
    { number: '15', status: 'DISPONÍVEL', guest: '' },
    { number: '16', status: 'DISPONÍVEL', guest: '' },
    { number: '17', status: 'DISPONÍVEL', guest: '' },
    { number: '18', status: 'DISPONÍVEL', guest: '' },
    { number: '19', status: 'DISPONÍVEL', guest: '' },
    { number: '20', status: 'DISPONÍVEL', guest: '' },
    { number: '21', status: 'DISPONÍVEL', guest: '' },
    { number: '22', status: 'DISPONÍVEL', guest: '' },
    { number: '23', status: 'DISPONÍVEL', guest: '' },
    // Adicione mais apartamentos até 25 ou quantos você precisar para a grade
    { number: '24', status: 'DISPONÍVEL', guest: '' },
    { number: '25', status: 'DISPONÍVEL', guest: '' },
  ];

  // Funções de navegação de data (simplificadas)
  const handleDayChange = (direction: 'prev' | 'next') => {
    // Lógica para mudar o dia
    setCurrentDay(prev => direction === 'next' ? prev + 1 : prev - 1);
  };
  const handleMonthChange = (direction: 'prev' | 'next') => {
    // Lógica para mudar o mês
    alert(`Mudar mês: ${direction}`);
  };
  const handleYearChange = (direction: 'prev' | 'next') => {
    // Lógica para mudar o ano
    alert(`Mudar ano: ${direction}`);
  };


  return (
    <ReservationsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Reservas</Title>
          <DateNavigation>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleDayChange('prev')} />
              <DateLabel>DIA: {String(currentDay).padStart(2, '0')}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleDayChange('next')} />
            </DateControl>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleMonthChange('prev')} />
              <DateLabel>MÊS: {currentMonth.toUpperCase()}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleMonthChange('next')} />
            </DateControl>
            <DateControl>
              <FontAwesomeIcon icon={faChevronLeft} onClick={() => handleYearChange('prev')} />
              <DateLabel>ANO: {currentYear}</DateLabel>
              <FontAwesomeIcon icon={faChevronRight} onClick={() => handleYearChange('next')} />
            </DateControl>
          </DateNavigation>
        </Header>

        <ApartmentGrid>
          {apartmentsData.map((apartment) => (
            <ApartmentCard key={apartment.number}>
              <ApartmentNumber>{apartment.number}</ApartmentNumber>
              <ApartmentGuest>{apartment.guest || 'Hóspede: ______'}</ApartmentGuest>
              <ApartmentStatus status={apartment.status}>
                <StatusButton status={apartment.status}>
                  {apartment.status}
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