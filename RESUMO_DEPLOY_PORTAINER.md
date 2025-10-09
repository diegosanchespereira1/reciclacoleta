# 📦 RESUMO: Deploy no Portainer - PRONTO PARA USAR

## ✅ Arquivos Criados e Prontos

Todos os arquivos necessários foram criados e estão no repositório:

1. **Dockerfile** - Build multi-stage otimizado
2. **docker-compose.yml** - Configuração para Portainer
3. **nginx.conf** - Servidor web para SPA
4. **.dockerignore** - Otimização do build
5. **deploy.sh** - Script de automação
6. **VPS_DEPLOY.md** - Guia completo de deploy
7. **TESTE_LOCAL_DOCKER.md** - Instruções de teste local

## 🚀 COMO SUBIR NO PORTAINER (PASSO A PASSO)

### 1️⃣ Acessar o Portainer

Abra o navegador e acesse seu Portainer no VPS.

### 2️⃣ Criar Novo Stack

1. No menu lateral, clique em **Stacks**
2. Clique no botão **+ Add stack**

### 3️⃣ Configurar o Stack

Preencha os campos:

**Name:**
```
recicla-coleta
```

**Build method:**
- Selecione: **Git Repository**

**Repository URL:**
```
https://github.com/diegosanchespereira1/reciclacoleta
```

**Repository reference:**
```
main
```

**Compose path:**
```
docker-compose.yml
```

### 4️⃣ Deploy

1. Role a página até o final
2. Clique no botão **Deploy the stack**
3. Aguarde o build (pode levar 3-5 minutos)

### 5️⃣ Verificar

Após o deploy:
1. Vá em **Containers**
2. Procure por **recicla-coleta-app**
3. Status deve estar **running** (verde)
4. Clique no nome do container para ver detalhes
5. Clique em **Logs** para ver se está tudo ok

### 6️⃣ Testar Localmente no VPS

SSH no seu VPS e teste:
```bash
curl http://localhost:3001
```

Deve retornar o HTML da aplicação.

## 🌐 Configurar Nginx (Proxy Reverso)

### No VPS via SSH:

```bash
# 1. Criar arquivo de configuração
sudo nano /etc/nginx/sites-available/appcoleta
```

Cole este conteúdo:
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

Salve (Ctrl+O, Enter, Ctrl+X)

```bash
# 2. Ativar configuração
sudo ln -s /etc/nginx/sites-available/appcoleta /etc/nginx/sites-enabled/

# 3. Testar configuração
sudo nginx -t

# 4. Recarregar Nginx
sudo systemctl reload nginx
```

### Testar HTTP:
```bash
curl http://appcoleta.polygonconsulting.com.br
```

Ou abra no navegador: http://appcoleta.polygonconsulting.com.br

## 🔒 Configurar SSL (HTTPS)

```bash
# 1. Instalar Certbot (se não tiver)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 2. Obter certificado SSL
sudo certbot --nginx -d appcoleta.polygonconsulting.com.br

# Siga as instruções:
# - Informe seu email
# - Aceite os termos (Y)
# - Escolha opção 2 (redirecionar HTTP para HTTPS)

# 3. Testar auto-renovação
sudo certbot renew --dry-run
```

## ✅ Verificação Final

### No Navegador:

**URL:** https://appcoleta.polygonconsulting.com.br

**Credenciais de Teste:**

Admin:
- Email: `admin@recicla.com`
- Senha: `admin123`

Coletor:
- Email: `coletor@recicla.com`
- Senha: `coletor123`

### Checklist:

- [ ] Stack criado no Portainer
- [ ] Container rodando
- [ ] Nginx configurado
- [ ] SSL configurado
- [ ] Aplicação acessível via HTTPS
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Todas funcionalidades testadas

## 🔄 Como Atualizar no Futuro

### Via Portainer (Recomendado):

1. Acesse o stack **recicla-coleta**
2. Clique em **Pull and redeploy**
3. Aguarde o rebuild
4. Pronto!

### Via SSH (Manual):

```bash
cd /var/www/reciclacoleta  # ou onde clonou
git pull origin main
docker-compose up -d --build
```

## 🛠️ Comandos Úteis

### Ver Logs em Tempo Real:
```bash
docker logs -f recicla-coleta-app
```

### Ver Status:
```bash
docker ps
```

### Reiniciar Container:
```bash
docker restart recicla-coleta-app
```

### Parar/Iniciar via Docker Compose:
```bash
cd /caminho/do/projeto
docker-compose down
docker-compose up -d
```

## 📊 Monitoramento

No Portainer você pode:
- Ver logs em tempo real
- Ver estatísticas de CPU/Memória
- Acessar console do container
- Ver variáveis de ambiente
- Gerenciar volumes e redes

## ❓ Problemas Comuns

### Container não inicia
- Veja os logs no Portainer
- Verifique se a porta 3001 está livre

### Erro 502 Bad Gateway
- Verifique se o container está rodando: `docker ps`
- Teste local: `curl http://localhost:3001`
- Veja logs do Nginx: `sudo tail -f /var/log/nginx/error.log`

### SSL não funciona
- Verifique se o DNS está correto
- Rode novamente: `sudo certbot --nginx -d appcoleta.polygonconsulting.com.br`

## 📚 Documentação Completa

Para mais detalhes, consulte:
- **VPS_DEPLOY.md** - Guia completo de deploy
- **TESTE_LOCAL_DOCKER.md** - Como testar localmente
- **DEPLOYMENT_GUIDE.md** - Informações gerais

## 🎯 Pronto!

Agora é só seguir os passos acima e sua aplicação estará no ar com HTTPS! 🚀

**URL Final:** https://appcoleta.polygonconsulting.com.br

---

**Boa sorte com o deploy! Qualquer dúvida, consulte os guias detalhados.** ✅

