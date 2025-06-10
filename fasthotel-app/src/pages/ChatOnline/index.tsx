// src/pages/ChatOnline/index.tsx
import React, { useState, useRef, useEffect } from 'react';
import SideMenu from '../../components/SideMenu';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'; // Ícone de enviar
import { faCog } from '@fortawesome/free-solid-svg-icons'; // Ícone de engrenagem

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
} from './styles';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'reception'; // 'user' para o hóspede, 'reception' para a recepção
}

const ChatOnline: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Boa noite, estou com problema no meu ar', sender: 'user' },
    { id: 2, text: 'Boa noite, estamos enviando um técnico para resolver', sender: 'reception' },
  ]);
  const [newMessage, setNewMessage] = useState('');
  const chatAreaRef = useRef<HTMLDivElement>(null); // Ref para scroll automático

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      setMessages((prevMessages) => [
        ...prevMessages,
        { id: prevMessages.length + 1, text: newMessage.trim(), sender: 'reception' }, // Simula resposta da recepção
      ]);
      setNewMessage('');
    }
  };

  // Scrolla para o final do chat quando novas mensagens chegam
  useEffect(() => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <ChatOnlineContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <GuestInfo>
            <span>ORHILDES NASCIMENTO SANTOS</span>
            <span>APTO 16</span>
            <span>CPF 122.609.804 - 34</span>
          </GuestInfo>
        </Header>

        <ChatArea ref={chatAreaRef}>
          {messages.map((msg) => (
            <MessageBubble key={msg.id} sender={msg.sender}>
              {msg.sender === 'user' && <p>Orhildes</p>} {/* Nome do remetente */}
              {msg.sender === 'reception' && <p>Recepção</p>} {/* Nome do remetente */}
              <span>{msg.text}</span>
            </MessageBubble>
          ))}
        </ChatArea>

        <MessageInputContainer>
          <MessageInput
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
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