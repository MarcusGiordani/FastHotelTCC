// fasthotel-app/src/pages/ChatOnline/index.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io, { Socket } from 'socket.io-client';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faCog } from '@fortawesome/free-solid-svg-icons';

import {
  ChatOnlineContainer,
  MainContent,
  Header,
  GuestInfo,
  ChatArea,
  MessageBubble,
  MessageInputContainer,
  MessageInput,
  SendButton,
  SettingsIcon,
} from './styles'; // Seus styled-components

// Interface para tipar uma mensagem como ela vem do backend e como será exibida
interface ChatMessage {
  id: number | string; // ID pode ser number (do DB) ou string temporária (Date.now())
  conversa_id: number;
  remetente_tipo: 'usuario' | 'hospede'; // 'usuario' (recepção/admin) ou 'hospede'
  remetente_id_interno: number; // ID do remetente na tabela 'usuarios' ou 'hospedes'
  conteudo: string;
  data_envio: string; // Timestamp
  lida: boolean;
  remetente_nome?: string; // Nome populado pelo backend (JOIN)
}

// Interface para informações do usuário logado (armazenadas no localStorage)
interface UserInfo {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: string; // 'admin', 'recepcionista', 'cliente'
}

// Interface para dados da conversa (para exibir no cabeçalho)
interface ConversationInfo {
    hospede_id: number;
    hospede_nome: string;
    hospede_sobrenome: string;
    hospede_cpf: string;
    // apto: string; // Se você quiser puxar o apto aqui, precisaria de uma API que juntasse isso
}


const ChatOnline: React.FC = () => {
  const { conversaId } = useParams<{ conversaId: string }>();
  const navigate = useNavigate();

  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversationInfo, setConversationInfo] = useState<ConversationInfo | null>(null);

  const chatAreaRef = useRef<HTMLDivElement>(null); // ref no container scrollável
  const bottomRef = useRef<HTMLDivElement>(null);   // ref no sentinela do fim da lista

  const getUserInfo = (): UserInfo | null => {
    const userInfoString = localStorage.getItem('user_info');
    try {
      return userInfoString ? JSON.parse(userInfoString) : null;
    } catch (e) {
      console.error('Erro ao parsear user_info do localStorage:', e);
      return null;
    }
  };
  const userInfo = getUserInfo();

  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Efeito principal para conexão Socket.IO e busca de histórico
  useEffect(() => {
    if (!userInfo) {
      setError('Usuário não logado. Redirecionando para o login...');
      setLoading(false);
      navigate('/login');
      return;
    }
    if (!conversaId) {
      setError('ID da conversa não fornecido na URL.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Token de autenticação não encontrado. Redirecionando para o login...');
      setLoading(false);
      return;
    }

    const socketUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    const newSocket = io(socketUrl, {
      extraHeaders: {
        'x-auth-token': token
      },
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // 3. Eventos do Socket.IO
    newSocket.on('connect', () => {
      console.log('Conectado ao Socket.IO. ID:', newSocket.id);
      newSocket.emit('join_room', parseInt(conversaId));
    });

    newSocket.on('receive_message', (message: ChatMessage) => {
      console.log('Mensagem recebida:', message);
      // Ao receber a mensagem do servidor, adicione-a ao estado.
      // A dedicação da mensagem (sua ou de outro) será feita na renderização.
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    newSocket.on('disconnect', () => {
      console.log('Desconectado do Socket.IO');
    });

    newSocket.on('connect_error', (err) => {
        console.error('Erro de conexão do Socket.IO:', err.message);
        setError(`Erro ao conectar ao chat: ${err.message}. Verifique o servidor.`);
    });

    // 4. Buscar histórico de mensagens e informações da conversa via API REST
    const fetchChatData = async () => {
      try {
        // Busca histórico de mensagens
        const messagesResponse = await fetch(`${process.env.REACT_APP_API_URL}/chat/${conversaId}/mensagens`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token,
          },
        });
        const messagesData = await messagesResponse.json();
        if (messagesResponse.ok) {
          setMessages(messagesData);
        } else {
          setError(messagesData.message || 'Erro ao carregar histórico de mensagens.');
        }

        // Busca informações da conversa (para exibir no header do chat)
        const conversationsResponse = await fetch(`${process.env.REACT_APP_API_URL}/chat`, {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });
        const conversationsData = await conversationsResponse.json();
        if(conversationsResponse.ok) {
            const currentConv = conversationsData.find((conv: any) => conv.conversa_id === parseInt(conversaId));
            if (currentConv) {
                setConversationInfo({
                    hospede_id: currentConv.hospede_id,
                    hospede_nome: currentConv.hospede_nome,
                    hospede_sobrenome: currentConv.hospede_sobrenome,
                    hospede_cpf: currentConv.hospede_cpf
                });
            } else {
                setError('Conversa não encontrada na lista.');
            }
        }


      } catch (err) {
        console.error('Erro de rede ao carregar dados do chat:', err);
        setError('Não foi possível carregar o chat. Verifique sua conexão.');
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    // Limpeza: desconectar do Socket.IO ao desmontar o componente
    return () => {
      newSocket.disconnect();
    };
  }, [conversaId, navigate, userInfo?.id, userInfo?.tipo_usuario, userInfo?.nome]); // Dependências


  // Efeito para scrollar para o final quando novas mensagens chegam (ou carregam)
  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageInput.trim() === '' || !socket || !userInfo || !conversaId) return;

    // Determina o tipo de remetente com base no tipo_usuario logado
    // Se o usuário logado for admin/recepção, o remetente é 'usuario'.
    // Se o usuário logado for 'hospede' (cliente), o remetente é 'hospede'.
    const remetenteTipo: ChatMessage['remetente_tipo'] = (userInfo.tipo_usuario === 'admin' || userInfo.tipo_usuario === 'recepcionista') ? 'usuario' : 'hospede';

    const messageData = {
      conversa_id: parseInt(conversaId),
      remetente_tipo: remetenteTipo,
      remetente_id_interno: userInfo.id, // O ID do usuário/hóspede logado
      conteudo: messageInput,
    };

    socket.emit('send_message', messageData); // ENVIAR A MENSAGEM SOMENTE VIA SOCKET.IO

    setMessageInput(''); // Limpa o input
  };


  if (loading) return (
    <ChatOnlineContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}><p>Carregando chat...</p></MainContent>
    </ChatOnlineContainer>
  );

  if (error) return (
    <ChatOnlineContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
    </ChatOnlineContainer>
  );


  // Renderiza a interface do chat
  return (
    <ChatOnlineContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          {conversationInfo ? (
            <GuestInfo>
              <span>{conversationInfo.hospede_nome} {conversationInfo.hospede_sobrenome}</span>
              <span>CPF {conversationInfo.hospede_cpf}</span>
              <span>APTO [N/A]</span> {/* Este campo não está na ConversationInfo. Adapte se precisar puxar de outro lugar. */}
            </GuestInfo>
          ) : (
            <GuestInfo><span>Carregando informações da conversa...</span></GuestInfo>
          )}
        </Header>

        <ChatArea ref={chatAreaRef}>
          {messages.length === 0 && <p style={{textAlign: 'center', color: '#888'}}>Nenhuma mensagem ainda. Comece a conversar!</p>}
          {messages.map((msg) => {
            // Lógica para determinar se a mensagem é "minha" ou "do outro"
            const isMyMessage = (
              (msg.remetente_tipo === 'usuario' && (userInfo?.tipo_usuario === 'admin' || userInfo?.tipo_usuario === 'recepcionista')) &&
              msg.remetente_id_interno === userInfo?.id
            ) || (
              (msg.remetente_tipo === 'hospede' && userInfo?.tipo_usuario === 'hospede') &&
              msg.remetente_id_interno === userInfo?.id
            );

            return (
              <MessageBubble key={msg.id} sender={isMyMessage ? 'reception' : 'user'}>
                {/* Exibe o nome do remetente */}
                <p>{msg.remetente_nome || (isMyMessage ? userInfo?.nome : 'Desconhecido')}</p>
                <span>{msg.conteudo}</span>
                <span style={{ fontSize: '10px', color: '#888', marginLeft: '5px', display: 'block', textAlign: 'right' }}>
                  {new Date(msg.data_envio).toLocaleTimeString()}
                </span>
              </MessageBubble>
            );
          })}
          <div ref={bottomRef} />
        </ChatArea>

        <MessageInputContainer>
          <MessageInput
            placeholder="Digite sua mensagem..."
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSendMessage(e); }}
          />
          <SendButton onClick={handleSendMessage}>
            <FontAwesomeIcon icon={faPaperPlane} />
          </SendButton>
        </MessageInputContainer>

        <SettingsIcon>
          <FontAwesomeIcon icon={faCog} />
        </SettingsIcon>
      </MainContent>
    </ChatOnlineContainer>
  );
};

export default ChatOnline;