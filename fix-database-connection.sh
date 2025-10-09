#!/bin/bash

echo "🔧 Script para corrigir conexão com banco de dados PostgreSQL"
echo "=============================================================="

# 1. Verificar se os containers estão rodando
echo "1. Verificando containers..."
docker ps | grep -E "(postgres|backend)"

# 2. Verificar variáveis de ambiente do backend
echo ""
echo "2. Verificando variáveis de ambiente do backend..."
docker exec recicla-backend env | grep DATABASE_URL

# 3. Verificar se o banco recicla_db existe
echo ""
echo "3. Verificando bancos de dados existentes..."
docker exec recicla-postgres psql -U recicla_user -c "\l"

# 4. Criar o banco se não existir
echo ""
echo "4. Criando banco de dados se necessário..."
docker exec recicla-postgres psql -U recicla_user -c "CREATE DATABASE recicla_db;" 2>/dev/null || echo "Banco recicla_db já existe ou erro ao criar"

# 5. Verificar conexão do backend com o banco
echo ""
echo "5. Testando conexão do backend..."
docker exec recicla-backend npx prisma db pull

# 6. Executar migrations
echo ""
echo "6. Executando migrations..."
docker exec recicla-backend npx prisma migrate deploy

# 7. Executar seed
echo ""
echo "7. Executando seed..."
docker exec recicla-backend npx prisma db seed

echo ""
echo "✅ Correção concluída!"
echo ""
echo "Para verificar se está funcionando:"
echo "docker logs recicla-backend"
echo "docker logs recicla-postgres"
