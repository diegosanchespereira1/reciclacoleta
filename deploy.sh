#!/bin/bash

echo "🚀 Iniciando deploy da aplicação Recicla Coleta..."
echo ""

# Build da imagem
echo "📦 Construindo imagem Docker..."
docker-compose build

if [ $? -ne 0 ]; then
    echo "❌ Erro ao construir a imagem Docker!"
    exit 1
fi

echo ""
echo "🛑 Parando container anterior (se existir)..."
docker-compose down

echo ""
echo "▶️ Iniciando novo container..."
docker-compose up -d

if [ $? -ne 0 ]; then
    echo "❌ Erro ao iniciar o container!"
    exit 1
fi

echo ""
echo "✅ Deploy concluído com sucesso!"
echo ""
echo "📊 Status do container:"
docker-compose ps

echo ""
echo "🌐 Aplicação disponível em:"
echo "   - Local: http://localhost:3001"
echo "   - VPS: http://appcoleta.polygonconsulting.com.br"
echo ""
echo "📝 Para ver os logs, execute: docker-compose logs -f"

