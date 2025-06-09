// src/pages/Guests/index.tsx
import React, { useState } from 'react';
import SideMenu from '../../components/SideMenu'; // O menu lateral
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faClipboardList, faCreditCard } from '@fortawesome/free-solid-svg-icons'; // Ícones para a tabela
import { useNavigate } from 'react-router-dom'; // <--- ADICIONE ESTA LINHA


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
} from './styles';

const Guests: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true); // Menu lateral aberto por padrão
  const navigate = useNavigate(); // <--- Esta linha agora está correta, pois useNavigate foi importado


  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Dados mock para a tabela (placeholder)
  const guestsData = [
    { id: 1, nome: 'Bruno eduardo callegaro de jesus', cpf: 'xxx.xxx.xxx-xx', apto: '15' },
    { id: 2, nome: 'Michel liberali', cpf: 'xxx.xxx.xxx-xx', apto: '02' },
    { id: 3, nome: 'João oliveira', cpf: 'xxx.xxx.xxx-xx', apto: '06' },
    { id: 4, nome: 'Rodrigo fetter', cpf: 'xxx.xxx.xxx-xx', apto: '23' },
    { id: 5, nome: 'Bruna da silva', cpf: 'xxx.xxx.xxx-xx', apto: '20' },
  ];

  const handleRegisterGuestClick = () => {
    navigate('/guests/register'); // <--- ADICIONE ESTA FUNÇÃO PARA NAVEGAR PARA A ROTA DE CADASTRO
  };

  return (
    <GuestsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Gerenciamento de Hóspedes</Title>
          <ActionsBar>
            <ActionButton onClick={handleRegisterGuestClick}>Cadastrar hóspede</ActionButton> {/* <--- CHAME A FUNÇÃO AQUI */}
            <SearchInput placeholder="Pesquisar hóspede..." />
            <FilterSelect>
              <option value="nome">Filtrar por: Nome</option>
              <option value="cpf">Filtrar por: CPF</option>
            </FilterSelect>
            {/* Indicador de página (ex: 1/1) */}
            <span>1/1</span>
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
              </TableRow>
            </thead>
            <tbody>
              {guestsData.map((guest) => (
                <TableRow key={guest.id}>
                  <TableCell>{guest.nome}</TableCell>
                  <TableCell>{guest.cpf}</TableCell>
                  <TableCell>{guest.apto}</TableCell>
                  <TableActionCell>
                    <FontAwesomeIcon icon={faEdit} />
                  </TableActionCell>
                  <TableActionCell>
                    <FontAwesomeIcon icon={faClipboardList} />
                  </TableActionCell>
                  <TableActionCell>
                    <FontAwesomeIcon icon={faCreditCard} />
                  </TableActionCell>
                </TableRow>
              ))}
              {/* Preencher linhas vazias para visualização */}
              {[...Array(10 - guestsData.length)].map((_, index) => (
                <TableRow key={`empty-${index}`}>
                  <TableCell>&nbsp;</TableCell>
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