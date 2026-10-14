// src/pages/Finance/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan } from '@fortawesome/free-solid-svg-icons';
import SideMenu from '../../components/SideMenu';
import { apiFetch } from '../../utils/api';

import {
  FinanceContainer,
  MainContent,
  Header,
  Title,
  ButtonGroup,
  PrimaryButton,
  SummaryGrid,
  SummaryCard,
  TabsBar,
  TabButton,
  ActionsBar,
  FilterSelect,
  FilterDate,
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
  TipoBadge,
  OrigemBadge,
  StatusBadge,
  FeedbackMessage,
} from './styles';

type Tipo = 'receita' | 'despesa';

interface Movement {
  id: number;
  tipo: Tipo;
  categoria_id: number | null;
  categoria_nome: string | null;
  valor: string | number;
  descricao: string | null;
  forma_pagamento: string | null;
  data_movimentacao: string;
  origem: 'manual' | 'automatica';
  pagamento_id: number | null;
  status: 'confirmada' | 'cancelada' | 'estornada';
  criado_por_nome: string | null;
  created_at: string;
}

interface Category {
  id: number;
  nome: string;
  tipo: 'receita' | 'despesa' | 'ambas';
}

interface Summary {
  receitas: number;
  despesas: number;
  saldo: number;
}

interface MonthlyRow {
  mes: number;
  receitas: number;
  despesas: number;
  saldo: number;
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const formatarMoeda = (v: number | string) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '—');

const FORM_VAZIO = { valor: '', descricao: '', categoria_id: '', forma_pagamento: '', data_movimentacao: '' };

const Finance: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [aba, setAba] = useState<'movimentacoes' | 'categorias' | 'mensal'>('movimentacoes');

  const [resumo, setResumo] = useState<Summary>({ receitas: 0, despesas: 0, saldo: 0 });
  const [movimentos, setMovimentos] = useState<Movement[]>([]);
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [anoMensal, setAnoMensal] = useState(new Date().getFullYear());
  const [mensal, setMensal] = useState<MonthlyRow[]>([]);

  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroInicio, setFiltroInicio] = useState('');
  const [filtroFim, setFiltroFim] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formTipo, setFormTipo] = useState<Tipo | null>(null);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const [categoriaForm, setCategoriaForm] = useState({ nome: '', tipo: 'ambas' as 'receita' | 'despesa' | 'ambas' });

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const mostrarSucesso = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchResumo = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroInicio) params.set('periodo_inicio', filtroInicio);
    if (filtroFim) params.set('periodo_fim', filtroFim);
    const res = await apiFetch(`/financeiro/resumo${params.toString() ? `?${params}` : ''}`);
    if (res.ok) setResumo(await res.json());
  }, [filtroInicio, filtroFim]);

  const fetchCategorias = useCallback(async () => {
    const res = await apiFetch('/financeiro/categorias');
    if (res.ok) setCategorias(await res.json());
  }, []);

  const fetchMovimentos = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroTipo) params.set('tipo', filtroTipo);
    if (filtroCategoria) params.set('categoria_id', filtroCategoria);
    if (filtroInicio) params.set('periodo_inicio', filtroInicio);
    if (filtroFim) params.set('periodo_fim', filtroFim);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`/financeiro${query}`);
    if (res.ok) {
      setMovimentos(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar movimentações financeiras.');
    }
  }, [filtroTipo, filtroCategoria, filtroInicio, filtroFim]);

  const fetchMensal = useCallback(async (ano: number) => {
    const res = await apiFetch(`/financeiro/resumo-mensal?ano=${ano}`);
    if (res.ok) {
      const data = await res.json();
      setMensal(data.meses);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchResumo(), fetchCategorias(), fetchMovimentos()])
      .catch(() => setError('Não foi possível conectar ao servidor.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchResumo();
    fetchMovimentos();
  }, [filtroTipo, filtroCategoria, filtroInicio, filtroFim, fetchResumo, fetchMovimentos]);

  useEffect(() => {
    if (aba === 'mensal') fetchMensal(anoMensal);
  }, [aba, anoMensal, fetchMensal]);

  const categoriasCompativeis = useMemo(
    () => categorias.filter((c) => !formTipo || c.tipo === 'ambas' || c.tipo === formTipo),
    [categorias, formTipo],
  );

  // ---- formulário de receita/despesa ----

  const abrirNovo = (tipo: Tipo) => {
    setFormTipo(tipo);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const abrirEdicao = (m: Movement) => {
    setFormTipo(m.tipo);
    setEditandoId(m.id);
    setForm({
      valor: String(m.valor),
      descricao: m.descricao || '',
      categoria_id: m.categoria_id ? String(m.categoria_id) : '',
      forma_pagamento: m.forma_pagamento || '',
      data_movimentacao: m.data_movimentacao ? m.data_movimentacao.slice(0, 10) : '',
    });
  };

  const fecharForm = () => {
    setFormTipo(null);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      valor: Number(form.valor) || 0,
      descricao: form.descricao.trim(),
      categoria_id: form.categoria_id ? Number(form.categoria_id) : undefined,
      forma_pagamento: form.forma_pagamento.trim() || undefined,
      data_movimentacao: form.data_movimentacao || undefined,
    };

    try {
      const res = editandoId
        ? await apiFetch(`/financeiro/${editandoId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch(`/financeiro/${formTipo === 'receita' ? 'receitas' : 'despesas'}`, {
            method: 'POST',
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (res.ok) {
        mostrarSucesso(editandoId ? 'Lançamento atualizado com sucesso!' : data.message);
        fecharForm();
        await Promise.all([fetchResumo(), fetchMovimentos()]);
      } else {
        setError(data.message || 'Erro ao salvar lançamento.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  const handleCancelar = async (m: Movement) => {
    if (!window.confirm(`Cancelar o lançamento "${m.descricao || m.id}"? O registro será preservado no histórico.`)) return;
    setError(null);
    try {
      const res = await apiFetch(`/financeiro/${m.id}/cancelar`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso('Lançamento cancelado com sucesso!');
        await Promise.all([fetchResumo(), fetchMovimentos()]);
      } else {
        setError(data.message || 'Erro ao cancelar lançamento.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  // ---- categorias ----

  const handleCreateCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await apiFetch('/financeiro/categorias', {
        method: 'POST',
        body: JSON.stringify(categoriaForm),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso('Categoria cadastrada com sucesso!');
        setCategoriaForm({ nome: '', tipo: 'ambas' });
        await fetchCategorias();
      } else {
        setError(data.message || 'Erro ao cadastrar categoria.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  return (
    <FinanceContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Fluxo de Caixa</Title>
          <ButtonGroup>
            <PrimaryButton variant="receita" onClick={() => abrirNovo('receita')}>
              Nova receita
            </PrimaryButton>
            <PrimaryButton variant="despesa" onClick={() => abrirNovo('despesa')}>
              Nova despesa
            </PrimaryButton>
          </ButtonGroup>
        </Header>

        {successMsg && <FeedbackMessage>{successMsg}</FeedbackMessage>}
        {error && <FeedbackMessage error>{error}</FeedbackMessage>}

        <SummaryGrid>
          <SummaryCard accent="#28a745">
            <h2>Receitas</h2>
            <p>{formatarMoeda(resumo.receitas)}</p>
          </SummaryCard>
          <SummaryCard accent="#dc3545">
            <h2>Despesas</h2>
            <p>{formatarMoeda(resumo.despesas)}</p>
          </SummaryCard>
          <SummaryCard accent={resumo.saldo >= 0 ? '#2c73d2' : '#dc3545'}>
            <h2>Saldo</h2>
            <p>{formatarMoeda(resumo.saldo)}</p>
          </SummaryCard>
        </SummaryGrid>

        {formTipo && (
          <FormCard onSubmit={handleSubmitForm}>
            <FormField>
              <label>{editandoId ? `Editando ${formTipo}` : formTipo === 'receita' ? 'Nova receita' : 'Nova despesa'} — Valor *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                required
              />
            </FormField>
            <FormField>
              <label>Descrição *</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} required />
            </FormField>
            <FormField>
              <label>Categoria</label>
              <select value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                <option value="">Sem categoria</option>
                {categoriasCompativeis.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField>
              <label>Forma de pagamento</label>
              <input
                value={form.forma_pagamento}
                onChange={(e) => setForm({ ...form, forma_pagamento: e.target.value })}
                placeholder="dinheiro, pix, cartão..."
              />
            </FormField>
            <FormField>
              <label>Data da movimentação</label>
              <input
                type="date"
                value={form.data_movimentacao}
                onChange={(e) => setForm({ ...form, data_movimentacao: e.target.value })}
              />
            </FormField>
            <FormActions>
              <PrimaryButton type="submit" variant={formTipo}>
                {editandoId ? 'Salvar alterações' : 'Registrar'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={fecharForm}>
                Cancelar
              </SecondaryButton>
            </FormActions>
          </FormCard>
        )}

        <TabsBar>
          <TabButton active={aba === 'movimentacoes'} onClick={() => setAba('movimentacoes')}>
            Movimentações
          </TabButton>
          <TabButton active={aba === 'categorias'} onClick={() => setAba('categorias')}>
            Categorias
          </TabButton>
          <TabButton active={aba === 'mensal'} onClick={() => setAba('mensal')}>
            Resumo mensal
          </TabButton>
        </TabsBar>

        {aba === 'movimentacoes' && (
          <>
            <ActionsBar>
              <FilterSelect value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </FilterSelect>
              <FilterSelect value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                <option value="">Todas as categorias</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </FilterSelect>
              <FilterDate type="date" value={filtroInicio} onChange={(e) => setFiltroInicio(e.target.value)} title="Período - início" />
              <FilterDate type="date" value={filtroFim} onChange={(e) => setFiltroFim(e.target.value)} title="Período - fim" />
              <span>{movimentos.length} lançamento(s)</span>
            </ActionsBar>

            {loading ? (
              <p>Carregando...</p>
            ) : (
              <TableContainer>
                <StyledTable>
                  <thead>
                    <TableRow header>
                      <TableHeader>Data</TableHeader>
                      <TableHeader>Tipo</TableHeader>
                      <TableHeader>Descrição</TableHeader>
                      <TableHeader>Categoria</TableHeader>
                      <TableHeader>Valor</TableHeader>
                      <TableHeader>Origem</TableHeader>
                      <TableHeader>Status</TableHeader>
                      <TableHeader>Responsável</TableHeader>
                      <TableHeader>Ações</TableHeader>
                    </TableRow>
                  </thead>
                  <tbody>
                    {movimentos.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} style={{ textAlign: 'center' }}>
                          Nenhuma movimentação encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                    {movimentos.map((m) => {
                      const podeEditar = m.origem === 'manual' && m.status === 'confirmada';
                      return (
                        <TableRow key={m.id}>
                          <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                          <TableCell>
                            <TipoBadge tipo={m.tipo}>{m.tipo === 'receita' ? 'Receita' : 'Despesa'}</TipoBadge>
                          </TableCell>
                          <TableCell>{m.descricao || '—'}</TableCell>
                          <TableCell>{m.categoria_nome || '—'}</TableCell>
                          <TableCell>{formatarMoeda(m.valor)}</TableCell>
                          <TableCell>
                            <OrigemBadge origem={m.origem}>{m.origem === 'automatica' ? 'Automática' : 'Manual'}</OrigemBadge>
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={m.status}>
                              {m.status === 'confirmada' ? 'Confirmada' : m.status === 'cancelada' ? 'Cancelada' : 'Estornada'}
                            </StatusBadge>
                          </TableCell>
                          <TableCell>{m.criado_por_nome || '—'}</TableCell>
                          <TableActionCell>
                            {podeEditar ? (
                              <>
                                <FontAwesomeIcon icon={faEdit} title="Editar" onClick={() => abrirEdicao(m)} />
                                <FontAwesomeIcon icon={faBan} title="Cancelar" onClick={() => handleCancelar(m)} />
                              </>
                            ) : (
                              '—'
                            )}
                          </TableActionCell>
                        </TableRow>
                      );
                    })}
                  </tbody>
                </StyledTable>
              </TableContainer>
            )}
          </>
        )}

        {aba === 'categorias' && (
          <>
            <FormCard onSubmit={handleCreateCategoria}>
              <FormField>
                <label>Nome da categoria *</label>
                <input
                  value={categoriaForm.nome}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, nome: e.target.value })}
                  required
                />
              </FormField>
              <FormField>
                <label>Tipo *</label>
                <select
                  value={categoriaForm.tipo}
                  onChange={(e) => setCategoriaForm({ ...categoriaForm, tipo: e.target.value as any })}
                >
                  <option value="ambas">Receita e despesa</option>
                  <option value="receita">Somente receita</option>
                  <option value="despesa">Somente despesa</option>
                </select>
              </FormField>
              <FormActions>
                <PrimaryButton type="submit">Cadastrar categoria</PrimaryButton>
              </FormActions>
            </FormCard>

            <TableContainer>
              <StyledTable>
                <thead>
                  <TableRow header>
                    <TableHeader>Nome</TableHeader>
                    <TableHeader>Tipo</TableHeader>
                  </TableRow>
                </thead>
                <tbody>
                  {categorias.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} style={{ textAlign: 'center' }}>
                        Nenhuma categoria cadastrada.
                      </TableCell>
                    </TableRow>
                  )}
                  {categorias.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{c.nome}</TableCell>
                      <TableCell>{c.tipo === 'ambas' ? 'Receita e despesa' : c.tipo === 'receita' ? 'Receita' : 'Despesa'}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </StyledTable>
            </TableContainer>
          </>
        )}

        {aba === 'mensal' && (
          <>
            <ActionsBar>
              <FilterSelect value={anoMensal} onChange={(e) => setAnoMensal(Number(e.target.value))}>
                {[0, 1, 2].map((offset) => {
                  const ano = new Date().getFullYear() - offset;
                  return (
                    <option key={ano} value={ano}>
                      {ano}
                    </option>
                  );
                })}
              </FilterSelect>
              <span>Resumo mensal de {anoMensal}</span>
            </ActionsBar>

            <TableContainer>
              <StyledTable>
                <thead>
                  <TableRow header>
                    <TableHeader>Mês</TableHeader>
                    <TableHeader>Receitas</TableHeader>
                    <TableHeader>Despesas</TableHeader>
                    <TableHeader>Saldo</TableHeader>
                  </TableRow>
                </thead>
                <tbody>
                  {mensal.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} style={{ textAlign: 'center' }}>
                        Nenhuma movimentação confirmada neste ano.
                      </TableCell>
                    </TableRow>
                  )}
                  {mensal.map((m) => (
                    <TableRow key={m.mes}>
                      <TableCell>{MESES[m.mes - 1]}</TableCell>
                      <TableCell>{formatarMoeda(m.receitas)}</TableCell>
                      <TableCell>{formatarMoeda(m.despesas)}</TableCell>
                      <TableCell>{formatarMoeda(m.saldo)}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </StyledTable>
            </TableContainer>
          </>
        )}
      </MainContent>
    </FinanceContainer>
  );
};

export default Finance;
