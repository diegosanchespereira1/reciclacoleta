#!/bin/bash

echo "🚀 Deploy Final na VPS - Recicla Coleta"
echo "========================================"

# 1. Fazer pull das atualizações
echo "1. Fazendo pull das atualizações..."
git pull origin feature/backend-postgresql

# 2. Parar containers antigos
echo "2. Parando containers antigos..."
docker-compose down

# 3. Rebuild completo
echo "3. Fazendo rebuild completo..."
docker-compose up -d --build

# 4. Aguardar containers iniciarem
echo "4. Aguardando containers iniciarem..."
sleep 60

# 5. Verificar status
echo "5. Verificando status dos containers..."
docker ps

# 6. Configurar banco de dados
echo "6. Configurando banco de dados..."
docker exec recicla-backend npx prisma migrate deploy
docker exec recicla-backend npx prisma db seed

# 7. Testar API
echo "7. Testando API..."
curl -s http://localhost:3002/health || echo "❌ API não respondeu"

# 8. Testar login
echo "8. Testando login..."
curl -s -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"admin123"}' | head -c 100 || echo "❌ Login falhou"

echo ""
echo "✅ Deploy concluído!"
echo "🌐 Acesse: http://appcoleta.polygonconsulting.com.br"
echo "👤 Login: admin@recicla.com / admin123"
