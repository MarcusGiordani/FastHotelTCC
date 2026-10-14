// src/pages/Apartments/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan } from '@fortawesome/free-solid-svg-icons';
import SideMenu from '../../components/SideMenu';
import { apiFetch } from '../../utils/api';

import {
  ApartmentsContainer,
  MainContent,
  Header,
  Title,
  ButtonGroup,
  PrimaryButton,
  TabsBar,
  TabButton,
  ActionsBar,
  FilterSelect,
  FormCard,
  FormField,
  FormActions,
  SecondaryButton,
  TableContainer,
  StyledTable,
  TableHeader,
  TableRow,
  TableCell,
  TableActionCell,
  StatusBadge,
  FeedbackMessage,
} from './styles';

interface RoomType {
  id: number;
  nome: string;
  descricao: string | null;
  capacidade_padrao: number | null;
  preco_base: string | number | null;
  ativo: boolean;
}

interface Room {
  id: number;
  numero: string;
  tipo: string;
  tipo_id: number | null;
  tipo_nome: string | null;
  capacidade: number;
  preco_por_noite: string | number;
  status: string;
  descricao: string | null;
}

const FORM_TIPO_VAZIO = { nome: '', descricao: '', capacidade_padrao: '', preco_base: '' };
const FORM_QUARTO_VAZIO = { numero: '', tipo_id: '', capacidade: '', preco_por_noite: '', status: 'disponivel', descricao: '' };

const formatarMoeda = (v: string | number | null) =>
  v === null || v === '' ? '—' : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const Apartments: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [aba, setAba] = useState<'quartos' | 'tipos'>('quartos');

  const [tipos, setTipos] = useState<RoomType[]>([]);
  const [quartos, setQuartos] = useState<Room[]>([]);
  const [filtroTipoId, setFiltroTipoId] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editandoTipoId, setEditandoTipoId] = useState<number | null>(null);
  const [mostrarFormTipo, setMostrarFormTipo] = useState(false);
  const [formTipo, setFormTipo] = useState(FORM_TIPO_VAZIO);

  const [editandoQuartoId, setEditandoQuartoId] = useState<number | null>(null);
  const [mostrarFormQuarto, setMostrarFormQuarto] = useState(false);
  const [formQuarto, setFormQuarto] = useState(FORM_QUARTO_VAZIO);

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const mostrarSucesso = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // tipos?ativo=all traz também os desativados — a tela de gerenciamento precisa
  // mostrar os dois para permitir reativar/consultar; o filtro de reserva usa
  // só os ativos (ver GuestRegistration).
  const fetchTipos = useCallback(async () => {
    const res = await apiFetch('/tipos-quarto?ativo=all');
    if (res.ok) setTipos(await res.json());
  }, []);

  const fetchQuartos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroTipoId) params.set('tipo_id', filtroTipoId);
    const res = await apiFetch(`/quartos${params.toString() ? `?${params}` : ''}`);
    if (res.ok) {
      setQuartos(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar apartamentos.');
    }
  }, [filtroTipoId]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchTipos(), fetchQuartos()])
      .catch(() => setError('Não foi possível conectar ao servidor.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchQuartos();
  }, [filtroTipoId, fetchQuartos]);

  const tiposAtivos = useMemo(() => tipos.filter((t) => t.ativo), [tipos]);

  // ---- Tipos de apartamento ----

  const abrirNovoTipo = () => {
    setEditandoTipoId(null);
    setFormTipo(FORM_TIPO_VAZIO);
    setMostrarFormTipo(true);
  };

  const abrirEdicaoTipo = (t: RoomType) => {
    setEditandoTipoId(t.id);
    setFormTipo({
      nome: t.nome,
      descricao: t.descricao || '',
      capacidade_padrao: t.capacidade_padrao ? String(t.capacidade_padrao) : '',
      preco_base: t.preco_base !== null ? String(t.preco_base) : '',
    });
    setMostrarFormTipo(true);
  };

  const fecharFormTipo = () => {
    setMostrarFormTipo(false);
    setEditandoTipoId(null);
    setFormTipo(FORM_TIPO_VAZIO);
  };

  const handleSubmitTipo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      nome: formTipo.nome.trim(),
      descricao: formTipo.descricao.trim() || undefined,
      capacidade_padrao: formTipo.capacidade_padrao ? Number(formTipo.capacidade_padrao) : undefined,
      preco_base: formTipo.preco_base ? Number(formTipo.preco_base) : undefined,
    };

    try {
      const res = editandoTipoId
        ? await apiFetch(`/tipos-quarto/${editandoTipoId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch('/tipos-quarto', { method: 'POST', body: JSON.stringify(payload) });

      const data = await res.json();
      if (res.ok) {
        mostrarSucesso(editandoTipoId ? 'Tipo de apartamento atualizado com sucesso!' : 'Tipo de apartamento cadastrado com sucesso!');
        fecharFormTipo();
        await fetchTipos();
      } else {
        setError(data.message || 'Erro ao salvar tipo de apartamento.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  const handleDesativarTipo = async (t: RoomType) => {
    if (!window.confirm(`Desativar o tipo "${t.nome}"? Os apartamentos já cadastrados com esse tipo não são afetados.`)) return;
    setError(null);
    try {
      const res = await apiFetch(`/tipos-quarto/${t.id}/desativar`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso('Tipo de apartamento desativado com sucesso!');
        await fetchTipos();
      } else {
        setError(data.message || 'Erro ao desativar tipo de apartamento.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  // ---- Apartamentos (quartos) ----

  const abrirNovoQuarto = () => {
    setEditandoQuartoId(null);
    setFormQuarto(FORM_QUARTO_VAZIO);
    setMostrarFormQuarto(true);
  };

  const abrirEdicaoQuarto = (q: Room) => {
    setEditandoQuartoId(q.id);
    setFormQuarto({
      numero: q.numero,
      tipo_id: q.tipo_id ? String(q.tipo_id) : '',
      capacidade: String(q.capacidade),
      preco_por_noite: String(q.preco_por_noite),
      status: q.status,
      descricao: q.descricao || '',
    });
    setMostrarFormQuarto(true);
  };

  const fecharFormQuarto = () => {
    setMostrarFormQuarto(false);
    setEditandoQuartoId(null);
    setFormQuarto(FORM_QUARTO_VAZIO);
  };

  // Ao escolher um tipo no formulário de apartamento, pré-preenche capacidade/preço
  // com os valores padrão do tipo (o usuário ainda pode ajustar antes de salvar).
  const handleTipoQuartoChange = (tipoId: string) => {
    const tipo = tipos.find((t) => String(t.id) === tipoId);
    setFormQuarto((prev) => ({
      ...prev,
      tipo_id: tipoId,
      capacidade: prev.capacidade || (tipo?.capacidade_padrao ? String(tipo.capacidade_padrao) : ''),
      preco_por_noite: prev.preco_por_noite || (tipo?.preco_base !== null && tipo?.preco_base !== undefined ? String(tipo.preco_base) : ''),
    }));
  };

  const handleSubmitQuarto = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      numero: formQuarto.numero.trim(),
      tipo_id: formQuarto.tipo_id ? Number(formQuarto.tipo_id) : undefined,
      capacidade: Number(formQuarto.capacidade) || 0,
      preco_por_noite: Number(formQuarto.preco_por_noite) || 0,
      status: formQuarto.status,
      descricao: formQuarto.descricao.trim() || undefined,
    };

    try {
      const res = editandoQuartoId
        ? await apiFetch(`/quartos/${editandoQuartoId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch('/quartos', { method: 'POST', body: JSON.stringify(payload) });

      const data = await res.json();
      if (res.ok) {
        mostrarSucesso(editandoQuartoId ? 'Apartamento atualizado com sucesso!' : 'Apartamento cadastrado com sucesso!');
        fecharFormQuarto();
        await fetchQuartos();
      } else {
        setError(data.message || 'Erro ao salvar apartamento.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  return (
    <ApartmentsContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Gerenciamento de Apartamentos</Title>
          <ButtonGroup>
            {aba === 'quartos' && <PrimaryButton onClick={abrirNovoQuarto}>Novo apartamento</PrimaryButton>}
            {aba === 'tipos' && <PrimaryButton onClick={abrirNovoTipo}>Novo tipo</PrimaryButton>}
          </ButtonGroup>
        </Header>

        {successMsg && <FeedbackMessage>{successMsg}</FeedbackMessage>}
        {error && <FeedbackMessage error>{error}</FeedbackMessage>}

        <TabsBar>
          <TabButton active={aba === 'quartos'} onClick={() => setAba('quartos')}>
            Apartamentos
          </TabButton>
          <TabButton active={aba === 'tipos'} onClick={() => setAba('tipos')}>
            Tipos de Apartamento
          </TabButton>
        </TabsBar>

        {aba === 'quartos' && (
          <>
            {mostrarFormQuarto && (
              <FormCard onSubmit={handleSubmitQuarto}>
                <FormField>
                  <label>Número *</label>
                  <input
                    value={formQuarto.numero}
                    onChange={(e) => setFormQuarto({ ...formQuarto, numero: e.target.value })}
                    required
                  />
                </FormField>
                <FormField>
                  <label>Tipo *</label>
                  <select
                    value={formQuarto.tipo_id}
                    onChange={(e) => handleTipoQuartoChange(e.target.value)}
                    required
                  >
                    <option value="">Selecione o tipo</option>
                    {tiposAtivos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nome}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField>
                  <label>Capacidade (hóspedes) *</label>
                  <input
                    type="number"
                    min={1}
                    value={formQuarto.capacidade}
                    onChange={(e) => setFormQuarto({ ...formQuarto, capacidade: e.target.value })}
                    required
                  />
                </FormField>
                <FormField>
                  <label>Preço da diária *</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formQuarto.preco_por_noite}
                    onChange={(e) => setFormQuarto({ ...formQuarto, preco_por_noite: e.target.value })}
                    required
                  />
                </FormField>
                <FormField>
                  <label>Status</label>
                  <select value={formQuarto.status} onChange={(e) => setFormQuarto({ ...formQuarto, status: e.target.value })}>
                    <option value="disponivel">Disponível</option>
                    <option value="manutencao">Em manutenção</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </FormField>
                <FormField>
                  <label>Descrição</label>
                  <input
                    value={formQuarto.descricao}
                    onChange={(e) => setFormQuarto({ ...formQuarto, descricao: e.target.value })}
                  />
                </FormField>
                <FormActions>
                  <PrimaryButton type="submit">{editandoQuartoId ? 'Salvar alterações' : 'Cadastrar'}</PrimaryButton>
                  <SecondaryButton type="button" onClick={fecharFormQuarto}>
                    Cancelar
                  </SecondaryButton>
                </FormActions>
              </FormCard>
            )}

            <ActionsBar>
              <FilterSelect value={filtroTipoId} onChange={(e) => setFiltroTipoId(e.target.value)}>
                <option value="">Todos os tipos</option>
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
              </FilterSelect>
              <span>{quartos.length} apartamento(s)</span>
            </ActionsBar>

            {loading ? (
              <p>Carregando...</p>
            ) : (
              <TableContainer>
                <StyledTable>
                  <thead>
                    <TableRow header>
                      <TableHeader>Número</TableHeader>
                      <TableHeader>Tipo</TableHeader>
                      <TableHeader>Capacidade</TableHeader>
                      <TableHeader>Preço/diária</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Ações</TableHeader>
                    </TableRow>
                  </thead>
                  <tbody>
                    {quartos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} style={{ textAlign: 'center' }}>
                          Nenhum apartamento cadastrado{filtroTipoId ? ' para esse tipo' : ''}.
                        </TableCell>
                      </TableRow>
                    )}
                    {quartos.map((q) => (
                      <TableRow key={q.id}>
                        <TableCell>{q.numero}</TableCell>
                        <TableCell>{q.tipo_nome || q.tipo}</TableCell>
                        <TableCell>{q.capacidade}</TableCell>
                        <TableCell>{formatarMoeda(q.preco_por_noite)}</TableCell>
                        <TableCell>{q.status}</TableCell>
                        <TableActionCell>
                          <FontAwesomeIcon icon={faEdit} title="Editar" onClick={() => abrirEdicaoQuarto(q)} />
                        </TableActionCell>
                      </TableRow>
                    ))}
                  </tbody>
                </StyledTable>
              </TableContainer>
            )}
          </>
        )}

        {aba === 'tipos' && (
          <>
            {mostrarFormTipo && (
              <FormCard onSubmit={handleSubmitTipo}>
                <FormField>
                  <label>Nome *</label>
                  <input
                    value={formTipo.nome}
                    onChange={(e) => setFormTipo({ ...formTipo, nome: e.target.value })}
                    placeholder="Standard, Luxo, Suíte..."
                    required
                  />
                </FormField>
                <FormField>
                  <label>Descrição</label>
                  <input value={formTipo.descricao} onChange={(e) => setFormTipo({ ...formTipo, descricao: e.target.value })} />
                </FormField>
                <FormField>
                  <label>Capacidade padrão</label>
                  <input
                    type="number"
                    min={1}
                    value={formTipo.capacidade_padrao}
                    onChange={(e) => setFormTipo({ ...formTipo, capacidade_padrao: e.target.value })}
                  />
                </FormField>
                <FormField>
                  <label>Preço base da diária</label>
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={formTipo.preco_base}
                    onChange={(e) => setFormTipo({ ...formTipo, preco_base: e.target.value })}
                  />
                </FormField>
                <FormActions>
                  <PrimaryButton type="submit">{editandoTipoId ? 'Salvar alterações' : 'Cadastrar tipo'}</PrimaryButton>
                  <SecondaryButton type="button" onClick={fecharFormTipo}>
                    Cancelar
                  </SecondaryButton>
                </FormActions>
              </FormCard>
            )}

            <TableContainer>
              <StyledTable>
                <thead>
                  <TableRow header>
                    <TableHeader>Nome</TableHeader>
                    <TableHeader>Descrição</TableHeader>
                    <TableHeader>Capacidade padrão</TableHeader>
                    <TableHeader>Preço base</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Ações</TableHeader>
                  </TableRow>
                </thead>
                <tbody>
                  {tipos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} style={{ textAlign: 'center' }}>
                        Nenhum tipo de apartamento cadastrado.
                      </TableCell>
                    </TableRow>
                  )}
                  {tipos.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>{t.nome}</TableCell>
                      <TableCell>{t.descricao || '—'}</TableCell>
                      <TableCell>{t.capacidade_padrao ?? '—'}</TableCell>
                      <TableCell>{formatarMoeda(t.preco_base)}</TableCell>
                      <TableCell>
                        <StatusBadge ativo={t.ativo}>{t.ativo ? 'Ativo' : 'Inativo'}</StatusBadge>
                      </TableCell>
                      <TableActionCell>
                        <FontAwesomeIcon icon={faEdit} title="Editar" onClick={() => abrirEdicaoTipo(t)} />
                        {t.ativo && <FontAwesomeIcon icon={faBan} title="Desativar" onClick={() => handleDesativarTipo(t)} />}
                      </TableActionCell>
                    </TableRow>
                  ))}
                </tbody>
              </StyledTable>
            </TableContainer>
          </>
        )}
      </MainContent>
    </ApartmentsContainer>
  );
};

export default Apartments;
