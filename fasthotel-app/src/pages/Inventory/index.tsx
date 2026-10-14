// src/pages/Inventory/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faBan, faPlus, faMinus, faCheck, faTimes } from '@fortawesome/free-solid-svg-icons';
import SideMenu from '../../components/SideMenu';
import { apiFetch } from '../../utils/api';
import { colors } from '../../styles/colors';

import {
  InventoryContainer,
  MainContent,
  Header,
  Title,
  PrimaryButton,
  SummaryGrid,
  SummaryCard,
  TabsBar,
  TabButton,
  ActionsBar,
  SearchInput,
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
  SituacaoBadge,
  MovementPanel,
  SmallInput,
  FeedbackMessage,
} from './styles';

interface Product {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string | null;
  unidade_medida: string;
  quantidade_atual: string | number;
  estoque_minimo: string | number;
  ativo: boolean;
  data_cadastro: string;
}

interface Movement {
  id: number;
  produto_id: number;
  produto_nome: string;
  tipo: 'entrada' | 'saida';
  quantidade: string | number;
  motivo: string | null;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  data_movimentacao: string;
}

interface Summary {
  total: number;
  sem_estoque: number;
  estoque_baixo: number;
}

type Situacao = 'sem_estoque' | 'baixo' | 'normal' | 'inativo';

const situacaoDoProduto = (p: Product): Situacao => {
  if (!p.ativo) return 'inativo';
  const qtd = Number(p.quantidade_atual);
  const minimo = Number(p.estoque_minimo);
  if (qtd === 0) return 'sem_estoque';
  if (qtd <= minimo) return 'baixo';
  return 'normal';
};

const SITUACAO_LABEL: Record<Situacao, string> = {
  sem_estoque: 'Sem estoque',
  baixo: 'Estoque baixo',
  normal: 'Normal',
  inativo: 'Inativo',
};

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

const FORM_VAZIO = { nome: '', descricao: '', categoria: '', unidade_medida: '', estoque_minimo: '0' };

const Inventory: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [aba, setAba] = useState<'produtos' | 'historico'>('produtos');

  const [resumo, setResumo] = useState<Summary>({ total: 0, sem_estoque: 0, estoque_baixo: 0 });
  const [produtos, setProdutos] = useState<Product[]>([]);
  const [historico, setHistorico] = useState<Movement[]>([]);

  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroSituacao, setFiltroSituacao] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formAberto, setFormAberto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);

  const [movimentando, setMovimentando] = useState<{ produtoId: number; tipo: 'entrada' | 'saida' } | null>(null);
  const [quantidadeMov, setQuantidadeMov] = useState('');
  const [motivoMov, setMotivoMov] = useState('');

  const toggleMenu = () => setIsMenuOpen((v) => !v);
  const mostrarSucesso = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchResumo = useCallback(async () => {
    const res = await apiFetch('/estoque/resumo');
    if (res.ok) setResumo(await res.json());
  }, []);

  const fetchProdutos = useCallback(async () => {
    const params = new URLSearchParams();
    if (busca.trim()) params.set('nome', busca.trim());
    if (filtroCategoria) params.set('categoria', filtroCategoria);
    if (filtroSituacao) params.set('situacao', filtroSituacao);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`/estoque/produtos${query}`);
    if (res.ok) {
      setProdutos(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar produtos.');
    }
  }, [busca, filtroCategoria, filtroSituacao]);

  const fetchHistorico = useCallback(async () => {
    const res = await apiFetch('/estoque/movimentacoes');
    if (res.ok) {
      setHistorico(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar histórico de movimentações.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchResumo(), fetchProdutos()])
      .catch(() => setError('Não foi possível conectar ao servidor.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchProdutos();
  }, [busca, filtroCategoria, filtroSituacao, fetchProdutos]);

  useEffect(() => {
    if (aba === 'historico') fetchHistorico();
  }, [aba, fetchHistorico]);

  const categorias = useMemo(
    () => Array.from(new Set(produtos.map((p) => p.categoria).filter((c): c is string => !!c))).sort(),
    [produtos],
  );

  // ---- cadastro / edição --------------------------------------------------

  const abrirNovoProduto = () => {
    setEditandoId(null);
    setForm(FORM_VAZIO);
    setFormAberto(true);
  };

  const abrirEdicao = (p: Product) => {
    setEditandoId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao || '',
      categoria: p.categoria || '',
      unidade_medida: p.unidade_medida,
      estoque_minimo: String(p.estoque_minimo),
    });
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditandoId(null);
    setForm(FORM_VAZIO);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      categoria: form.categoria.trim() || null,
      unidade_medida: form.unidade_medida.trim(),
      estoque_minimo: Number(form.estoque_minimo) || 0,
    };

    try {
      const res = editandoId
        ? await apiFetch(`/estoque/produtos/${editandoId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiFetch('/estoque/produtos', { method: 'POST', body: JSON.stringify(payload) });

      const data = await res.json();
      if (res.ok) {
        mostrarSucesso(editandoId ? 'Produto atualizado com sucesso!' : 'Produto cadastrado com sucesso!');
        fecharForm();
        await Promise.all([fetchResumo(), fetchProdutos()]);
      } else {
        setError(data.message || 'Erro ao salvar produto.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  const handleDesativar = async (p: Product) => {
    if (!window.confirm(`Desativar o produto "${p.nome}"? O histórico de movimentações será preservado.`)) return;
    setError(null);
    try {
      const res = await apiFetch(`/estoque/produtos/${p.id}/desativar`, { method: 'PUT' });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso('Produto desativado com sucesso!');
        await Promise.all([fetchResumo(), fetchProdutos()]);
      } else {
        setError(data.message || 'Erro ao desativar produto.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  // ---- entrada / saída -----------------------------------------------------

  const abrirMovimentacao = (produtoId: number, tipo: 'entrada' | 'saida') => {
    setMovimentando({ produtoId, tipo });
    setQuantidadeMov('');
    setMotivoMov('');
  };

  const cancelarMovimentacao = () => setMovimentando(null);

  const confirmarMovimentacao = async () => {
    if (!movimentando) return;
    const quantidade = Number(quantidadeMov);
    if (!quantidade || quantidade <= 0) {
      setError('Informe uma quantidade maior que zero.');
      return;
    }
    setError(null);
    try {
      const res = await apiFetch(`/estoque/produtos/${movimentando.produtoId}/${movimentando.tipo}`, {
        method: 'POST',
        body: JSON.stringify({ quantidade, motivo: motivoMov.trim() || undefined }),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso(data.message || 'Movimentação registrada com sucesso!');
        setMovimentando(null);
        await Promise.all([fetchResumo(), fetchProdutos()]);
        if (aba === 'historico') await fetchHistorico();
      } else {
        setError(data.message || 'Erro ao registrar movimentação.');
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  return (
    <InventoryContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Controle de Estoque</Title>
          <PrimaryButton onClick={abrirNovoProduto}>Novo produto</PrimaryButton>
        </Header>

        {successMsg && <FeedbackMessage>{successMsg}</FeedbackMessage>}
        {error && <FeedbackMessage error>{error}</FeedbackMessage>}

        <SummaryGrid>
          <SummaryCard accent={colors.primaryBlue}>
            <h2>Produtos cadastrados</h2>
            <p>{resumo.total}</p>
          </SummaryCard>
          <SummaryCard accent="#f59e0b">
            <h2>Estoque baixo</h2>
            <p>{resumo.estoque_baixo}</p>
          </SummaryCard>
          <SummaryCard accent="#dc3545">
            <h2>Sem estoque</h2>
            <p>{resumo.sem_estoque}</p>
          </SummaryCard>
        </SummaryGrid>

        {formAberto && (
          <FormCard onSubmit={handleSubmitForm}>
            <FormField>
              <label>Nome *</label>
              <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
            </FormField>
            <FormField>
              <label>Categoria</label>
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
            </FormField>
            <FormField>
              <label>Unidade de medida *</label>
              <input
                value={form.unidade_medida}
                onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}
                placeholder="un, kg, l..."
                required
              />
            </FormField>
            <FormField>
              <label>Estoque mínimo</label>
              <input
                type="number"
                min={0}
                step="any"
                value={form.estoque_minimo}
                onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
              />
            </FormField>
            <FormField style={{ gridColumn: '1 / -1' }}>
              <label>Descrição</label>
              <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </FormField>
            <FormActions>
              <PrimaryButton type="submit">{editandoId ? 'Salvar alterações' : 'Cadastrar'}</PrimaryButton>
              <SecondaryButton type="button" onClick={fecharForm}>
                Cancelar
              </SecondaryButton>
            </FormActions>
          </FormCard>
        )}

        <TabsBar>
          <TabButton active={aba === 'produtos'} onClick={() => setAba('produtos')}>
            Produtos
          </TabButton>
          <TabButton active={aba === 'historico'} onClick={() => setAba('historico')}>
            Histórico
          </TabButton>
        </TabsBar>

        {aba === 'produtos' && (
          <ActionsBar>
            <SearchInput placeholder="Pesquisar por nome..." value={busca} onChange={(e) => setBusca(e.target.value)} />
            <FilterSelect value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
              <option value="">Todas as categorias</option>
              {categorias.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect value={filtroSituacao} onChange={(e) => setFiltroSituacao(e.target.value)}>
              <option value="">Todas as situações</option>
              <option value="normal">Normal</option>
              <option value="baixo">Estoque baixo</option>
              <option value="sem_estoque">Sem estoque</option>
              <option value="inativo">Inativos</option>
            </FilterSelect>
            <span>{produtos.length} produto(s)</span>
          </ActionsBar>
        )}

        {loading ? (
          <p>Carregando...</p>
        ) : aba === 'produtos' ? (
          <TableContainer>
            <StyledTable>
              <thead>
                <TableRow header>
                  <TableHeader>Produto</TableHeader>
                  <TableHeader>Categoria</TableHeader>
                  <TableHeader>Qtd. atual</TableHeader>
                  <TableHeader>Mínimo</TableHeader>
                  <TableHeader>Situação</TableHeader>
                  <TableHeader>Movimentar</TableHeader>
                  <TableHeader>Ações</TableHeader>
                </TableRow>
              </thead>
              <tbody>
                {produtos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: 'center' }}>
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                )}
                {produtos.map((p) => {
                  const situacao = situacaoDoProduto(p);
                  const emMovimentacao = movimentando?.produtoId === p.id;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.nome}</TableCell>
                      <TableCell>{p.categoria || '—'}</TableCell>
                      <TableCell>
                        {Number(p.quantidade_atual)} {p.unidade_medida}
                      </TableCell>
                      <TableCell>
                        {Number(p.estoque_minimo)} {p.unidade_medida}
                      </TableCell>
                      <TableCell>
                        <SituacaoBadge situacao={situacao}>{SITUACAO_LABEL[situacao]}</SituacaoBadge>
                      </TableCell>
                      <TableCell>
                        {emMovimentacao ? (
                          <MovementPanel>
                            <SmallInput
                              type="number"
                              min={0}
                              step="any"
                              placeholder="Qtd."
                              autoFocus
                              value={quantidadeMov}
                              onChange={(e) => setQuantidadeMov(e.target.value)}
                            />
                            <SmallInput
                              placeholder="Motivo (opcional)"
                              value={motivoMov}
                              onChange={(e) => setMotivoMov(e.target.value)}
                            />
                            <FontAwesomeIcon icon={faCheck} title="Confirmar" onClick={confirmarMovimentacao} />
                            <FontAwesomeIcon icon={faTimes} title="Cancelar" onClick={cancelarMovimentacao} />
                          </MovementPanel>
                        ) : (
                          p.ativo && (
                            <>
                              <FontAwesomeIcon icon={faPlus} title="Registrar entrada" onClick={() => abrirMovimentacao(p.id, 'entrada')} />
                              <FontAwesomeIcon icon={faMinus} title="Registrar saída" onClick={() => abrirMovimentacao(p.id, 'saida')} />
                            </>
                          )
                        )}
                      </TableCell>
                      <TableActionCell>
                        <FontAwesomeIcon icon={faEdit} title="Editar" onClick={() => abrirEdicao(p)} />
                        {p.ativo && <FontAwesomeIcon icon={faBan} title="Desativar" onClick={() => handleDesativar(p)} />}
                      </TableActionCell>
                    </TableRow>
                  );
                })}
              </tbody>
            </StyledTable>
          </TableContainer>
        ) : (
          <TableContainer>
            <StyledTable>
              <thead>
                <TableRow header>
                  <TableHeader>Produto</TableHeader>
                  <TableHeader>Tipo</TableHeader>
                  <TableHeader>Quantidade</TableHeader>
                  <TableHeader>Funcionário</TableHeader>
                  <TableHeader>Motivo</TableHeader>
                  <TableHeader>Data</TableHeader>
                </TableRow>
              </thead>
              <tbody>
                {historico.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} style={{ textAlign: 'center' }}>
                      Nenhuma movimentação encontrada.
                    </TableCell>
                  </TableRow>
                )}
                {historico.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.produto_nome}</TableCell>
                    <TableCell>{m.tipo === 'entrada' ? 'Entrada' : 'Saída'}</TableCell>
                    <TableCell>{Number(m.quantidade)}</TableCell>
                    <TableCell>{m.funcionario_nome || '—'}</TableCell>
                    <TableCell>{m.motivo || '—'}</TableCell>
                    <TableCell>{formatarData(m.data_movimentacao)}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </StyledTable>
          </TableContainer>
        )}
      </MainContent>
    </InventoryContainer>
  );
};

export default Inventory;
