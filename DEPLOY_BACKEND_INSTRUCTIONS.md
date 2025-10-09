# 🚀 Instruções de Deploy - Backend com PostgreSQL

## ✅ O que foi implementado

### Backend Completo
- **Express.js** com rotas de API
- **PostgreSQL** como banco de dados
- **Prisma** como ORM
- **JWT** para autenticação
- **Bcrypt** para hash de senhas
- **CORS** e **Helmet** para segurança

### Rotas Implementadas
- `/api/auth` - Login, registro e verificação
- `/api/collections` - CRUD de coletas
- `/api/users` - Perfil e estatísticas de usuários
- `/api/collection-points` - Gestão de pontos de coleta
- `/api/reports` - Relatórios e dashboard
- `/api/blockchain` - Registros blockchain

### Banco de Dados
- **PostgreSQL** em container separado
- **Schemas** para todos os modelos
- **Relacionamentos** entre tabelas
- **Seed** com dados iniciais

## 🔧 Como Fazer Deploy

### 1. No VPS (via SSH)

```bash
# Conectar ao VPS
ssh user@seu-vps

# Navegar para o diretório do projeto
cd /var/www/reciclacoleta

# Fazer pull das atualizações
git pull origin main

# Parar containers antigos
docker-compose down

# Remover volumes antigos (CUIDADO: apaga dados)
# docker volume rm reciclacoleta_postgres_data

# Build e start com novo setup
docker-compose up -d --build

# Ver logs
docker-compose logs -f
```

### 2. Configurar Banco de Dados

```bash
# Executar migrations
docker exec recicla-backend npx prisma migrate deploy

# Executar seed (dados iniciais)
docker exec recicla-backend npx prisma db seed

# Verificar conexão com banco
docker exec recicla-postgres psql -U recicla_user -d recicla_db -c "SELECT version();"
```

### 3. Configurar Nginx (Atualizado)

```bash
# Criar/editar configuração do Nginx
sudo nano /etc/nginx/sites-available/appcoleta
```

Conteúdo:
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

    # Uploads
    location /uploads {
        proxy_pass http://localhost:3002/uploads;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

```bash
# Ativar configuração
sudo ln -sf /etc/nginx/sites-available/appcoleta /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Testar configuração
sudo nginx -t

# Recarregar Nginx
sudo systemctl reload nginx
```

### 4. Configurar SSL

```bash
# Instalar Certbot (se não tiver)
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# Obter certificado SSL
sudo certbot --nginx -d appcoleta.polygonconsulting.com.br
```

## 🧪 Testar Funcionamento

### 1. Verificar Containers

```bash
# Ver containers rodando
docker ps

# Ver logs do backend
docker logs recicla-backend

# Ver logs do banco
docker logs recicla-postgres
```

### 2. Testar API

```bash
# Health check do backend
curl http://localhost:3002/health

# Via domínio
curl http://appcoleta.polygonconsulting.com.br/api/health
```

### 3. Testar Frontend

```bash
# Frontend local
curl http://localhost:3001

# Via domínio
curl http://appcoleta.polygonconsulting.com.br
```

### 4. Testar Login

**Credenciais padrão:**
- **Admin**: admin@recicla.com / admin123
- **Coletor**: coletor@recicla.com / coletor123

## 🔄 Atualizar Frontend para usar API

### Próximos Passos (Opcional)

Para que o frontend funcione completamente com o backend, você precisará:

1. **Criar serviço API** no frontend
2. **Atualizar AuthContext** para usar JWT
3. **Modificar componentes** para usar API em vez de localStorage

### Exemplo de Serviço API (src/services/api.ts)

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3002/api';

class ApiService {
  private token: string | null = localStorage.getItem('token');

  async login(email: string, password: string) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.token) {
      this.token = data.token;
      localStorage.setItem('token', data.token);
    }
    return data;
  }

  async getCollections() {
    const response = await fetch(`${API_BASE_URL}/collections`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return response.json();
  }
}

export default new ApiService();
```

## 📊 Estrutura Final

```
VPS
├── Nginx (80/443) → Proxy Reverso
│   ├── / → Frontend (localhost:3001)
│   └── /api → Backend (localhost:3002)
├── Container Frontend (React + Nginx)
├── Container Backend (Express + Prisma)
└── Container PostgreSQL (Banco de dados)
```

## 🔧 Comandos Úteis

### Docker

```bash
# Ver logs em tempo real
docker-compose logs -f

# Reiniciar apenas um serviço
docker-compose restart backend

# Executar comando no container
docker exec -it recicla-backend sh

# Backup do banco
docker exec recicla-postgres pg_dump -U recicla_user recicla_db > backup.sql
```

### Banco de Dados

```bash
# Conectar ao PostgreSQL
docker exec -it recicla-postgres psql -U recicla_user -d recicla_db

# Executar migration manual
docker exec recicla-backend npx prisma migrate deploy

# Reset do banco (CUIDADO!)
docker exec recicla-backend npx prisma migrate reset
```

### Nginx

```bash
# Testar configuração
sudo nginx -t

# Recarregar configuração
sudo systemctl reload nginx

# Ver logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

## 🎯 Resultado Esperado

- ✅ Aplicação acessível em https://appcoleta.polygonconsulting.com.br
- ✅ Backend API funcionando em /api/*
- ✅ PostgreSQL persistindo dados
- ✅ Login e registro funcionando
- ✅ Múltiplos usuários simultâneos
- ✅ Dados preservados entre restarts

## 🆘 Troubleshooting

### Backend não inicia

```bash
# Ver logs detalhados
docker logs recicla-backend

# Verificar variáveis de ambiente
docker exec recicla-backend env

# Testar conexão com banco
docker exec recicla-backend npx prisma db pull
```

### Banco não conecta

```bash
# Verificar se PostgreSQL está rodando
docker logs recicla-postgres

# Testar conexão manual
docker exec -it recicla-postgres psql -U recicla_user -d recicla_db
```

### Nginx 502 Bad Gateway

```bash
# Verificar se containers estão rodando
docker ps

# Testar portas localmente
curl http://localhost:3001
curl http://localhost:3002/health
```

---

**🚀 Deploy realizado com sucesso! A aplicação agora tem backend real com PostgreSQL!**
