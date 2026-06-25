import React, { useEffect, useMemo, useState } from 'react';
import DatePickerField from '../../components/DatePickerField';
import SideMenu from '../../components/SideMenu';
import { HomeContainer, MainContent } from '../Home/styles';

// --- TIPOS DE DADOS PARA OS RELATÓRIOS ---
type TopServico = { id: number; nome: string; quantidade_total: number; faturamento: number; };
type HospedeTop = { id: number; nome: string; qtd_reservas: number; total_gasto: number; };
type TicketHospede = { id: number; nome: string; qtd_reservas: number; ticket_medio: number; };
type PrecoMedioTipoQuarto = { tipo_quarto: string; preco_medio: number; };
type HospedeUmaReserva = { id: number; nome: string; data_reserva: string; };

// Componente Card
const Card: React.FC<{
  title: string;
  csvTarget: string;
  hasData: boolean;
  onCsv: () => void;
  children: React.ReactNode;
}> = ({ title, csvTarget, hasData, onCsv, children }) => (
  <div style={{
    background: '#fff', padding: 16, borderRadius: 12,
    boxShadow: '0 6px 14px rgba(0,0,0,0.08)', border: '1px solid #eef2f7'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
      <button onClick={onCsv} disabled={!hasData} style={{
        padding: '6px 10px', borderRadius: 8, border: '1px solid #d7dee8',
        background: hasData ? '#f7fafc' : '#f1f1f1', cursor: hasData ? 'pointer' : 'not-allowed',
        fontSize: 12
      }} aria-label={`exportar ${csvTarget} para CSV`}>
        CSV
      </button>
    </div>
    {children}
  </div>
);

// Componentes auxiliares
const EmptyState = ({ msg = 'Sem dados no período selecionado.' }) => (<div style={{ padding: 16, color: '#6b7280', fontSize: 14 }}>{msg}</div>);
const Spinner = () => (<div style={{ padding: 24, display: 'flex', justifyContent: 'center' }}> <div style={{ width: 24, height: 24, border: '3px solid #e5e7eb', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /> <style> {`@keyframes spin { to { transform: rotate(360deg) } }`} </style> </div>);
const tableStyle: React.CSSProperties = { width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 14 };
const thStyle: React.CSSProperties = { background: '#f8fafc', textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #eef2f7', position: 'sticky', top: 0 };
const tdStyle: React.CSSProperties = { padding: '10px 8px', borderBottom: '1px solid #f1f5f9' };


const Analytics: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(true);
  const [from, setFrom] = useState<string>(() => new Date(2025, 9, 1).toISOString().slice(0, 10)); // Padrão para Outubro
  const [to, setTo] = useState<string>(() => new Date(2025, 9, 31).toISOString().slice(0, 10)); // Padrão para Outubro

  // Estados para os dados dos relatórios
  const [loading, setLoading] = useState(false);
  const [topServ, setTopServ] = useState<TopServico[]>([]);
  const [hospTop, setHospTop] = useState<HospedeTop[]>([]);
  const [ticket, setTicket] = useState<TicketHospede[]>([]);
  const [precoMedioQuarto, setPrecoMedioQuarto] = useState<PrecoMedioTipoQuarto[]>([]);
  const [hospedesUmaReserva, setHospedesUmaReserva] = useState<HospedeUmaReserva[]>([]);

  const token = localStorage.getItem('token');
  const API = process.env.REACT_APP_API_URL;

  function fmtBRL(v: number) { return (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); }

  // =========================================================================
  // CORREÇÃO 1: Adicionar o header 'x-auth-token' na chamada da API
  // =========================================================================
  async function api<T = any>(path: string): Promise<T> {
    const res = await fetch(path, {
      headers: {
        'x-auth-token': token || '' // Usando o header de autenticação correto
      }
    });
    if (!res.ok) {
      // Tenta ler a mensagem de erro do backend
      const errorBody = await res.json().catch(() => ({ message: res.statusText }));
      throw new Error(errorBody.message || 'Erro desconhecido');
    }
    return res.json();
  }

  async function carregar() {
    if (!from || !to) { alert('Defina as datas De/Até.'); return; }
    setLoading(true);
    try {
      const [
        resTopServ,
        resHospTop,
        resTicket,
        resPrecoMedio,
        resHospUmaReserva,
      ] = await Promise.all([
        api<TopServico[]>(`${API}/relatorios/top-servicos?from=${from}&to=${to}&limit=10`),
        api<HospedeTop[]>(`${API}/relatorios/hospedes-top?from=${from}&to=${to}&limit=10`),
        api<TicketHospede[]>(`${API}/relatorios/ticket-medio-por-hospede?from=${from}&to=${to}`),
        api<PrecoMedioTipoQuarto[]>(`${API}/relatorios/preco-medio-por-tipo-quarto`),
        // =========================================================================
        // CORREÇÃO 2: Corrigir o nome da rota para 'hospedes-uma-estadia'
        // =========================================================================
        api<HospedeUmaReserva[]>(`${API}/relatorios/hospedes-uma-estadia`),
      ]);
      setTopServ(resTopServ);
      setHospTop(resHospTop);
      setTicket(resTicket);
      setPrecoMedioQuarto(resPrecoMedio);
      setHospedesUmaReserva(resHospUmaReserva);
    } catch (err: any) {
      console.error(err);
      alert('Falha ao carregar relatórios: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function exportCSV(tableId: string) {
    const table = document.getElementById(tableId);
    if (!table) return;
    const rows = Array.from(table.querySelectorAll('tr'))
      .map(tr => Array.from(tr.children).map(td => `"${(td as HTMLElement).innerText.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([`\uFEFF${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${tableId}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => { carregar(); }, []);

  return (
    <HomeContainer>
      <SideMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen(!isMenuOpen)} />
      <MainContent isMenuOpen={isMenuOpen}>
        <h1>Analytics - Mineração de Dados</h1>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '12px 0', background: '#fff', border: '1px solid #eef2f7', borderRadius: 12, padding: 12 }}>
          <DatePickerField label="De" value={from} onChange={setFrom} />
          <DatePickerField label="Até" value={to} onChange={setTo} minDate={from ? new Date(from + 'T00:00:00') : undefined} />
          <button onClick={carregar} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer' }}>
            {loading ? 'Carregando...' : 'Aplicar Filtros'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(400px,1fr))', gap: 16 }}>

          <Card title="Top 10 Serviços Mais Consumidos" csvTarget="tblTopServ" hasData={topServ.length > 0} onCsv={() => exportCSV('tblTopServ')}>
            {loading ? <Spinner /> : topServ.length === 0 ? <EmptyState /> : (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table id="tblTopServ" style={tableStyle}>
                  <thead><tr><th style={thStyle}>Serviço</th><th style={thStyle}>Qtd. Consumida</th><th style={thStyle}>Faturamento</th></tr></thead>
                  <tbody>{topServ.map((r) => (<tr key={r.id}> <td style={tdStyle}>{r.nome}</td> <td style={tdStyle}>{r.quantidade_total ?? 0}</td> <td style={tdStyle}>{fmtBRL(r.faturamento)}</td> </tr>))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Top 10 Hóspedes por Gasto Total" csvTarget="tblHospTop" hasData={hospTop.length > 0} onCsv={() => exportCSV('tblHospTop')}>
            {loading ? <Spinner /> : hospTop.length === 0 ? <EmptyState /> : (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table id="tblHospTop" style={tableStyle}>
                  <thead><tr><th style={thStyle}>Hóspede</th><th style={thStyle}>Reservas</th><th style={thStyle}>Total Gasto</th></tr></thead>
                  <tbody>{hospTop.map((r) => (<tr key={r.id}> <td style={tdStyle}>{r.nome}</td> <td style={tdStyle}>{r.qtd_reservas}</td> <td style={tdStyle}>{fmtBRL(r.total_gasto)}</td> </tr>))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Ticket Médio por Hóspede" csvTarget="tblTicket" hasData={ticket.length > 0} onCsv={() => exportCSV('tblTicket')}>
            {loading ? <Spinner /> : ticket.length === 0 ? <EmptyState /> : (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table id="tblTicket" style={tableStyle}>
                  <thead><tr><th style={thStyle}>Hóspede</th><th style={thStyle}>Reservas</th><th style={thStyle}>Ticket Médio</th></tr></thead>
                  <tbody>{ticket.map((r) => (<tr key={r.id}> <td style={tdStyle}>{r.nome}</td> <td style={tdStyle}>{r.qtd_reservas}</td> <td style={tdStyle}>{fmtBRL(r.ticket_medio)}</td> </tr>))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Preço Médio por Tipo de Quarto" csvTarget="tblPrecoMedioQuarto" hasData={precoMedioQuarto.length > 0} onCsv={() => exportCSV('tblPrecoMedioQuarto')}>
            {loading ? <Spinner /> : precoMedioQuarto.length === 0 ? <EmptyState msg="Sem dados para este relatório." /> : (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table id="tblPrecoMedioQuarto" style={tableStyle}>
                  <thead><tr><th style={thStyle}>Tipo de Quarto</th><th style={thStyle}>Preço Médio da Diária</th></tr></thead>
                  <tbody>{precoMedioQuarto.map((r, i) => (<tr key={i}> <td style={tdStyle}>{r.tipo_quarto}</td> <td style={tdStyle}>{fmtBRL(r.preco_medio)}</td> </tr>))}</tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Hóspedes com Apenas Uma Reserva" csvTarget="tblHospUmaReserva" hasData={hospedesUmaReserva.length > 0} onCsv={() => exportCSV('tblHospUmaReserva')}>
            {loading ? <Spinner /> : hospedesUmaReserva.length === 0 ? <EmptyState msg="Nenhum hóspede com apenas uma reserva." /> : (
              <div style={{ maxHeight: 360, overflow: 'auto' }}>
                <table id="tblHospUmaReserva" style={tableStyle}>
                  <thead><tr><th style={thStyle}>Nome do Hóspede</th><th style={thStyle}>Data da Única Reserva</th></tr></thead>
                  <tbody>
                    {hospedesUmaReserva.map((r) => (
                      <tr key={r.id}>
                        <td style={tdStyle}>{r.nome}</td>
                        {/* LINHA CORRIGIDA ABAIXO */}
                        <td style={tdStyle}>{new Date(r.data_reserva + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </MainContent>
    </HomeContainer>
  );
};

export default Analytics;