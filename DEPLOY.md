# 🚀 Deploy para Produção

## Configuração no Render

### 1. **Build Command:**
```bash
npm install && npm run build && npx prisma generate
```

### 2. **Start Command:**
```bash
npm run prisma:deploy && npm start
```

### 3. **Variáveis de Ambiente:**
```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
PORT=10000
```

## O que acontece no deploy:

1. ✅ **Instala dependências** (`npm install`)
2. ✅ **Compila TypeScript** (`npm run build`)  
3. ✅ **Gera Prisma Client** (`npx prisma generate`)
4. ✅ **Aplica migrações** (`prisma migrate deploy`)
5. ✅ **Executa seed** (cria usuário admin + salas)
6. ✅ **Inicia servidor** (`npm start`)

## Dados criados automaticamente:

- **👤 Usuário Admin**: `admin@stark.com` / `admin123`
- **🏢 Salas**: Sala 01, Sala 13, Sala 42, Laboratório, Auditório
- **📝 Log inicial**: Registro de inicialização do sistema

## Scripts disponíveis:

```bash
# Desenvolvimento
npm run dev

# Build manual
npm run build

# Deploy completo (produção)
npm run deploy:production

# Apenas seed
npm run prisma:seed

# Apenas migrações + seed
npm run prisma:deploy
```

## ⚠️ Importante:

- Certifique-se que o `DATABASE_URL` está correto
- Troque o `JWT_SECRET` por algo seguro em produção
- O seed é **idempotente** (pode rodar várias vezes sem problemas)
