# 🔧 Corrigir Problema de Conexão com PostgreSQL no VPS

## ❌ Problema Identificado

O PostgreSQL está tentando conectar no banco `recicla_user` em vez de `recicla_db`:

```
FATAL: database "recicla_user" does not exist
```

## 🔍 Diagnóstico

O problema é que o backend está interpretando incorretamente a `DATABASE_URL` ou o banco `recicla_db` não foi criado.

## ✅ Solução

### Passo 1: Verificar Containers

```bash
# Verificar se containers estão rodando
docker ps | grep -E "(postgres|backend)"

# Ver logs do backend
docker logs recicla-backend

# Ver logs do PostgreSQL
docker logs recicla-postgres
```

### Passo 2: Verificar Variáveis de Ambiente

```bash
# Verificar DATABASE_URL no backend
docker exec recicla-backend env | grep DATABASE_URL
```

**Deve mostrar:**
```
DATABASE_URL=postgresql://recicla_user:recicla_pass_2024@postgres:5432/recicla_db
```

### Passo 3: Verificar/Criar Banco de Dados

```bash
# Listar bancos existentes
docker exec recicla-postgres psql -U recicla_user -c "\l"

# Criar banco se não existir
docker exec recicla-postgres psql -U recicla_user -c "CREATE DATABASE recicla_db;"
```

### Passo 4: Reiniciar Backend

```bash
# Parar e reiniciar backend
docker restart recicla-backend

# Aguardar alguns segundos e verificar logs
sleep 10
docker logs recicla-backend --tail 20
```

### Passo 5: Executar Migrations

```bash
# Executar migrations
docker exec recicla-backend npx prisma migrate deploy

# Executar seed
docker exec recicla-backend npx prisma db seed
```

## 🚨 Solução Alternativa (Se não funcionar)

### Opção 1: Rebuild Completo

```bash
# Parar todos os containers
docker-compose down

# Remover volumes (CUIDADO: apaga dados)
docker volume rm recicla-coleta-react_postgres_data

# Rebuild completo
docker-compose up -d --build

# Aguardar containers iniciarem
sleep 30

# Executar migrations
docker exec recicla-backend npx prisma migrate deploy

# Executar seed
docker exec recicla-backend npx prisma db seed
```

### Opção 2: Corrigir DATABASE_URL Manualmente

Se a variável de ambiente estiver incorreta:

```bash
# Editar docker-compose.yml no VPS
nano docker-compose.yml

# Verificar se a linha está correta:
# DATABASE_URL=postgresql://recicla_user:recicla_pass_2024@postgres:5432/recicla_db

# Rebuild
docker-compose up -d --build
```

## 🧪 Teste de Validação

Após corrigir, testar:

```bash
# Teste 1: Health check do backend
curl http://localhost:3002/health

# Teste 2: Login via API
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"admin123"}'

# Teste 3: Verificar banco
docker exec recicla-postgres psql -U recicla_user -d recicla_db -c "SELECT COUNT(*) FROM users;"
```

## 📋 Checklist de Verificação

- [ ] Containers PostgreSQL e Backend rodando
- [ ] DATABASE_URL correta no backend
- [ ] Banco `recicla_db` existe no PostgreSQL
- [ ] Backend conecta sem erros
- [ ] Migrations executadas com sucesso
- [ ] Seed executado com sucesso
- [ ] API respondendo corretamente
- [ ] Login funcionando

## 🔍 Logs para Verificar

### PostgreSQL (deve mostrar):
```
database system is ready to accept connections
```

### Backend (deve mostrar):
```
🚀 Backend rodando na porta 3000
📊 Environment: production
```

**NÃO deve mostrar:**
```
FATAL: database "recicla_user" does not exist
```

## 🆘 Se Ainda Não Funcionar

1. **Verificar DNS interno**: O backend deve conseguir resolver `postgres` como hostname
2. **Verificar rede**: Os containers devem estar na mesma rede
3. **Verificar porta**: PostgreSQL deve estar na porta 5432
4. **Verificar credenciais**: Usuário e senha devem estar corretos

```bash
# Teste de conectividade
docker exec recicla-backend ping postgres

# Teste de porta
docker exec recicla-backend nc -zv postgres 5432

# Verificar rede
docker network ls
docker network inspect recicla-coleta-react_recicla-network
```

---

**🎯 Objetivo**: Resolver erro `FATAL: database "recicla_user" does not exist` e fazer o backend conectar corretamente no banco `recicla_db`.
