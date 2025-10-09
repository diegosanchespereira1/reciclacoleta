# 🔧 CORREÇÃO: Deploy no Portainer - Stack Mode

## ❌ Problema Identificado

O erro ocorreu porque o Portainer está interpretando o docker-compose.yml como um Docker Swarm stack em vez de Docker Compose normal.

**Erro:**
```
Ignoring unsupported options: build, restart
Ignoring deprecated options: container_name
invalid reference format
```

## ✅ Soluções Criadas

### Opção 1: Usar docker-compose-portainer.yml

**Arquivo criado:** `docker-compose-portainer.yml` (versão simplificada)

### Opção 2: Configurar no Portainer como Docker Compose

## 🚀 INSTRUÇÕES CORRIGIDAS PARA PORTAINER

### Método 1: Stack Mode (Recomendado)

1. **Acesse o Portainer**
2. **Vá em Stacks** → **Add stack**
3. **Configure:**
   - **Name**: `recicla-coleta`
   - **Build method**: `Git Repository`
   - **Repository URL**: `https://github.com/diegosanchespereira1/reciclacoleta`
   - **Reference**: `main`
   - **Compose path**: `docker-compose-portainer.yml` ⚠️ **MUDEI AQUI**
4. **Deploy the stack**

### Método 2: Containers Mode (Alternativo)

1. **Acesse o Portainer**
2. **Vá em Containers** → **Add container**
3. **Configure:**
   - **Name**: `recicla-coleta-app`
   - **Image**: `nginx:alpine`
   - **Ports**: `3001:80`
   - **Restart policy**: `Unless stopped`
4. **Advanced container settings**:
   - **Command**: `sh -c "apk add --no-cache git nodejs npm && git clone https://github.com/diegosanchespereira1/reciclacoleta.git /tmp/app && cd /tmp/app && npm ci && npm run build && cp -r build/* /usr/share/nginx/html && nginx -g 'daemon off;'"`

### Método 3: Build Manual (Mais Seguro)

1. **SSH no VPS**
2. **Clone o repositório:**
   ```bash
   cd /var/www
   git clone https://github.com/diegosanchespereira1/reciclacoleta.git
   cd reciclacoleta
   ```

3. **Build manual:**
   ```bash
   # Build da imagem
   docker build -t recicla-coleta:latest .

   # Criar e rodar container
   docker run -d \
     --name recicla-coleta-app \
     --restart unless-stopped \
     -p 3001:80 \
     recicla-coleta:latest
   ```

4. **Verificar:**
   ```bash
   docker ps
   curl http://localhost:3001
   ```

## 🔧 Arquivos Atualizados

### docker-compose-portainer.yml
```yaml
version: '3.8'

services:
  recicla-coleta:
    build: .
    ports:
      - "3001:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### Dockerfile.portainer
```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 📋 Passo a Passo Recomendado

### 1. Usar Método 3 (Build Manual)

```bash
# SSH no VPS
ssh user@seu-vps

# Instalar Docker (se não tiver)
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker $USER
# Faça logout e login novamente

# Clone e build
cd /var/www
sudo git clone https://github.com/diegosanchespereira1/reciclacoleta.git
cd reciclacoleta
sudo docker build -t recicla-coleta:latest .

# Rodar container
sudo docker run -d \
  --name recicla-coleta-app \
  --restart unless-stopped \
  -p 3001:80 \
  recicla-coleta:latest

# Verificar
sudo docker ps
curl http://localhost:3001
```

### 2. Configurar Nginx

```bash
# Criar configuração Nginx
sudo nano /etc/nginx/sites-available/appcoleta
```

Cole:
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

```bash
# Ativar
sudo ln -s /etc/nginx/sites-available/appcoleta /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. Configurar SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d appcoleta.polygonconsulting.com.br
```

## ✅ Verificação

1. **Container rodando:**
   ```bash
   sudo docker ps | grep recicla-coleta
   ```

2. **Logs do container:**
   ```bash
   sudo docker logs recicla-coleta-app
   ```

3. **Teste HTTP:**
   ```bash
   curl http://appcoleta.polygonconsulting.com.br
   ```

4. **Teste HTTPS:**
   ```bash
   curl https://appcoleta.polygonconsulting.com.br
   ```

## 🔄 Atualizar Aplicação

```bash
cd /var/www/reciclacoleta
sudo git pull origin main
sudo docker stop recicla-coleta-app
sudo docker rm recicla-coleta-app
sudo docker build -t recicla-coleta:latest .
sudo docker run -d \
  --name recicla-coleta-app \
  --restart unless-stopped \
  -p 3001:80 \
  recicla-coleta:latest
```

## 🎯 Resumo

**Problema:** Portainer interpretou como Docker Swarm
**Solução:** Usar build manual via SSH (mais confiável)
**Resultado:** Container rodando na porta 3001 com Nginx proxy

---

**Use o Método 3 (Build Manual) - é mais confiável e evita problemas do Portainer!** ✅
