import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SideMenu from '../../components/SideMenu';
import Input from '../../components/Input';
import Button from '../../components/Button'; // <-- CAMINHO CORRIGIDO AQUI: "../../components/Button"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRedo } from '@fortawesome/free-solid-svg-icons';
import DatePickerField from '../../components/DatePickerField';

import {
  RegistrationContainer,
  MainContent,
  Header,
  Title,
  FormSection,
  SectionTitle,
  FormGrid,
  FullWidthInput,
  SelectInput,
  NumberInputContainer,
  NumberInputButton,
  NumberInput,
  SaveButtonContainer,
} from './styles';

// Interface para informações do usuário logado (do localStorage)
interface UserInfo {
  id: number;
  nome: string;
  email: string;
  tipo_usuario: string; // admin, recepcionista, cliente
}

// Interface para dados do hóspede (do backend)
interface GuestDataFromBackend {
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

// Interface para uma resposta de erro da API (para tipagem mais precisa)
interface ApiErrorResponse {
  message?: string; // Mensagem de erro geral
  errors?: { msg: string; param: string }[]; // Para erros de validação (express-validator)
}


const GuestRegistration: React.FC = () => {
  const { id } = useParams<{ id: string }>(); // Pega o ID da URL se estiver em modo de edição
  const navigate = useNavigate();

  // --- NOVA INTERFACE PARA OS QUARTARTOS ---
  interface Room {
    id: number;
    numero: string;
    tipo: string;
    status: string;
  }

  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    cpf: '',
    rg: '',
    data_nascimento: '', // Formato Watanabe-MM-DD
    email: '',
    telefone: '',
    endereco: '',
    numero: '',
    bairro: '',
    cep: '',
    cidade: '',
    estado: '',
    apartamento: '', // Corresponder ao quarto_id para reserva
    tipoQuarto: '', // Tipo do quarto (para exibição no form)
    data_checkin: '', // Formato Watanabe-MM-DD
    data_checkout: '', // Formato Watanabe-MM-DD
    quantidade_criancas: 0,
    quantidade_adultos: 0,
  });
  const [loading, setLoading] = useState(true); // Inicialmente true para carregar dados em edição
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isEditMode, setIsEditMode] = useState(false); // para controlar modo de edição

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  // --- NOVOS ESTADOS PARA A LISTA DE QUARTOS E CARREGAMENTO ---
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  const getUserInfo = (): UserInfo | null => {
    const userInfoString = localStorage.getItem('user_info');
    return userInfoString ? JSON.parse(userInfoString) : null;
  };
  const userInfo = getUserInfo();

  // --- EFEITO PARA BUSCAR OS QUARTOS DISPONÍVEIS DA API ---
  useEffect(() => {
    const fetchAvailableRooms = async () => {
      setRoomsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL}/quartos?status=disponivel`, {
          headers: {
            'x-auth-token': token || '' // Usando o header que seu código já utiliza
          }
        });
        if (!response.ok) {
          throw new Error('Falha ao buscar quartos disponíveis.');
        }
        const data: Room[] = await response.json();
        setAvailableRooms(data);
      } catch (err) {
        if (err instanceof Error) {
          console.error("Erro ao buscar quartos:", err);
          setError('Não foi possível carregar a lista de apartamentos: ' + err.message);
        }
      } finally {
        setRoomsLoading(false);
      }
    };

    // Apenas busca os quartos se não estiver em modo de edição
    if (!id) {
      fetchAvailableRooms();
    }
  }, [id]);

  // Efeito para carregar dados do hóspede em modo de edição
  useEffect(() => {
    if (id) {
      setIsEditMode(true);
      const fetchGuestData = async () => {
        setLoading(true);
        setError('');
        try {
          const token = localStorage.getItem('token');
          if (!token) {
            setError('Você não está autenticado. Por favor, faça login.');
            setLoading(false);
            navigate('/login');
            return;
          }
          const response = await fetch(`${process.env.REACT_APP_API_URL}/hospedes/${id}`, {
            headers: { 'x-auth-token': token }
          });

          const data: GuestDataFromBackend | ApiErrorResponse = await response.json();

          if (response.ok) {
            const guestData = data as GuestDataFromBackend; // Confirma tipagem para sucesso
            setFormData(prevFormData => ({ // Usar prevFormData para não perder campos de reserva
              ...prevFormData,
              nome: guestData.nome,
              sobrenome: guestData.sobrenome || '',
              cpf: guestData.cpf,
              rg: guestData.rg || '',
              data_nascimento: guestData.data_nascimento ? new Date(guestData.data_nascimento).toISOString().split('T')[0] : '',
              email: guestData.email || '',
              telefone: guestData.telefone || '',
              endereco: guestData.endereco || '',
              numero: guestData.numero || '',
              bairro: guestData.bairro || '',
              cep: guestData.cep || '',
              cidade: guestData.cidade || '',
              estado: guestData.estado || '',
            }));
          } else {
            const errorData = data as ApiErrorResponse;
            setError(errorData.message || 'Erro ao carregar dados do hóspede.');
          }
        } catch (err) {
          console.error('Erro de rede ao carregar hóspede:', err);
          setError('Não foi possível conectar ao servidor para carregar hóspede.');
        } finally {
          setLoading(false);
        }
      };
      fetchGuestData();
    } else {
      setIsEditMode(false);
      setLoading(false); // Se não for edição, já está pronto
    }
  }, [id, navigate]);


  const validateField = (name: string, value: string | number): string => {
    switch (name) {
      case 'nome':
        if (!value.toString().trim()) return 'Nome é obrigatório.';
        if (value.toString().trim().length < 3) return 'Nome deve ter pelo menos 3 caracteres.';
        break;
      case 'cpf':
        if (!value.toString().trim()) return 'CPF é obrigatório.';
        if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(value.toString().trim())) return 'CPF inválido (formato: 000.000.000-00).';
        break;
      case 'data_nascimento': {
        if (!value) return 'Data de nascimento é obrigatória.';
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
        if (value.toString() > todayStr) return 'Data de nascimento não pode ser futura.';
        break;
      }
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString().trim())) return 'E-mail inválido.';
        break;
      case 'apartamento':
        if (!isEditMode && !value.toString().trim()) return 'Apartamento é obrigatório para nova reserva.';
        break;
      case 'tipoQuarto':
        if (!isEditMode && !value.toString().trim()) return 'Tipo de quarto é obrigatório para nova reserva.';
        break;
      case 'data_checkin': {
        if (!value) return 'Data de entrada é obrigatória.';
        const today2 = new Date();
        const todayStr2 = `${today2.getFullYear()}-${String(today2.getMonth()+1).padStart(2,'0')}-${String(today2.getDate()).padStart(2,'0')}`;
        if (value.toString() < todayStr2) return 'Data de entrada não pode ser anterior a hoje.';
        break;
      }
      case 'data_checkout':
        if (!value) return 'Data de saída é obrigatória.';
        if (formData.data_checkin && value.toString() <= formData.data_checkin) return 'Data de saída deve ser posterior à de entrada.';
        break;
      case 'quantidade_adultos':
        if (!isEditMode && (value === 0 && formData.quantidade_criancas === 0)) return 'Deve haver pelo menos 1 adulto ou criança.';
        break;
      case 'quantidade_criancas':
        if (!isEditMode && (value === 0 && formData.quantidade_adultos === 0)) return 'Deve haver pelo menos 1 adulto ou criança.';
        break;
    }
    return '';
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name, value) }));
    setMessage('');
    setError('');
  };

  const handleNumberChange = (field: 'quantidade_criancas' | 'quantidade_adultos', type: 'increment' | 'decrement') => {
    setFormData((prev) => {
      const currentValue = prev[field];
      const newValue = type === 'increment' ? currentValue + 1 : Math.max(0, currentValue - 1);

      setFormErrors((prevErrors) => ({ ...prevErrors, [field]: validateField(field, newValue) }));
      return { ...prev, [field]: newValue };
    });
    setMessage('');
    setError('');
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;

    // Campos pessoais obrigatórios
    ['nome', 'cpf', 'data_nascimento'].forEach(field => {
      const errorMsg = validateField(field, formData[field as keyof typeof formData]);
      if (errorMsg) { newErrors[field] = errorMsg; isValid = false; }
    });

    // Campos de reserva obrigatórios APENAS SE FOR MODO DE CRIAÇÃO
    if (!isEditMode) {
      ['apartamento', 'tipoQuarto', 'data_checkin', 'data_checkout'].forEach(field => {
        const errorMsg = validateField(field, formData[field as keyof typeof formData]);
        if (errorMsg) { newErrors[field] = errorMsg; isValid = false; }
      });
      if (formData.quantidade_adultos === 0 && formData.quantidade_criancas === 0) {
        newErrors.quantidade_adultos = 'Deve haver pelo menos 1 adulto ou criança.';
        newErrors.quantidade_criancas = 'Deve haver pelo menos 1 adulto ou criança.';
        isValid = false;
      }
    }


    // Validação de e-mail (se preenchido)
    if (formData.email) {
      const errorMsg = validateField('email', formData.email);
      if (errorMsg) { newErrors['email'] = errorMsg; isValid = false; }
    }

    setFormErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!validateForm()) {
      setError('Por favor, corrija os erros no formulário.');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Você não está autenticado. Por favor, faça login.');
        setLoading(false);
        navigate('/login');
        return;
      }
      if (!userInfo) {
        setError('Informações do usuário logado ausentes.');
        setLoading(false);
        return;
      }

      // 1. Enviar/Atualizar dados do hóspede
      const guestDataToSend = {
        nome: formData.nome,
        sobrenome: formData.sobrenome,
        cpf: formData.cpf,
        rg: formData.rg,
        data_nascimento: formData.data_nascimento,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        numero: formData.numero,
        bairro: formData.bairro,
        cep: formData.cep,
        cidade: formData.cidade,
        estado: formData.estado,
      };

      let guestResponse;
      let guestResult;
      let newGuestId = id ? parseInt(id) : null;

      if (isEditMode && id) { // MODO EDIÇÃO: PUT /api/hospedes/:id
        guestResponse = await fetch(`${process.env.REACT_APP_API_URL}/hospedes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify(guestDataToSend),
        });
        guestResult = await guestResponse.json();
        if (!guestResponse.ok) {
          setError(guestResult.message || 'Erro ao atualizar hóspede.');
          if (guestResult.errors && guestResult.errors.length > 0) {
            setError(guestResult.errors.map((e: any) => e.msg).join('\n'));
          } else {
            setError(guestResult.message || 'Erro ao atualizar hóspede.');
          }
          return; // Garante que o fluxo para aqui em caso de erro de atualização
        }
        setMessage('Hóspede atualizado com sucesso!');
        setTimeout(() => navigate('/guests'), 1500); // Redireciona para lista
        return; // Finaliza o fluxo aqui para edição
      } else { // MODO CRIAÇÃO: POST /api/hospedes
        guestResponse = await fetch(`${process.env.REACT_APP_API_URL}/hospedes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
          body: JSON.stringify(guestDataToSend),
        });
        guestResult = await guestResponse.json();
        if (!guestResponse.ok) {
          setError(guestResult.message || 'Erro ao cadastrar hóspede.');
          if (guestResult.errors && guestResult.errors.length > 0) {
            setError(guestResult.errors.map((e: any) => e.msg).join('\n'));
          } else {
            setError(guestResult.message || 'Erro ao cadastrar hóspede.');
          }
          return; // ESTE RETORNO É FUNDAMENTAL PARA PARAR O FLUXO
        }
        setMessage('Hóspede cadastrado com sucesso!');
        newGuestId = guestResult.guest.id;
      }

      // A PARTIR DAQUI, APENAS NO MODO DE CRIAÇÃO (isEditMode === false)
      // 2. Criar a Reserva
      const bookingDataToSend = {
        usuario_id: userInfo.id,
        quarto_id: parseInt(formData.apartamento),
        data_checkin: formData.data_checkin,
        data_checkout: formData.data_checkout,
        hospede_principal_id: newGuestId,
      };

      const bookingResponse = await fetch(`${process.env.REACT_APP_API_URL}/reservas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(bookingDataToSend),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        setError(prev => prev + '\nErro ao criar reserva: ' + (bookingResult.message || 'Erro desconhecido.'));
        return;
      }
      setMessage(prev => prev + '\nReserva criada com sucesso!');
      const newReservaId = bookingResult.booking.id;

      // 3. Criar o Pagamento Inicial para a Reserva (AGORA SEM VALOR INICIAL)
      // Este pagamento serve para registrar que a reserva foi criada e está 'a pagar'
      // O valor pago será 0, para que o status inicial seja "Não Pago".
      const paymentDataToSend = {
        reserva_id: newReservaId,
        valor_pago: 0.00, // <-- VALOR PAGO ZERO AQUI!
        metodo_pagamento: 'Aguardando', // <-- NOVO MÉTODO PARA CLAREZA
        status_pagamento: 'pendente' // <-- STATUS PENDENTE PARA O PAGAMENTO INICIAL
      };

      const paymentResponse = await fetch(`${process.env.REACT_APP_API_URL}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify(paymentDataToSend),
      });

      const paymentResult = await paymentResponse.json();

      if (!paymentResponse.ok) {
        setError(prev => prev + '\nErro ao registrar pagamento inicial: ' + (paymentResult.message || 'Erro desconhecido.'));
        return;
      }
      setMessage(prev => prev + '\nPagamento inicial registrado com sucesso!');

      // 4. Criar conversa de chat para o hóspede
      await fetch(`${process.env.REACT_APP_API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ hospede_id: newGuestId, atendente_usuario_id: userInfo.id }),
      });

      // 5. Redirecionar para a tela de detalhes do pagamento da nova reserva
      navigate(`/payments/details/${newReservaId}`);

    } catch (err) {
      console.error('Erro geral no cadastro/reserva/pagamento:', err);
      setError('Não foi possível completar o cadastro e reserva. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <RegistrationContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p>Carregando dados...</p></MainContent>
      </RegistrationContainer>
    );
  }

  if (error) {
    return (
      <RegistrationContainer>
        <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
        <MainContent isMenuOpen={isMenuOpen}><p style={{ color: 'red' }}>Erro: {error}</p></MainContent>
      </RegistrationContainer>
    );
  }


  return (
    <RegistrationContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>{isEditMode ? 'Editar hóspede' : 'Cadastro de hóspede'}</Title>
        </Header>

        <FormSection onSubmit={handleSubmit}>
          <p style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>* Campos obrigatórios</p>
          <SectionTitle>Dados pessoais</SectionTitle>
          <FormGrid>
            <Input label="Nome *" name="nome" value={formData.nome} onChange={handleChange} required />
            {formErrors.nome && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.nome}</p>}

            <Input label="CPF *" name="cpf" value={formData.cpf} onChange={handleChange} required placeholder="000.000.000-00" />
            {formErrors.cpf && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.cpf}</p>}

            <DatePickerField
              label="Data de nascimento *"
              name="data_nascimento"
              value={formData.data_nascimento}
              onChange={(val) => { setFormData(p => ({ ...p, data_nascimento: val })); setFormErrors(p => ({ ...p, data_nascimento: validateField('data_nascimento', val) })); }}
              maxDate={new Date()}
              required
              error={formErrors.data_nascimento}
            />

            <Input label="RG" name="rg" value={formData.rg} onChange={handleChange} placeholder="00.000.000" />

            <Input label="Sobrenome" name="sobrenome" value={formData.sobrenome} onChange={handleChange} />

            <FullWidthInput>
              <Input label="E-mail" name="email" type="email" value={formData.email} onChange={handleChange} placeholder="email@exemplo.com" />
            </FullWidthInput>
            {formErrors.email && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 2' }}>{formErrors.email}</p>}

            <Input label="Telefone" name="telefone" value={formData.telefone} onChange={handleChange} placeholder="(00) 00000-0000" />

            <FullWidthInput>
              <Input label="Endereço" name="endereco" value={formData.endereco} onChange={handleChange} />
            </FullWidthInput>
            <Input label="Número" name="numero" value={formData.numero} onChange={handleChange} />
            <FullWidthInput>
              <Input label="Bairro" name="bairro" value={formData.bairro} onChange={handleChange} />
            </FullWidthInput>
            <Input label="CEP" name="cep" value={formData.cep} onChange={handleChange} placeholder="00000-000" />
            <FullWidthInput>
              <Input label="Cidade" name="cidade" value={formData.cidade} onChange={handleChange} />
            </FullWidthInput>
            <SelectInput>
              <label>Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange}>
                <option value="">Escolha</option>
                <option value="AC">Acre</option>
                <option value="AL">Alagoas</option>
                <option value="AP">Amapá</option>
                <option value="AM">Amazonas</option> {/* <-- CORRIGIDO AQUI! */}
                <option value="BA">Bahia</option>
                <option value="CE">Ceará</option>
                <option value="DF">Distrito Federal</option>
                <option value="ES">Espírito Santo</option>
                <option value="GO">Goiás</option>
                <option value="MA">Maranhão</option>
                <option value="MT">Mato Grosso</option>
                <option value="MS">Mato Grosso do Sul</option>
                <option value="MG">Minas Gerais</option>
                <option value="PA">Pará</option>
                <option value="PB">Paraíba</option>
                <option value="PR">Paraná</option>
                <option value="PE">Pernambuco</option>
                <option value="PI">Piauí</option>
                <option value="RJ">Rio de Janeiro</option>
                <option value="RN">Rio Grande do Norte</option>
                <option value="RS">Rio Grande do Sul</option>
                <option value="RO">Rondônia</option>
                <option value="RR">Roraima</option>
                <option value="SC">Santa Catarina</option>
                <option value="SP">São Paulo</option>
                <option value="SE">Sergipe</option>
                <option value="TO">Tocantins</option>
              </select>
            </SelectInput>
          </FormGrid>

          <SectionTitle>Dados da reserva</SectionTitle>
          <FormGrid>
            <SelectInput>
              <label>Apartamento *</label>
              <div>
                <select
                  name="apartamento"
                  value={formData.apartamento}
                  onChange={handleChange}
                  required={!isEditMode}
                  disabled={isEditMode || roomsLoading}
                >
                  <option value="">
                    {roomsLoading ? 'Carregando...' : 'Selecione o apartamento'}
                  </option>
                  {/* Mapeia a lista de quartos buscada da API */}
                  {availableRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.numero}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon icon={faRedo} style={{ cursor: 'pointer' }} />
              </div>
            </SelectInput>
            {formErrors.apartamento && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.apartamento}</p>}
            <SelectInput>
              <label>Tipo *</label>
              <select name="tipoQuarto" value={formData.tipoQuarto} onChange={handleChange} required={!isEditMode}>
                <option value="">Escolha</option>
                <option value="Standard">Standard</option>
                <option value="Luxo">Luxo</option>
                <option value="Suite">Suite</option>
              </select>
            </SelectInput>
            {formErrors.tipoQuarto && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.tipoQuarto}</p>}

            <DatePickerField
              label={isEditMode ? 'Data de Entrada' : 'Data de Entrada *'}
              name="data_checkin"
              value={formData.data_checkin}
              onChange={(val) => { setFormData(p => ({ ...p, data_checkin: val })); setFormErrors(p => ({ ...p, data_checkin: validateField('data_checkin', val) })); }}
              minDate={new Date()}
              required={!isEditMode}
              disabled={isEditMode}
              error={formErrors.data_checkin}
            />

            <NumberInputContainer>
              <label>Quantidade de crianças</label>
              <div>
                <NumberInputButton type="button" onClick={() => handleNumberChange('quantidade_criancas', 'decrement')}>-</NumberInputButton>
                <NumberInput value={formData.quantidade_criancas} readOnly />
                <NumberInputButton type="button" onClick={() => handleNumberChange('quantidade_criancas', 'increment')}>+</NumberInputButton>
              </div>
            </NumberInputContainer>
            {formErrors.quantidade_criancas && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.quantidade_criancas}</p>}

            <DatePickerField
              label={isEditMode ? 'Data da Saída' : 'Data da Saída *'}
              name="data_checkout"
              value={formData.data_checkout}
              onChange={(val) => { setFormData(p => ({ ...p, data_checkout: val })); setFormErrors(p => ({ ...p, data_checkout: validateField('data_checkout', val) })); }}
              minDate={formData.data_checkin ? new Date(formData.data_checkin + 'T00:00:00') : new Date()}
              required={!isEditMode}
              disabled={isEditMode}
              error={formErrors.data_checkout}
            />

            <NumberInputContainer>
              <label>Quantidade de adultos</label>
              <div>
                <NumberInputButton type="button" onClick={() => handleNumberChange('quantidade_adultos', 'decrement')}>-</NumberInputButton>
                <NumberInput value={formData.quantidade_adultos} readOnly />
                <NumberInputButton type="button" onClick={() => handleNumberChange('quantidade_adultos', 'increment')}>+</NumberInputButton>
              </div>
            </NumberInputContainer>
            {formErrors.quantidade_adultos && <p style={{ color: 'red', fontSize: '12px', gridColumn: 'span 1' }}>{formErrors.quantidade_adultos}</p>}

          </FormGrid>

          <SaveButtonContainer>
            {message && <p style={{ color: 'green', marginBottom: '10px' }}>{message}</p>}
            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : (isEditMode ? 'Atualizar Hóspede' : 'Salvar')}
            </Button>
          </SaveButtonContainer>
        </FormSection>
      </MainContent>
    </RegistrationContainer>
  );
};

export default GuestRegistration;