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

-- Catálogo de tipos de apartamento (Standard/Luxo/Suíte/...), cadastrável pelo
-- admin. "quartos.tipo" (texto) é mantido e sincronizado automaticamente pelo
-- controller a partir de tipos_quarto.nome — preserva relatórios existentes
-- que agrupam por esse texto sem precisar alterá-los. Desativação é lógica
-- (ativo=FALSE), nunca exclusão, para preservar o histórico.
CREATE TABLE IF NOT EXISTS tipos_quarto (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(80) NOT NULL UNIQUE,
  descricao TEXT,
  capacidade_padrao INTEGER CHECK (capacidade_padrao IS NULL OR capacidade_padrao > 0),
  preco_base NUMERIC(12,2) CHECK (preco_base IS NULL OR preco_base >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);

-- Vínculo opcional (quartos cadastrados antes desta funcionalidade ficam com
-- tipo_id NULL, mas continuam funcionando normalmente via "tipo" em texto).
ALTER TABLE quartos ADD COLUMN IF NOT EXISTS tipo_id INTEGER REFERENCES tipos_quarto(id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_quartos_tipo_id ON quartos (tipo_id);

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

-- Correção: bookingController.finalizarReserva grava data_checkout_real no check-out,
-- mas a coluna nunca existiu neste schema. ADD COLUMN IF NOT EXISTS é idempotente e
-- não afeta linhas existentes (fica NULL até o próximo check-out).
ALTER TABLE reservas ADD COLUMN IF NOT EXISTS data_checkout_real TIMESTAMPTZ;

-- Controle de Limpeza. Status de limpeza é independente do status de ocupação
-- do quarto (quartos.status). "reserva_origem_id" é UNIQUE (quando não NULL)
-- para impedir que o mesmo checkout gere mais de um registro de limpeza.
CREATE TABLE IF NOT EXISTS limpezas (
  id SERIAL PRIMARY KEY,
  quarto_id INTEGER NOT NULL REFERENCES quartos(id) ON DELETE CASCADE,
  reserva_origem_id INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente',
  funcionario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  observacoes TEXT,
  data_solicitacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_inicio TIMESTAMPTZ,
  data_conclusao TIMESTAMPTZ,
  CONSTRAINT uq_limpezas_reserva_origem UNIQUE (reserva_origem_id)
);
CREATE INDEX IF NOT EXISTS idx_limpezas_quarto ON limpezas (quarto_id);
CREATE INDEX IF NOT EXISTS idx_limpezas_status ON limpezas (status);

-- Controle de Estoque. Catálogo próprio ("produtos"), separado do catálogo de
-- serviços/consumo de hóspedes ("servicos"/"consumos" abaixo) por decisão de
-- projeto. "quantidade_atual" só pode mudar através de movimentacoes_estoque
-- (entrada/saida) — nunca diretamente pelo cadastro/edição do produto.
CREATE TABLE IF NOT EXISTS produtos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  categoria VARCHAR(80),
  unidade_medida VARCHAR(20) NOT NULL,
  quantidade_atual NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (quantidade_atual >= 0),
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (estoque_minimo >= 0),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id SERIAL PRIMARY KEY,
  produto_id INTEGER NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  tipo VARCHAR(10) NOT NULL,
  quantidade NUMERIC(12,3) NOT NULL CHECK (quantidade > 0),
  motivo VARCHAR(255),
  funcionario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_movimentacao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON produtos (categoria);
CREATE INDEX IF NOT EXISTS idx_mov_estoque_produto ON movimentacoes_estoque (produto_id);

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

-- Correção: consumptionController sempre dependeu de "data_consumo" (exibição e
-- ordenação do histórico de consumo), mas a coluna nunca existiu neste schema —
-- mesmo problema encontrado em conversas_chat.status, aqui descoberto ao testar
-- a correção F07 (GET /api/consumos sempre retornava 500). ADD COLUMN IF NOT
-- EXISTS é idempotente e não afeta linhas existentes.
ALTER TABLE consumos ADD COLUMN IF NOT EXISTS data_consumo TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS pagamentos (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES reservas(id) ON DELETE CASCADE,
  valor_pago NUMERIC(12,2) NOT NULL CHECK (valor_pago >= 0),
  metodo_pagamento VARCHAR(50) NOT NULL,
  status_pagamento VARCHAR(30) NOT NULL DEFAULT 'pendente',
  data_pagamento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Fluxo de Caixa. "movimentacoes_financeiras" é o livro-caixa: lançamentos manuais
-- (origem='manual') e automáticos gerados a partir de pagamentos aprovados
-- (origem='automatica', vinculados por pagamento_id). UNIQUE(pagamento_id) impede
-- duplicar receita para o mesmo pagamento. SEM ON DELETE CASCADE: se o pagamento for
-- excluído, pagamento_id vira NULL (SET NULL) mas a linha e a "descricao" (que já
-- registra "Pagamento #X - Reserva #Y" no momento da criação) são preservadas —
-- o status passa para 'estornada' antes da exclusão (ver paymentController).
CREATE TABLE IF NOT EXISTS categorias_financeiras (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  tipo VARCHAR(10) NOT NULL
);

CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
  id SERIAL PRIMARY KEY,
  tipo VARCHAR(10) NOT NULL,
  categoria_id INTEGER REFERENCES categorias_financeiras(id) ON DELETE SET NULL,
  valor NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  descricao VARCHAR(255),
  forma_pagamento VARCHAR(50),
  data_movimentacao DATE NOT NULL DEFAULT CURRENT_DATE,
  origem VARCHAR(12) NOT NULL DEFAULT 'manual',
  pagamento_id INTEGER REFERENCES pagamentos(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'confirmada',
  criado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_mov_fin_pagamento UNIQUE (pagamento_id)
);
CREATE INDEX IF NOT EXISTS idx_mov_fin_data ON movimentacoes_financeiras (data_movimentacao);
CREATE INDEX IF NOT EXISTS idx_mov_fin_categoria ON movimentacoes_financeiras (categoria_id);
CREATE INDEX IF NOT EXISTS idx_mov_fin_tipo_status ON movimentacoes_financeiras (tipo, status);

CREATE TABLE IF NOT EXISTS conversas_chat (
  id SERIAL PRIMARY KEY,
  hospede_id INTEGER NOT NULL REFERENCES hospedes(id) ON DELETE CASCADE,
  atendente_usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  data_inicio TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Correção: chatController sempre dependeu de "status" (para reaproveitar a conversa
-- "aberta" de um hóspede em vez de duplicar) e "data_fim", mas nenhuma das duas
-- colunas chegou a existir no schema. ADD COLUMN IF NOT EXISTS é idempotente; o
-- default 'aberta' preserva o comportamento esperado para conversas já existentes.
ALTER TABLE conversas_chat ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'aberta';
ALTER TABLE conversas_chat ADD COLUMN IF NOT EXISTS data_fim TIMESTAMPTZ;

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
