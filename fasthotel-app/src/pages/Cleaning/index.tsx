// src/pages/Cleaning/index.tsx
import React, { useCallback, useEffect, useState } from 'react';
import SideMenu from '../../components/SideMenu';
import { apiFetch } from '../../utils/api';

import {
  CleaningContainer,
  MainContent,
  Header,
  Title,
  SummaryGrid,
  SummaryCard,
  TabsBar,
  TabButton,
  ActionsBar,
  FilterSelect,
  TableContainer,
  StyledTable,
  TableHeader,
  TableRow,
  TableCell,
  StatusBadge,
  SmallSelect,
  SmallInput,
  FeedbackMessage,
} from './styles';

type StatusLimpeza = 'pendente' | 'em_andamento' | 'concluida';

interface RoomCleaningRow {
  quarto_id: number;
  numero: string;
  tipo: string;
  status_ocupacao: string;
  limpeza_id: number | null;
  status_limpeza: StatusLimpeza | null;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  observacoes: string | null;
  data_solicitacao: string | null;
  data_inicio: string | null;
  data_conclusao: string | null;
}

interface CleaningRecord {
  id: number;
  quarto_id: number;
  quarto_numero: string;
  status: StatusLimpeza;
  funcionario_id: number | null;
  funcionario_nome: string | null;
  reserva_origem_id: number | null;
  observacoes: string | null;
  data_solicitacao: string;
  data_inicio: string | null;
  data_conclusao: string | null;
}

interface Funcionario {
  id: number;
  nome: string;
}

interface Resumo {
  pendente: number;
  em_andamento: number;
  concluida: number;
}

const STATUS_LABEL: Record<StatusLimpeza, string> = {
  pendente: 'Pendente',
  em_andamento: 'Em andamento',
  concluida: 'Concluída',
};

const formatarData = (iso: string | null) => (iso ? new Date(iso).toLocaleString('pt-BR') : '—');

const Cleaning: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [aba, setAba] = useState<'quartos' | 'historico'>('quartos');

  const [resumo, setResumo] = useState<Resumo>({ pendente: 0, em_andamento: 0, concluida: 0 });
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [quartos, setQuartos] = useState<RoomCleaningRow[]>([]);
  const [historico, setHistorico] = useState<CleaningRecord[]>([]);

  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroQuarto, setFiltroQuarto] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const toggleMenu = () => setIsMenuOpen((v) => !v);

  const mostrarSucesso = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const fetchResumo = useCallback(async () => {
    const res = await apiFetch('/limpeza/resumo');
    if (res.ok) setResumo(await res.json());
  }, []);

  const fetchFuncionarios = useCallback(async () => {
    const res = await apiFetch('/limpeza/funcionarios');
    if (res.ok) setFuncionarios(await res.json());
  }, []);

  const fetchQuartos = useCallback(async () => {
    const res = await apiFetch('/limpeza/quartos');
    if (res.ok) {
      setQuartos(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar quartos.');
    }
  }, []);

  const fetchHistorico = useCallback(async () => {
    const params = new URLSearchParams();
    if (filtroStatus) params.set('status', filtroStatus);
    if (filtroQuarto) params.set('quarto_id', filtroQuarto);
    const query = params.toString() ? `?${params.toString()}` : '';

    const res = await apiFetch(`/limpeza${query}`);
    if (res.ok) {
      setHistorico(await res.json());
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.message || 'Erro ao buscar histórico de limpezas.');
    }
  }, [filtroStatus, filtroQuarto]);

  const carregarTudo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchResumo(), fetchFuncionarios(), fetchQuartos()]);
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  }, [fetchResumo, fetchFuncionarios, fetchQuartos]);

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (aba === 'historico') {
      fetchHistorico();
    }
  }, [aba, fetchHistorico]);

  const atualizarLimpeza = async (
    limpezaId: number,
    patch: { status?: StatusLimpeza; funcionario_id?: number; observacoes?: string },
  ) => {
    setError(null);
    try {
      const res = await apiFetch(`/limpeza/${limpezaId}`, {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (res.ok) {
        mostrarSucesso('Limpeza atualizada com sucesso!');
        await fetchResumo();
        await fetchQuartos();
        if (aba === 'historico') await fetchHistorico();
      } else {
        setError(data.message || 'Erro ao atualizar limpeza.');
      }
    } catch (err) {
      setError('Não foi possível conectar ao servidor.');
    }
  };

  const handleStatusChange = (row: RoomCleaningRow, novoStatus: StatusLimpeza) => {
    if (!row.limpeza_id) return;
    atualizarLimpeza(row.limpeza_id, { status: novoStatus });
  };

  const handleFuncionarioChange = (row: RoomCleaningRow, funcionarioId: string) => {
    if (!row.limpeza_id || !funcionarioId) return;
    atualizarLimpeza(row.limpeza_id, { funcionario_id: Number(funcionarioId) });
  };

  const handleObservacoesBlur = (row: RoomCleaningRow, valor: string) => {
    if (!row.limpeza_id || valor === (row.observacoes || '')) return;
    atualizarLimpeza(row.limpeza_id, { observacoes: valor });
  };

  const quartosFiltrados = quartos.filter((q) => {
    if (filtroStatus && q.status_limpeza !== filtroStatus) return false;
    if (filtroQuarto && String(q.quarto_id) !== filtroQuarto) return false;
    return true;
  });

  return (
    <CleaningContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={toggleMenu} />
      <MainContent isMenuOpen={isMenuOpen}>
        <Header>
          <Title>Controle de Limpeza</Title>
        </Header>

        {successMsg && <FeedbackMessage>{successMsg}</FeedbackMessage>}
        {error && <FeedbackMessage error>{error}</FeedbackMessage>}

        <SummaryGrid>
          <SummaryCard accent="#dc3545">
            <h2>Pendentes</h2>
            <p>{resumo.pendente}</p>
          </SummaryCard>
          <SummaryCard accent="#f59e0b">
            <h2>Em andamento</h2>
            <p>{resumo.em_andamento}</p>
          </SummaryCard>
          <SummaryCard accent="#28a745">
            <h2>Concluídas</h2>
            <p>{resumo.concluida}</p>
          </SummaryCard>
        </SummaryGrid>

        <TabsBar>
          <TabButton active={aba === 'quartos'} onClick={() => setAba('quartos')}>
            Quartos
          </TabButton>
          <TabButton active={aba === 'historico'} onClick={() => setAba('historico')}>
            Histórico
          </TabButton>
        </TabsBar>

        <ActionsBar>
          <FilterSelect value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="">Todos os status</option>
            <option value="pendente">Pendente</option>
            <option value="em_andamento">Em andamento</option>
            <option value="concluida">Concluída</option>
          </FilterSelect>
          <FilterSelect value={filtroQuarto} onChange={(e) => setFiltroQuarto(e.target.value)}>
            <option value="">Todos os quartos</option>
            {quartos.map((q) => (
              <option key={q.quarto_id} value={q.quarto_id}>
                Quarto {q.numero}
              </option>
            ))}
          </FilterSelect>
          <span>
            {aba === 'quartos'
              ? `${quartosFiltrados.length} quarto(s)`
              : `${historico.length} registro(s)`}
          </span>
        </ActionsBar>

        {loading ? (
          <p>Carregando...</p>
        ) : aba === 'quartos' ? (
          <TableContainer>
            <StyledTable>
              <thead>
                <TableRow header>
                  <TableHeader>Quarto</TableHeader>
                  <TableHeader>Tipo</TableHeader>
                  <TableHeader>Ocupação</TableHeader>
                  <TableHeader>Limpeza</TableHeader>
                  <TableHeader>Atualizar status</TableHeader>
                  <TableHeader>Funcionário</TableHeader>
                  <TableHeader>Observações</TableHeader>
                  <TableHeader>Atualizado em</TableHeader>
                </TableRow>
              </thead>
              <tbody>
                {quartosFiltrados.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} style={{ textAlign: 'center' }}>
                      Nenhum quarto encontrado para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
                {quartosFiltrados.map((row) => (
                  <RoomRow
                    key={row.quarto_id}
                    row={row}
                    funcionarios={funcionarios}
                    onStatusChange={handleStatusChange}
                    onFuncionarioChange={handleFuncionarioChange}
                    onObservacoesBlur={handleObservacoesBlur}
                  />
                ))}
              </tbody>
            </StyledTable>
          </TableContainer>
        ) : (
          <TableContainer>
            <StyledTable>
              <thead>
                <TableRow header>
                  <TableHeader>Quarto</TableHeader>
                  <TableHeader>Status</TableHeader>
                  <TableHeader>Funcionário</TableHeader>
                  <TableHeader>Solicitada em</TableHeader>
                  <TableHeader>Início</TableHeader>
                  <TableHeader>Conclusão</TableHeader>
                  <TableHeader>Observações</TableHeader>
                </TableRow>
              </thead>
              <tbody>
                {historico.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} style={{ textAlign: 'center' }}>
                      Nenhuma limpeza encontrada para os filtros selecionados.
                    </TableCell>
                  </TableRow>
                )}
                {historico.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.quarto_numero}</TableCell>
                    <TableCell>
                      <StatusBadge status={h.status}>{STATUS_LABEL[h.status]}</StatusBadge>
                    </TableCell>
                    <TableCell>{h.funcionario_nome || '—'}</TableCell>
                    <TableCell>{formatarData(h.data_solicitacao)}</TableCell>
                    <TableCell>{formatarData(h.data_inicio)}</TableCell>
                    <TableCell>{formatarData(h.data_conclusao)}</TableCell>
                    <TableCell>{h.observacoes || '—'}</TableCell>
                  </TableRow>
                ))}
              </tbody>
            </StyledTable>
          </TableContainer>
        )}
      </MainContent>
    </CleaningContainer>
  );
};

// Linha da aba "Quartos" isolada em componente próprio para manter um estado local
// de observações (evita re-render de toda a tabela a cada tecla digitada).
const RoomRow: React.FC<{
  row: RoomCleaningRow;
  funcionarios: Funcionario[];
  onStatusChange: (row: RoomCleaningRow, status: StatusLimpeza) => void;
  onFuncionarioChange: (row: RoomCleaningRow, funcionarioId: string) => void;
  onObservacoesBlur: (row: RoomCleaningRow, valor: string) => void;
}> = ({ row, funcionarios, onStatusChange, onFuncionarioChange, onObservacoesBlur }) => {
  const [observacoes, setObservacoes] = useState(row.observacoes || '');

  useEffect(() => {
    setObservacoes(row.observacoes || '');
  }, [row.observacoes]);

  const temRegistro = row.limpeza_id !== null;

  return (
    <TableRow>
      <TableCell>{row.numero}</TableCell>
      <TableCell>{row.tipo}</TableCell>
      <TableCell>{row.status_ocupacao}</TableCell>
      <TableCell>
        <StatusBadge status={row.status_limpeza}>
          {row.status_limpeza ? STATUS_LABEL[row.status_limpeza] : 'Sem registro'}
        </StatusBadge>
      </TableCell>
      <TableCell>
        <SmallSelect
          value={row.status_limpeza || ''}
          disabled={!temRegistro}
          onChange={(e) => onStatusChange(row, e.target.value as StatusLimpeza)}
        >
          {!temRegistro && <option value="">—</option>}
          <option value="pendente">Pendente</option>
          <option value="em_andamento">Em andamento</option>
          <option value="concluida">Concluída</option>
        </SmallSelect>
      </TableCell>
      <TableCell>
        <SmallSelect
          value={row.funcionario_id || ''}
          disabled={!temRegistro}
          onChange={(e) => onFuncionarioChange(row, e.target.value)}
        >
          <option value="">Selecionar...</option>
          {funcionarios.map((f) => (
            <option key={f.id} value={f.id}>
              {f.nome}
            </option>
          ))}
        </SmallSelect>
      </TableCell>
      <TableCell>
        <SmallInput
          value={observacoes}
          placeholder="Observações"
          disabled={!temRegistro}
          onChange={(e) => setObservacoes(e.target.value)}
          onBlur={() => onObservacoesBlur(row, observacoes)}
        />
      </TableCell>
      <TableCell>{formatarData(row.data_conclusao || row.data_inicio || row.data_solicitacao)}</TableCell>
    </TableRow>
  );
};

export default Cleaning;
