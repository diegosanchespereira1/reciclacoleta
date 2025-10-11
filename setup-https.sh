#!/bin/bash

# Script para configurar HTTPS com Let's Encrypt
# Uso: ./setup-https.sh

set -e

DOMAIN="appcoleta.polygonconsulting.com.br"
PROJECT_DIR="$(pwd)"
SSL_DIR="$PROJECT_DIR/ssl"

echo "🔧 Configurando HTTPS para $DOMAIN..."

# Verificar se está rodando como root
if [[ $EUID -eq 0 ]]; then
   echo "❌ Este script não deve ser executado como root"
   exit 1
fi

# Verificar se o domínio está resolvendo
echo "🌐 Verificando resolução do domínio..."
if ! nslookup $DOMAIN > /dev/null 2>&1; then
    echo "❌ Domínio $DOMAIN não está resolvendo. Verifique o DNS."
    exit 1
fi

echo "✅ Domínio resolvendo corretamente"

# Parar containers se estiverem rodando
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Instalar certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    sudo apt update
    sudo apt install -y certbot
fi

# Criar diretório ssl
echo "📁 Criando diretório para certificados..."
mkdir -p "$SSL_DIR"

# Obter certificado SSL
echo "🔐 Obtendo certificado SSL do Let's Encrypt..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@polygonconsulting.com.br

# Copiar certificados
echo "📋 Copiando certificados..."
sudo cp "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" "$SSL_DIR/$DOMAIN.crt"
sudo cp "/etc/letsencrypt/live/$DOMAIN/privkey.pem" "$SSL_DIR/$DOMAIN.key"

# Ajustar permissões
echo "🔒 Ajustando permissões dos certificados..."
sudo chown $USER:$USER "$SSL_DIR/$DOMAIN.crt" "$SSL_DIR/$DOMAIN.key"
chmod 644 "$SSL_DIR/$DOMAIN.crt"
chmod 600 "$SSL_DIR/$DOMAIN.key"

# Configurar renovação automática
echo "🔄 Configurando renovação automática..."
sudo tee /etc/cron.d/certbot-renewal > /dev/null <<EOF
0 12 * * * root certbot renew --quiet && cd $PROJECT_DIR && docker-compose restart frontend
EOF

# Iniciar aplicação
echo "🚀 Iniciando aplicação..."
docker-compose up -d --build

# Aguardar containers iniciarem
echo "⏳ Aguardando containers iniciarem..."
sleep 10

# Verificar status
echo "🔍 Verificando status dos containers..."
docker-compose ps

# Testar HTTPS
echo "🧪 Testando HTTPS..."
sleep 5
if curl -s -I "https://$DOMAIN" | grep -q "200 OK"; then
    echo "✅ HTTPS configurado com sucesso!"
    echo "🌐 Acesse: https://$DOMAIN"
else
    echo "⚠️  HTTPS pode não estar funcionando ainda. Aguarde alguns minutos e teste novamente."
fi

echo ""
echo "📋 Próximos passos:"
echo "1. Acesse https://$DOMAIN para verificar se está funcionando"
echo "2. Configure o DNS do seu domínio para apontar para esta VPS"
echo "3. Os certificados serão renovados automaticamente"
echo ""
echo "🔧 Comandos úteis:"
echo "- Ver logs: docker-compose logs -f"
echo "- Reiniciar: docker-compose restart"
echo "- Status: docker-compose ps"
echo "- Renovar certificado manualmente: sudo certbot renew"
