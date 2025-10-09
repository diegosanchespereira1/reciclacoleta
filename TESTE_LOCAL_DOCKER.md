# 🧪 Teste Local com Docker - Antes de Subir no Portainer

## 📋 Pré-requisitos

### Windows
- Docker Desktop instalado e rodando
- WSL2 configurado (recomendado)

### Linux/Mac
- Docker instalado
- Docker Compose instalado

## 🚀 Como Testar Localmente

### 1. Verificar se o Docker está Rodando

**Windows:**
```powershell
docker --version
docker-compose --version
```

**Se o Docker Desktop não estiver rodando:**
- Abra o Docker Desktop
- Aguarde inicializar (ícone na bandeja do sistema deve estar verde)

### 2. Build da Imagem

```bash
# Fazer build da imagem
docker-compose build

# Ou forçar rebuild sem cache
docker-compose build --no-cache
```

**Tempo estimado**: 2-5 minutos na primeira vez

### 3. Iniciar o Container

```bash
# Iniciar em modo detached (background)
docker-compose up -d

# Ou ver logs em tempo real
docker-compose up
```

### 4. Verificar se Está Rodando

```bash
# Ver containers ativos
docker ps

# Ver logs
docker-compose logs -f

# Ver apenas últimas 50 linhas
docker-compose logs --tail=50
```

### 5. Testar a Aplicação

Abra o navegador em: **http://localhost:3001**

Você deve ver a aplicação rodando!

### 6. Testar Funcionalidades

**Login como Admin:**
- Email: admin@recicla.com
- Senha: admin123

**Login como Coletor:**
- Email: coletor@recicla.com
- Senha: coletor123

**Teste:**
- ✅ Dashboard carrega
- ✅ Pode criar nova coleta
- ✅ Pode ver detalhes da coleta
- ✅ Sistema de pontos funciona
- ✅ Relatórios funcionam
- ✅ Captura de foto funciona

### 7. Parar o Container

```bash
# Parar e remover containers
docker-compose down

# Parar, remover e limpar volumes
docker-compose down -v
```

## 🔧 Comandos Úteis

### Durante o Desenvolvimento

```bash
# Rebuild e restart
docker-compose up -d --build

# Ver logs em tempo real
docker-compose logs -f recicla-coleta

# Entrar no container
docker exec -it recicla-coleta-app sh

# Ver processos no container
docker top recicla-coleta-app

# Ver uso de recursos
docker stats recicla-coleta-app
```

### Limpeza

```bash
# Remover container específico
docker rm recicla-coleta-app

# Remover imagem
docker rmi recicla-coleta-recicla-coleta

# Limpar tudo não utilizado
docker system prune -a

# Limpar apenas build cache
docker builder prune
```

## 🐛 Troubleshooting

### Erro: "Cannot connect to Docker daemon"

**Solução Windows:**
1. Abra o Docker Desktop
2. Aguarde inicializar completamente
3. Tente novamente

**Solução Linux:**
```bash
sudo systemctl start docker
sudo systemctl enable docker
```

### Erro: "Port 3001 is already in use"

**Solução 1 - Mudar porta no docker-compose.yml:**
```yaml
ports:
  - "3002:80"  # Mude de 3001 para 3002
```

**Solução 2 - Parar processo usando a porta:**
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3001 | xargs kill -9
```

### Erro: "Build failed"

```bash
# Limpar cache e rebuildar
docker-compose build --no-cache

# Ver logs detalhados
docker-compose build --progress=plain
```

### Container para imediatamente

```bash
# Ver logs para identificar o erro
docker-compose logs

# Verificar se há erro de sintaxe no nginx.conf
docker run --rm -v $(pwd)/nginx.conf:/etc/nginx/conf.d/default.conf nginx nginx -t
```

### Aplicação carrega mas dá erro 404

- Verifique se o arquivo `nginx.conf` tem a configuração de SPA correta
- Verifique se o build da aplicação foi bem-sucedido

## 📊 Verificação de Qualidade

### Antes de Subir no Portainer

- [ ] Build local funcionou sem erros
- [ ] Container inicia corretamente
- [ ] Aplicação acessível em http://localhost:3001
- [ ] Login funciona (admin e coletor)
- [ ] Dashboard carrega com dados
- [ ] Nova coleta pode ser criada
- [ ] Detalhes da coleta abrem corretamente
- [ ] Sistema de pontos funciona
- [ ] Relatórios carregam
- [ ] PDF pode ser gerado
- [ ] Fotos podem ser capturadas/uploaded
- [ ] Navegação entre páginas funciona
- [ ] Sem erros no console do navegador

### Informações do Build

```bash
# Ver tamanho da imagem
docker images | grep recicla-coleta

# Ver camadas da imagem
docker history recicla-coleta-recicla-coleta:latest

# Inspecionar container
docker inspect recicla-coleta-app
```

## 📦 Preparar para Portainer

### 1. Fazer Commit das Mudanças

```bash
git add Dockerfile docker-compose.yml nginx.conf .dockerignore
git commit -m "feat: Add Docker configuration for deployment"
git push origin main
```

### 2. Testar Pull no Servidor

No seu VPS, teste se consegue clonar:
```bash
git clone https://github.com/diegosanchespereira1/reciclacoleta.git
cd reciclacoleta
ls -la
```

### 3. Informações para o Portainer

- **Repository URL**: https://github.com/diegosanchespereira1/reciclacoleta
- **Reference**: main
- **Compose path**: docker-compose.yml
- **Porta**: 3001:80

## ✅ Checklist Final

Antes de fazer deploy no VPS:

- [ ] Teste local passou
- [ ] Código commitado e pushed
- [ ] docker-compose.yml válido
- [ ] Dockerfile válido
- [ ] nginx.conf válido
- [ ] .dockerignore criado
- [ ] VPS_DEPLOY.md revisado
- [ ] DNS configurado
- [ ] Portainer acessível

## 🎯 Próximo Passo

Se tudo funcionou localmente, você está pronto para:

1. Fazer commit e push dos arquivos Docker
2. Acessar seu Portainer
3. Criar o stack com o repositório Git
4. Deploy! 🚀

---

**Boa sorte com o deploy! Se tudo rodou localmente, vai rodar no servidor também!** ✅

