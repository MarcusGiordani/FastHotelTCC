import React, { useState, useEffect } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faClipboardList, faCreditCard, faTrashAlt } from '@fortawesome/free-solid-svg-icons'; // <-- Adicionado faTrashAlt
import { useNavigate } from 'react-router-dom';

import {
  GuestsContainer,
  MainContent,
  Header,
  Title,
  ActionsBar,
  ActionButton,
  SearchInput,
  FilterSelect,
  TableContainer,
  StyledTable,
  TableHeader,
  TableRow,
  TableCell,
  TableActionCell,
} from './styles'; // Ajuste o caminho se necessário para './styles.ts'

// Interface para tipar os dados do hóspede recebidos da API
interface Guest {
  id: number;
  nome: string;
  sobrenome: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  endereco: string;
  numero: string;
  bairro: string;
  cep: string;
  cidade: string;
  estado: string;
}

const Guests: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Função para buscar os hóspedes da API
  const fetchGuests = async () => {
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

      const response = await fetch(`${process.env.REACT_APP_API_URL}/hospedes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setGuests(data);
      } else {
        setError(data.message || 'Erro ao buscar hóspedes.');
      }
    } catch (err) {
      console.error('Erro de rede ou servidor ao buscar hóspedes:', err);
      setError('Não foi possível conectar ao servidor para buscar hóspedes. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [navigate]);

  const handleRegisterGuestClick = () => {
    navigate('/guests/register');
  };

  const handleEdit = (guestId: number) => {
    navigate(`/guests/edit/${guestId}`);
    // alert(`Editar hóspede ID: ${guestId}`);
  };

  const handleViewReservations = (guestId: number) => {
    navigate(`/reservations?guestId=${guestId}`); // Exemplo: passar o ID como query param
    // alert(`Ver reservas do hóspede ID: ${guestId}`);
  };

  const handleViewPayments = (guestId: number) => {
    navigate(`/payments`); // Para a lista geral de pagamentos
    // alert(`Ver pagamentos do hóspede ID: ${guestId}`);
  };

  // NOVA FUNÇÃO PARA DELETAR HÓSPEDE
  const handleDeleteGuest = async (guestId: number) => {
    if (!window.confirm('Tem certeza que deseja DELETAR este hóspede e TODAS as suas reservas e pagamentos associados? Esta ação é irreversível!')) {
      return;
    }

    setLoading(true); // Pode ser um loading específico para delete ou global
    setError(null);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você não está autenticado. Por favor, faça login.');
        setLoading(false);
        navigate('/login');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/hospedes/${guestId}`, {
        method: 'DELETE',
        headers: {
          'x-auth-token': token,
        },
      });

      const data = await response.json();

      if (response.ok) {
        fetchGuests();
      } else {
        setError(data.message || 'Erro ao deletar hóspede.');
      }
    } catch (err) {
      console.error('Erro de rede ou servidor ao deletar hóspede:', err);
      setError('Não foi possível conectar ao servidor para deletar hóspede.');
    } finally {
      setLoading(false);
    }
  };


  // Exibe mensagens de carregamento ou erro
  if (loading) {
    return (
      <GuestsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}>
          <p>Carregando hóspedes...</p>
        </MainContent>
      </GuestsContainer>
    );
  }

  if (error) {
    return (
      <GuestsContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}>
          <p style={{ color: 'red' }}>Erro: {error}</p>
          <ActionButton onClick={handleRegisterGuestClick}>Tentar Cadastrar Hóspede</ActionButton>
        </MainContent>
      </GuestsContainer>
    );
  }

  return (
    <GuestsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Gerenciamento de Hóspedes</Title>
          <ActionsBar>
            <ActionButton onClick={handleRegisterGuestClick}>Cadastrar hóspede</ActionButton>
            <SearchInput placeholder="Pesquisar hóspede..." />
            <FilterSelect>
              <option value="nome">Filtrar por: Nome</option>
              <option value="cpf">Filtrar por: CPF</option>
            </FilterSelect>
            <span>{guests.length > 0 ? `1/${guests.length}` : '0/0'}</span>
          </ActionsBar>
        </Header>

        <TableContainer>
          <StyledTable>
            <thead>
              <TableRow header={true}>
                <TableHeader>Nome</TableHeader>
                <TableHeader>CPF</TableHeader>
                <TableHeader>Apto</TableHeader>
                <TableHeader>Editar</TableHeader>
                <TableHeader>Reserva</TableHeader>
                <TableHeader>Pagamento</TableHeader>
                <TableHeader>Deletar</TableHeader>
              </TableRow>
            </thead>
            <tbody>
              {guests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} style={{textAlign: 'center'}}>Nenhum hóspede encontrado.</TableCell> {/* Colspan ajustado */}
                </TableRow>
              )}
              {guests.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell>{guest.nome} {guest.sobrenome}</TableCell>
                  <TableCell>{guest.cpf}</TableCell>
                  <TableCell>N/A</TableCell>
                  <TableActionCell onClick={() => handleEdit(guest.id)}>
                    <FontAwesomeIcon icon={faEdit} />
                  </TableActionCell>
                  <TableActionCell onClick={() => handleViewReservations(guest.id)}>
                    <FontAwesomeIcon icon={faClipboardList} />
                  </TableActionCell>
                  <TableActionCell onClick={() => handleViewPayments(guest.id)}>
                    <FontAwesomeIcon icon={faCreditCard} />
                  </TableActionCell>
                  <TableActionCell onClick={() => handleDeleteGuest(guest.id)}>
                    <FontAwesomeIcon icon={faTrashAlt} />
                  </TableActionCell>
                </TableRow>
              ))}
              {guests.length < 10 && [...Array(10 - guests.length)].map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell>&nbsp;</TableCell>
                  <TableCell></TableCell>
                  <TableCell></TableCell>
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
    </GuestsContainer>
  );
};

export default Guests;