BEGIN;

CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  senha VARCHAR(255) NOT NULL,
  tipo_usuario VARCHAR(30) NOT NULL DEFAULT 'cliente',
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quartos (
  id SERIAL PRIMARY KEY,
  numero VARCHAR(20) NOT NULL UNIQUE,
  tipo VARCHAR(80) NOT NULL,
  capacidade INTEGER NOT NULL CHECK (capacidade > 0),
  preco_por_noite NUMERIC(12,2) NOT NULL CHECK (preco_por_noite >= 0),
  status VARCHAR(30) NOT NULL DEFAULT 'disponivel',
  descricao TEXT,
  url_imagem TEXT
);

CREATE TABLE IF NOT EXISTS hospedes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  sobrenome VARCHAR(150),
  cpf VARCHAR(20) UNIQUE,
  rg VARCHAR(30) UNIQUE,
  data_nascimento DATE,
  email VARCHAR(255),
  telefone VARCHAR(30),
  endereco VARCHAR(255),
  numero VARCHAR(20),
  bairro VARCHAR(100),
  cep VARCHAR(20),
  cidade VARCHAR(100),
  estado VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS reservas (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
  quarto_id INTEGER NOT NULL REFERENCES quartos(id) ON DELETE RESTRICT,
  hospede_principal_id INTEGER REFERENCES hospedes(id) ON DELETE SET NULL,
  data_checkin DATE NOT NULL,
  data_checkout DATE NOT NULL,
  preco_total NUMERIC(12,2) NOT NULL CHECK (preco_total >= 0),
  status_reserva VARCHAR(30) NOT NULL DEFAULT 'confirmada',
  data_reserva TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (data_checkout > data_checkin)
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  preco NUMERIC(12,2) NOT NULL CHECK (preco >= 0)
);

CREATE TABLE IF NOT EXISTS consumos (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  servico_id INTEGER NOT NULL REFERENCES servicos(id) ON DELETE RESTRICT,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  preco_unitario NUMERIC(12,2) NOT NULL CHECK (preco_unitario >= 0)
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  valor_pago NUMERIC(12,2) NOT NULL CHECK (valor_pago >= 0),
  metodo_pagamento VARCHAR(50) NOT NULL,
  status_pagamento VARCHAR(30) NOT NULL DEFAULT 'pendente',
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS conversas_chat (
  id SERIAL PRIMARY KEY,
  hospede_id INTEGER NOT NULL REFERENCES hospedes(id) ON DELETE CASCADE,
  atendente_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS mensagens_chat (
  id SERIAL PRIMARY KEY,
  conversa_id INTEGER NOT NULL REFERENCES conversas_chat(id) ON DELETE CASCADE,
  remetente_tipo VARCHAR(30) NOT NULL,
  remetente_id_interno INTEGER NOT NULL,
  conteudo TEXT NOT NULL,
  data_envio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  lida BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_reservas_quarto_datas ON reservas (quarto_id, data_checkin, data_checkout);
CREATE INDEX IF NOT EXISTS idx_consumos_reserva ON consumos (reserva_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_reserva ON pagamentos (reserva_id);

COMMIT;
