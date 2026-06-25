// src/pages/ChatList/index.tsx
import React, { useState, useEffect } from 'react'; // Importar useEffect
import SideMenu from '../../components/SideMenu';
import { useNavigate } from 'react-router-dom';

import {
  ChatListContainer,
  MainContent,
  Header,
  Title,
  ChatCardsGrid,
  ChatCard,
  ChatCardTitle,
  ChatInfo,
  ChatStatusButton,
} from './styles'; // Seus styled-components

// Interface para os dados da conversa recebidos da API
interface Conversation {
  conversa_id: number; // ID da conversa
  hospede_id: number;
  hospede_nome: string;
  hospede_sobrenome: string;
  hospede_cpf: string;
  atendente_usuario_id: number | null;
  atendente_nome: string | null;
  status: 'aberta' | 'fechada' | 'pendente' | 'em_andamento'; // Status da conversa
  data_inicio: string;
  data_fim: string | null;
  ultima_mensagem_conteudo: string | null;
  ultima_mensagem_data: string | null;
}

const ChatList: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]); // Estado para as conversas reais
  const [loading, setLoading] = useState(true); // Estado de carregamento
  const [error, setError] = useState<string | null>(null); // Estado para erros
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Função para buscar as conversas de chat da API
  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('Você não está autenticado. Por favor, faça login.');
          setLoading(false);
          navigate('/login'); // Redireciona para o login se não houver token
          return;
        }

        const response = await fetch(`${process.env.REACT_APP_API_URL}/chat`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token, // Envia o token no cabeçalho
          },
        });

        const data = await response.json();

        if (response.ok) {
          setConversations(data); // Atualiza o estado com as conversas recebidas
        } else {
          setError(data.message || 'Erro ao buscar conversas de chat.');
        }
      } catch (err) {
        console.error('Erro de rede ou servidor ao buscar conversas:', err);
        setError('Não foi possível conectar ao servidor para buscar conversas. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchConversations();
  }, [navigate]); // navigate como dependência

  const handleEnterChat = (conversaId: number) => {
    navigate(`/chat/online/${conversaId}`); // Navega para a tela de chat online com o ID da conversa
  };

  // Renderização condicional para carregamento e erro
  if (loading) {
    return (
      <ChatListContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}>
          <p>Carregando conversas...</p>
        </MainContent>
      </ChatListContainer>
    );
  }

  if (error) {
    return (
      <ChatListContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}>
          <p style={{ color: 'red' }}>Erro: {error}</p>
        </MainContent>
      </ChatListContainer>
    );
  }

  return (
    <ChatListContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Chat de atendimentos</Title>
        </Header>

        <ChatCardsGrid>
          {conversations.length === 0 && <p style={{textAlign: 'center', width: '100%'}}>Nenhuma conversa de chat encontrada.</p>}
          {conversations.map((chat) => (
            <ChatCard key={chat.conversa_id}>
              <ChatCardTitle>CHAT</ChatCardTitle>
              <ChatInfo>Nome: {chat.hospede_nome} {chat.hospede_sobrenome}</ChatInfo>
              <ChatInfo>CPF: {chat.hospede_cpf}</ChatInfo>
              {chat.ultima_mensagem_conteudo && (
                <ChatInfo style={{fontSize: '12px', color: '#666', marginTop: '5px'}}>
                  Última: "{chat.ultima_mensagem_conteudo.substring(0, 30)}{chat.ultima_mensagem_conteudo.length > 30 ? '...' : ''}"
                </ChatInfo>
              )}
              <ChatStatusButton
                // Mapeia o status do backend para o status do botão
                status={chat.status === 'aberta' ? 'active' : 'inactive'}
                onClick={() => chat.status === 'aberta' && handleEnterChat(chat.conversa_id)}
              >
                {chat.status === 'aberta' ? 'ENTRAR CHAT' : 'INDISPONÍVEL'}
              </ChatStatusButton>
            </ChatCard>
          ))}
        </ChatCardsGrid>
      </MainContent>
    </ChatListContainer>
  );
};

export default ChatList;