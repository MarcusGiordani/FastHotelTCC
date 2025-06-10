// src/pages/ChatList/index.tsx
import React, { useState } from 'react';
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
} from './styles';

// <--- ADICIONE ESTA INTERFACE
interface ChatItem {
  id: number;
  name: string;
  cpf: string;
  status: 'active' | 'inactive'; // Define que o status pode ser 'active' ou 'inactive'
}

const ChatList: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const navigate = useNavigate();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // Dados mock para os chats (agora tipados com ChatItem[])
  const chatData: ChatItem[] = [ // <--- APLIQUE A INTERFACE AQUI
    { id: 1, name: 'Orhildes Nascimento Santos', cpf: 'xxx.xxx.xxx-xx', status: 'active' },
    { id: 2, name: 'Nome :', cpf: 'CPF | xxx.xxx.xxx-xx', status: 'inactive' },
    { id: 3, name: 'Nome :', cpf: 'CPF | xxx.xxx.xxx-xx', status: 'inactive' },
    { id: 4, name: 'Nome :', cpf: 'CPF | xxx.xxx.xxx-xx', status: 'inactive' },
    { id: 5, name: 'Nome :', cpf: 'CPF | xxx.xxx.xxx-xx', status: 'inactive' },
    // Adicione mais chats conforme necessário para preencher a grade
  ];

  const handleEnterChat = (chatId: number) => {
    navigate(`/chat/online/${chatId}`);
  };

  return (
    <ChatListContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Chat de atendimentos</Title>
        </Header>

        <ChatCardsGrid>
          {chatData.map((chat) => (
            <ChatCard key={chat.id}>
              <ChatCardTitle>CHAT</ChatCardTitle>
              <ChatInfo>Nome :</ChatInfo>
              <ChatInfo>{chat.name}</ChatInfo>
              <ChatInfo>CPF | {chat.cpf}</ChatInfo>
              <ChatStatusButton
                status={chat.status} // Agora TypeScript sabe que chat.status é 'active' ou 'inactive'
                onClick={() => chat.status === 'active' && handleEnterChat(chat.id)}
              >
                {chat.status === 'active' ? 'ENTRAR CHAT' : 'INDISPONÍVEL'}
              </ChatStatusButton>
            </ChatCard>
          ))}
        </ChatCardsGrid>
      </MainContent>
    </ChatListContainer>
  );
};

export default ChatList;