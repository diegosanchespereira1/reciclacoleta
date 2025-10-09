# 🚀 Guia de Deploy no VPS - Recicla Coleta

## 📋 Informações do Servidor

- **VPS**: Debian
- **Domínio**: appcoleta.polygonconsulting.com.br
- **Porta Container**: 3001
- **Servidor Web**: Nginx (Proxy Reverso)
- **SSL**: Let's Encrypt (HTTPS)
- **Gerenciamento**: Portainer

## 🏗️ Arquitetura

```
Internet
  ↓
DNS (appcoleta.polygonconsulting.com.br)
  ↓
VPS Debian
  ↓
Nginx (80/443) + SSL Let's Encrypt
  ↓
Proxy Reverso → localhost:3001
  ↓
Docker Container (recicla-coleta-app)
  ↓
Nginx Alpine → React Build (SPA)
```

## 📦 Deploy via Portainer

### 1. Preparar Repositório

Certifique-se de que todos os arquivos Docker estão no repositório:
- ✅ Dockerfile
- ✅ docker-compose.yml
- ✅ nginx.conf
- ✅ .dockerignore

### 2. No Portainer

1. Acesse o Portainer do seu VPS
2. Vá em **Stacks** → **Add stack**
3. Configure:
   - **Name**: `recicla-coleta`
   - **Build method**: Git Repository
   - **Repository URL**: `https://github.com/diegosanchespereira1/reciclacoleta`
   - **Repository reference**: `main`
   - **Compose path**: `docker-compose.yml`
4. Clique em **Deploy the stack**
5. Aguarde o build e deploy

### 3. Verificar Deploy

```bash
# Verificar se o container está rodando
docker ps | grep recicla-coleta

# Ver logs do container
docker logs recicla-coleta-app -f

# Testar localmente no VPS
curl http://localhost:3001
```

## 🔧 Configuração do Nginx (VPS)

### Criar arquivo de configuração

```bash
sudo nano /etc/nginx/sites-available/appcoleta
```

### Conteúdo do arquivo:

```nginx
server {
    listen 80;
    server_name appcoleta.polygonconsulting.com.br;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Ativar configuração:

```bash
# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/appcoleta /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

## 🔒 Configurar SSL com Let's Encrypt

### 1. Instalar Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Obter Certificado SSL

```bash
sudo certbot --nginx -d appcoleta.polygonconsulting.com.br
```

Siga as instruções:
- Informe seu email
- Aceite os termos
- Escolha redirecionar HTTP para HTTPS (opção 2)

### 3. Verificar Auto-Renovação

```bash
# Testar renovação
sudo certbot renew --dry-run

# Ver status do timer de renovação
sudo systemctl status certbot.timer
```

O Certbot configura renovação automática via systemd timer.

## ✅ Verificação Final

### 1. Testar Acessos

```bash
# HTTP (deve redirecionar para HTTPS)
curl -I http://appcoleta.polygonconsulting.com.br

# HTTPS
curl -I https://appcoleta.polygonconsulting.com.br
```

### 2. No Navegador

- **URL**: https://appcoleta.polygonconsulting.com.br
- Verificar se aparece o cadeado verde (SSL válido)
- Testar login com credenciais:
  - Admin: admin@recicla.com / admin123
  - Coletor: coletor@recicla.com / coletor123

### 3. Monitorar Container

```bash
# Ver status
docker ps

# Ver logs em tempo real
docker logs -f recicla-coleta-app

# Ver uso de recursos
docker stats recicla-coleta-app
```

## 🔄 Atualizar Aplicação

### Via Portainer:

1. Acesse o stack `recicla-coleta`
2. Clique em **Pull and redeploy**
3. Aguarde o novo deploy

### Via SSH (Manual):

```bash
cd /var/www/reciclacoleta
git pull origin main
docker-compose up -d --build
```

## 🛠️ Comandos Úteis

### Docker

```bash
# Parar container
docker-compose down

# Iniciar container
docker-compose up -d

# Rebuild e restart
docker-compose up -d --build

# Ver logs
docker-compose logs -f

# Acessar shell do container
docker exec -it recicla-coleta-app sh

# Limpar imagens não utilizadas
docker system prune -a
```

### Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### SSL

```bash
# Renovar certificados manualmente
sudo certbot renew

# Ver certificados instalados
sudo certbot certificates

# Revogar certificado
sudo certbot revoke --cert-path /etc/letsencrypt/live/appcoleta.polygonconsulting.com.br/cert.pem
```

## 🔍 Troubleshooting

### Container não inicia

```bash
# Ver logs detalhados
docker-compose logs

# Verificar build
docker-compose build --no-cache

# Verificar portas em uso
sudo netstat -tulpn | grep 3001
```

### Erro 502 Bad Gateway

```bash
# Verificar se container está rodando
docker ps

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Verificar proxy pass
curl http://localhost:3001
```

### SSL não funciona

```bash
# Verificar certificados
sudo certbot certificates

# Testar renovação
sudo certbot renew --dry-run

# Ver configuração Nginx
sudo nginx -T | grep ssl
```

## 📊 Monitoramento

### Via Portainer

- Dashboard do container
- Logs em tempo real
- Estatísticas de uso
- Console interativo

### Via Comandos

```bash
# CPU e Memória
docker stats recicla-coleta-app

# Espaço em disco
df -h

# Processos
htop
```

## 🔐 Segurança

### Firewall (UFW)

```bash
# Permitir HTTP/HTTPS
sudo ufw allow 'Nginx Full'

# Permitir SSH
sudo ufw allow ssh

# Ativar firewall
sudo ufw enable

# Ver status
sudo ufw status
```

### Backup

```bash
# Backup do banco de dados (localStorage)
docker exec recicla-coleta-app cat /usr/share/nginx/html/index.html

# Backup de volumes
docker-compose down
tar -czf backup-$(date +%Y%m%d).tar.gz /var/lib/docker/volumes
docker-compose up -d
```

## 📝 Checklist de Deploy

- [ ] DNS apontando para o VPS
- [ ] Docker e Docker Compose instalados
- [ ] Portainer configurado
- [ ] Repositório clonado ou stack criado no Portainer
- [ ] Container rodando na porta 3001
- [ ] Nginx configurado como proxy reverso
- [ ] SSL configurado com Let's Encrypt
- [ ] Firewall configurado
- [ ] Aplicação acessível via HTTPS
- [ ] Testes de funcionalidade realizados

## 🎯 Próximos Passos

- [ ] Configurar backup automático
- [ ] Implementar monitoramento (Grafana/Prometheus)
- [ ] Configurar CI/CD com GitHub Actions
- [ ] Implementar rate limiting no Nginx
- [ ] Configurar logs centralizados

---

**Deploy realizado com sucesso! ✅**  
**URL da aplicação**: https://appcoleta.polygonconsulting.com.br

