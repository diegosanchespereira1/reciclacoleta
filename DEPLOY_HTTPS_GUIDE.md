# Guia de Deploy com HTTPS - AppColeta

Este guia te ajudará a configurar sua aplicação React com HTTPS no domínio `appcoleta.polygonconsulting.com.br`.

## Pré-requisitos

1. **VPS configurada** com Docker e Docker Compose
2. **Domínio** `appcoleta.polygonconsulting.com.br` apontando para o IP da sua VPS
3. **Portas 80 e 443** liberadas no firewall da VPS

## Passo 1: Configurar Certificado SSL

### Opção A: Let's Encrypt (Recomendado - Gratuito)

```bash
# 1. Instalar Certbot
sudo apt update
sudo apt install certbot

# 2. Obter certificado SSL
sudo certbot certonly --standalone -d appcoleta.polygonconsulting.com.br

# 3. Os certificados serão salvos em:
# /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/fullchain.pem
# /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/privkey.pem
```

### Opção B: Certificado Próprio

Se você tem um certificado SSL próprio:

```bash
# 1. Criar diretório para certificados
mkdir -p ssl

# 2. Copiar seus certificados para o diretório ssl/
# appcoleta.polygonconsulting.com.br.crt (certificado)
# appcoleta.polygonconsulting.com.br.key (chave privada)
```

## Passo 2: Configurar Certificados no Projeto

### Para Let's Encrypt:

```bash
# 1. Criar diretório ssl no projeto
mkdir -p ssl

# 2. Copiar certificados do Let's Encrypt
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/fullchain.pem ssl/appcoleta.polygonconsulting.com.br.crt
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/privkey.pem ssl/appcoleta.polygonconsulting.com.br.key

# 3. Ajustar permissões
sudo chown $USER:$USER ssl/appcoleta.polygonconsulting.com.br.*
chmod 644 ssl/appcoleta.polygonconsulting.com.br.crt
chmod 600 ssl/appcoleta.polygonconsulting.com.br.key
```

### Para Certificado Próprio:

```bash
# Certifique-se de que os arquivos estão no diretório ssl/
# - appcoleta.polygonconsulting.com.br.crt
# - appcoleta.polygonconsulting.com.br.key
```

## Passo 3: Deploy da Aplicação

```bash
# 1. Parar containers existentes (se houver)
docker-compose down

# 2. Construir e iniciar os containers
docker-compose up -d --build

# 3. Verificar se os containers estão rodando
docker-compose ps
```

## Passo 4: Configurar Renovação Automática (Let's Encrypt)

### Script de Renovação:

```bash
# Criar script de renovação
sudo nano /etc/cron.d/certbot-renewal

# Adicionar conteúdo:
0 12 * * * root certbot renew --quiet && docker-compose restart frontend
```

### Renovação Manual:

```bash
# Verificar certificados
sudo certbot certificates

# Renovar certificados
sudo certbot renew

# Copiar novos certificados
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/fullchain.pem ssl/appcoleta.polygonconsulting.com.br.crt
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/privkey.pem ssl/appcoleta.polygonconsulting.com.br.key

# Reiniciar frontend
docker-compose restart frontend
```

## Passo 5: Verificação

1. **Acesse**: `https://appcoleta.polygonconsulting.com.br`
2. **Verifique**: 
   - Redirecionamento automático de HTTP para HTTPS
   - Certificado SSL válido
   - Aplicação funcionando corretamente
   - API acessível em `https://appcoleta.polygonconsulting.com.br/api`

## Configurações de Firewall

```bash
# Liberar portas necessárias
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp  # SSH

# Verificar status
sudo ufw status
```

## Estrutura Final

```
recicla-coleta-react/
├── ssl/
│   ├── appcoleta.polygonconsulting.com.br.crt
│   └── appcoleta.polygonconsulting.com.br.key
├── nginx.conf
├── docker-compose.yml
└── ...
```

## Troubleshooting

### Erro de Certificado:
```bash
# Verificar se os arquivos existem
ls -la ssl/

# Verificar permissões
ls -la ssl/appcoleta.polygonconsulting.com.br.*
```

### Erro de Conectividade:
```bash
# Verificar logs dos containers
docker-compose logs frontend
docker-compose logs backend

# Testar conectividade
curl -I https://appcoleta.polygonconsulting.com.br
```

### Renovar Certificado:
```bash
# Forçar renovação
sudo certbot renew --force-renewal

# Copiar novos certificados e reiniciar
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/fullchain.pem ssl/appcoleta.polygonconsulting.com.br.crt
sudo cp /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/privkey.pem ssl/appcoleta.polygonconsulting.com.br.key
docker-compose restart frontend
```

## Monitoramento

```bash
# Verificar status dos containers
docker-compose ps

# Verificar logs em tempo real
docker-compose logs -f

# Verificar uso de recursos
docker stats
```

## Segurança Adicional

O nginx já está configurado com:
- ✅ HSTS (HTTP Strict Transport Security)
- ✅ Headers de segurança (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ Ciphers seguros
- ✅ Redirecionamento HTTP → HTTPS
- ✅ Proxy reverso para API

---

**Importante**: Mantenha seus certificados SSL sempre atualizados para garantir a segurança da aplicação.
