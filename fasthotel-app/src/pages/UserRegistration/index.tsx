import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logofasthotel.png';

const field: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '4px',
};
const inputStyle: React.CSSProperties = {
  padding: '12px 16px', borderRadius: '8px', border: '1.5px solid #d1d5db',
  fontSize: '15px', outline: 'none', width: '100%', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = { fontSize: '13px', fontWeight: 600, color: '#374151' };

type Role = 'admin' | 'recepcionista' | 'cliente';

const UserRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [tipo, setTipo] = useState<Role>('recepcionista');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (nome.trim().length < 3) { setError('Nome deve ter pelo menos 3 caracteres.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('E-mail inválido.'); return; }
    if (senha.length < 3) { setError('Senha deve ter pelo menos 3 caracteres.'); return; }
    if (senha !== confirmar) { setError('As senhas não coincidem.'); return; }

    setLoading(true);
    try {
      const res = await fetch(`${process.env.REACT_APP_API_URL}/usuarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha, tipo_usuario: tipo }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(`Usuário "${nome}" registrado com sucesso!`);
        setNome(''); setEmail(''); setSenha(''); setConfirmar(''); setTipo('recepcionista');
      } else {
        const msg = data.errors?.map((e: any) => e.msg).join(' ') || data.message || 'Erro ao registrar.';
        setError(msg);
      }
    } catch {
      setError('Não foi possível conectar ao servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#1a2a42', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px', gap: '8px' }}>
          <img src={logo} alt="FastHotel" style={{ width: '60px' }} />
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1a2a42' }}>FASTHOTEL</h1>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>Registrar novo usuário do sistema</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={field}>
            <label style={labelStyle}>Nome *</label>
            <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" required />
          </div>

          <div style={field}>
            <label style={labelStyle}>E-mail *</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@hotel.com" required />
          </div>

          <div style={field}>
            <label style={labelStyle}>Tipo de acesso *</label>
            <select
              style={{ ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='%236b7280' viewBox='0 0 16 16'%3E%3Cpath d='M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
              value={tipo}
              onChange={e => setTipo(e.target.value as Role)}
            >
              <option value="recepcionista">Recepcionista</option>
              <option value="admin">Administrador</option>
              <option value="cliente">Cliente / Hóspede</option>
            </select>
          </div>

          <div style={field}>
            <label style={labelStyle}>Senha *</label>
            <input style={inputStyle} type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 3 caracteres" required />
          </div>

          <div style={field}>
            <label style={labelStyle}>Confirmar senha *</label>
            <input style={inputStyle} type="password" value={confirmar} onChange={e => setConfirmar(e.target.value)} placeholder="Repita a senha" required />
          </div>

          {error && <p style={{ color: '#dc2626', fontSize: '13px', textAlign: 'center' }}>{error}</p>}
          {success && <p style={{ color: '#16a34a', fontSize: '13px', textAlign: 'center' }}>{success}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', borderRadius: '8px', border: 'none', background: '#2c73d2', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}
          >
            {loading ? 'Registrando...' : 'Registrar Usuário'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            style={{ padding: '11px', borderRadius: '8px', border: '1.5px solid #d1d5db', background: 'transparent', color: '#6b7280', fontWeight: 600, fontSize: '14px', cursor: 'pointer' }}
          >
            Voltar ao Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default UserRegistration;
