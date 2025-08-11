# 🤖 Jarvis Server

Sistema de controle de acesso e visitantes para salas, desenvolvido com **Fastify**, **Prisma** e **PostgreSQL**.

## 🚀 Funcionalidades

- 🔐 **Autenticação JWT** - Sistema seguro de login
- 🏢 **Gestão de Salas** - CRUD completo de salas
- 👥 **Controle de Visitantes** - Check-in/check-out com histórico
- 📊 **Relatórios** - Histórico de visitas e logs do sistema
- 🔍 **Busca Avançada** - Filtros por sala, data, nome e CPF

## 📋 Pré-requisitos

- **Node.js** 18+
- **PostgreSQL**
- **Docker** (opcional)

## ⚙️ Instalação

```bash
# Clone o repositório
git clone https://github.com/guilhermewall/jarvis-server.git
cd jarvis-server

# Instale as dependências
npm install

# Configure o banco (Docker)
docker-compose up -d

# Configure as variáveis de ambiente
cp .env.example .env

# Execute as migrações e seed
npm run prisma:deploy

# Inicie o servidor
npm run dev
```

## 🌍 Variáveis de Ambiente

```env
NODE_ENV=development
DATABASE_URL=postgresql://docker:docker@localhost:5432/jarvis-server-db
JWT_SECRET=supersecret_dev_change_me
PORT=3333
```

## 📖 Documentação da API

### Base URL

```
http://localhost:3333
```

### 🔐 Autenticação

#### Login

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@stark.com",
  "password": "admin123"
}
```

**Resposta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 🏢 Salas

#### Listar salas

```http
GET /rooms
Authorization: Bearer {token}
```

**Resposta:**

```json
[
  {
    "id": "cme6z2eqn0001ga8e14htlrvr",
    "name": "Sala 01",
    "capacity": 4,
    "activeCount": 0
  },
  {
    "id": "cme6z2eqr0002ga8eptktkyvp",
    "name": "Sala 13",
    "capacity": 6,
    "activeCount": 0
  }
]
```

### 👥 Visitantes

#### Listar visitantes ativos

```http
GET /visitors/active
Authorization: Bearer {token}

# Com filtros
GET /visitors/active?roomId={roomId}&search={nome_ou_cpf}
```

#### Check-in de visitante

```http
POST /visitors
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Maria Silva",
  "cpf": "12345678901",
  "email": "maria@email.com",
  "birthDate": "1990-05-15",
  "roomId": "cme6z2eqn0001ga8e14htlrvr"
}
```

#### Check-out de visitante

```http
POST /visitors/checkout
Authorization: Bearer {token}
Content-Type: application/json

{
  "visitId": "visit_id_aqui"
}
```

### 📊 Histórico e Relatórios

#### Histórico de visitas

```http
GET /history
Authorization: Bearer {token}

# Com filtros
GET /history?roomId={roomId}&startDate=2025-08-01&endDate=2025-08-31
```

#### Logs do sistema

```http
GET /logs
Authorization: Bearer {token}

# Com paginação
GET /logs?take=10&cursor={log_id}
```

## 🧪 Testando a API

Use o arquivo `client.http` incluído no projeto com a extensão **REST Client** do VS Code:

1. Instale a extensão "REST Client"
2. Abra o arquivo `client.http`
3. Execute os testes sequencialmente
4. Copie o token do login e use nos outros endpoints

## 🗄️ Estrutura do Banco

### Tabelas principais:

- **users** - Usuários do sistema
- **rooms** - Salas disponíveis
- **visits** - Registro de visitas (check-in/out)
- **logs** - Logs do sistema

### Relacionamentos:

```
Room 1:N Visit
User 1:N Visit (createdBy)
```

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Servidor com hot-reload
npm run build           # Build para produção
npm start              # Iniciar servidor produção

# Banco de dados
npm run prisma:seed    # Popular banco com dados iniciais
npm run prisma:deploy  # Aplicar migrações + seed
npx prisma studio      # Visualizar dados

# Deploy
npm run deploy:production  # Build + deploy completo
```

## 🌱 Dados Iniciais (Seed)

O sistema vem com dados pré-configurados:

**👤 Usuário Admin:**

- Email: `admin@stark.com`
- Senha: `admin123`

**🏢 Salas:**

- Sala 01 (4 pessoas)
- Sala 13 (6 pessoas)
- Sala 42 (8 pessoas)
- Laboratório (12 pessoas)
- Auditório (50 pessoas)

## 🚀 Deploy em Produção

### Render.com

**Build Command:**

```bash
npm install && npm run build && npx prisma generate
```

**Start Command:**

```bash
npm run prisma:deploy && npm start
```

Consulte `DEPLOY.md` para instruções detalhadas.

## 🛡️ Segurança

- ✅ Autenticação JWT obrigatória
- ✅ Validação de dados com Zod
- ✅ Hash de senhas com bcrypt
- ✅ CORS configurado
- ✅ Logs de auditoria

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

ISC License - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👨‍💻 Autor

**Guilherme Wall**

- GitHub: [@guilhermewall](https://github.com/guilhermewall)
- Projeto: [jarvis-server](https://github.com/guilhermewall/jarvis-server)

---

_Feito com ❤️ e muitos bugs que viraram features_ 🐛➡️✨
