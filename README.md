# 🏨 FastHotelTCC

Sistema completo de gerenciamento hoteleiro desenvolvido como Trabalho de Conclusão de Curso (TCC), permitindo o gerenciamento de hóspedes, quartos, reservas, pagamentos e análise de dados por meio de dashboards.

---

# 📖 Sobre o Projeto

O **FastHotel** é uma aplicação Full Stack desenvolvida com foco na gestão de hotéis.

O sistema permite controlar todo o fluxo operacional de um hotel, desde o cadastro de hóspedes até o gerenciamento de reservas e pagamentos, além de fornecer indicadores para apoio à tomada de decisão.

---

# ✨ Funcionalidades

* Login com autenticação JWT
* Cadastro de usuários
* Cadastro de hóspedes
* Cadastro de quartos
* Controle de reservas
* Histórico de reservas
* Controle de pagamentos
* Dashboard com Analytics
* Interface responsiva
* Tratamento de erros

---

# 🏗 Estrutura do Projeto

```
FastHotelTCC/
│
├── fasthotel-api/      # Backend (Node.js + Express)
│
├── fasthotel-app/      # Frontend (React + TypeScript)
│
└── README.md
```

---

# 🛠 Tecnologias Utilizadas

## Frontend

* React
* TypeScript
* Styled Components
* React Router
* Axios

## Backend

* Node.js
* Express
* PostgreSQL
* JWT
* Bcrypt

## Banco de Dados

* PostgreSQL

## Ferramentas

* Git
* GitHub
* Yarn

---

# ⚙ Pré-requisitos

* Node.js 16+
* PostgreSQL
* Git
* Yarn

---

# 🚀 Instalação

## Clone o projeto

```bash
git clone https://github.com/MarcusGiordani/FastHotelTCC.git

cd FastHotelTCC
```

---

## Backend

```bash
cd fasthotel-api

yarn install
```

Crie um arquivo `.env`

```env
DB_USER=postgres
DB_HOST=localhost
DB_DATABASE=fasthotel_db
DB_PASSWORD=senha
DB_PORT=5432

JWT_SECRET=sua_chave
```

Execute

```bash
yarn start
```

---

## Frontend

Abra outro terminal

```bash
cd fasthotel-app

yarn install
```

Crie um arquivo `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
```

Execute

```bash
yarn start
```

---

# 🌐 Acesso

Frontend

```
http://localhost:3000
```

Backend

```
http://localhost:5000
```

---

# 📊 Funcionalidades do Sistema

* Gestão de hóspedes
* Gestão de quartos
* Reservas
* Pagamentos
* Dashboard
* Analytics
* Cadastro de usuários
* Histórico de reservas

---

# 👨‍💻 Autores

Marcus Giordani
Michel Liberali
Bruno Callegaro
Guilherme Teixeira

Trabalho de Conclusão de Curso — Engenharia de Software
