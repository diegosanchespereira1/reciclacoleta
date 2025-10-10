# 🔄 Rebuild do Frontend no VPS - API REST

## ✅ **Problema Resolvido**

O frontend foi migrado para usar a **API REST** em vez do `localStorage`. Agora o login e todas as funcionalidades funcionam corretamente via backend PostgreSQL.

## 🚀 **Como Fazer Rebuild no VPS**

### **Passo 1: Fazer Pull das Atualizações**

```bash
# Conectar ao VPS
ssh user@seu-vps

# Navegar para o diretório do projeto
cd /var/www/reciclacoleta

# Fazer pull das atualizações
git pull origin main

# Ou se ainda estiver na branch:
git pull origin feature/backend-postgresql
```

### **Passo 2: Rebuild dos Containers**

```bash
# Parar containers
docker-compose down

# Rebuild com as mudanças do frontend
docker-compose up -d --build

# Aguardar containers iniciarem
sleep 30
```

### **Passo 3: Verificar se Está Funcionando**

```bash
# Verificar containers rodando
docker ps

# Ver logs do frontend
docker logs recicla-frontend

# Ver logs do backend
docker logs recicla-backend
```

### **Passo 4: Testar Aplicação**

```bash
# Testar API diretamente
curl -X POST http://localhost:3002/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"admin123"}'

# Testar via domínio (se Nginx estiver configurado)
curl -X POST http://appcoleta.polygonconsulting.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@recicla.com","password":"admin123"}'
```

## 🧪 **Teste no Navegador**

1. **Acesse**: https://appcoleta.polygonconsulting.com.br
2. **Login com**:
   - **Admin**: `admin@recicla.com` / `admin123`
   - **Coletor**: `coletor@recicla.com` / `coletor123`

## 📋 **O que Foi Implementado**

### ✅ **Novo ApiService (src/services/api.ts)**
- Login e registro via API
- Verificação de token JWT
- Métodos para coletas, usuários, pontos de coleta
- Métodos para relatórios e dashboard
- Tratamento de erros e autenticação

### ✅ **AuthContext Atualizado**
- Usa JWT tokens em vez de localStorage
- Verificação automática de token
- Logout limpa tokens
- Integração com ApiService

### ✅ **Dashboard Atualizado**
- Carrega dados via API
- Estatísticas em tempo real
- Integração com backend PostgreSQL

### ✅ **CollectionForm Novo**
- Criar coletas via API
- Integração com pontos de coleta
- Sistema de pontos automático
- Rastreamento blockchain

## 🔧 **Configuração Nginx (Se Necessário)**

Certifique-se de que o Nginx está configurado para proxy da API:

```bash
# Verificar configuração
sudo cat /etc/nginx/sites-available/appcoleta
```

**Deve ter:**
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name appcoleta.polygonconsulting.com.br;

    # Frontend (React)
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

    # Backend API
    location /api {
        proxy_pass http://localhost:3002;
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

## 🎯 **Resultado Esperado**

Após o rebuild:

- ✅ **Login funciona** no frontend
- ✅ **Dados persistem** no PostgreSQL
- ✅ **Múltiplos usuários** podem usar simultaneamente
- ✅ **Coletas funcionam** via API
- ✅ **Dashboard carrega** dados reais
- ✅ **Sistema de pontos** funciona
- ✅ **Rastreamento** funciona

## 🆘 **Troubleshooting**

### **Se o login ainda não funcionar:**

```bash
# Verificar variável de ambiente do frontend
docker exec recicla-frontend env | grep REACT_APP_API_URL

# Deve mostrar:
# REACT_APP_API_URL=http://appcoleta.polygonconsulting.com.br/api
```

### **Se houver erro de CORS:**

```bash
# Verificar logs do backend
docker logs recicla-backend | grep -i cors

# Verificar configuração CORS no backend
```

### **Se a API não responder:**

```bash
# Verificar se backend está rodando
docker logs recicla-backend

# Verificar conectividade
curl http://localhost:3002/health
```

---

**🎉 Após o rebuild, o frontend funcionará corretamente com a API REST e PostgreSQL!**
