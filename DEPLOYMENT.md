# 🐳 Docker Deployment Guide

## Prerequisites

1. **Install Docker Desktop** (if not already installed):
   - Download from [docker.com](https://www.docker.com/products/docker-desktop/)
   - Start Docker Desktop application

2. **Verify Docker is running**:
   ```bash
   docker --version
   docker-compose --version
   ```

## Deployment Steps

### 1. Prepare Environment

Make sure your `.env` file is properly configured:

```bash
RESEND_API_KEY=re_BGaySEFq_GatLK8W6sbePi54rSydXQduJ
DB_SEND_PASSWORD=12345678
```

### 2. Deploy Services

```bash
# Build and start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 3. Verify Deployment

```bash
# Test API health
curl http://localhost:3000/health

# Test backup endpoint
curl -X POST http://localhost:3000/api/v1/backup-db \
  -H "Content-Type: application/json" \
  -d '{"password": "12345678", "email": "realbencyrus@gmail.com"}'
```

## Services

### Backend Service

- **Container**: `cue-backend`
- **Port**: 3000
- **Health check**: Every 30 seconds
- **Auto-restart**: Unless stopped

### Backup Cron Service

- **Container**: `cue-backup-cron`
- **Schedule**: 12:00 AM & 12:00 PM Toronto time
- **Email**: `realbencyrus@gmail.com`
- **Timezone**: America/Toronto

## Management Commands

```bash
# Stop all services
docker-compose down

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f backup-cron

# Execute command in container
docker-compose exec backend sh
docker-compose exec backup-cron sh
```

## Monitoring

### Check Cron Schedule

```bash
docker-compose exec backup-cron crontab -l
```

### View Backup Logs

```bash
docker-compose logs backup-cron | grep "Starting database backup"
```

### Manual Backup Test

```bash
docker-compose exec backup-cron /backup-script.sh
```

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker-compose logs [service-name]

# Rebuild container
docker-compose up -d --build [service-name]
```

### Cron Not Running

```bash
# Check cron service
docker-compose exec backup-cron ps aux | grep cron

# Check timezone
docker-compose exec backup-cron date
```

### Database Issues

```bash
# Check if database file exists
docker-compose exec backend ls -la cue.db

# Reset database
docker-compose down
rm cue.db
docker-compose up -d
```

## Production Deployment

For production (VPS, cloud, etc.):

1. **Copy your project** to the server
2. **Set production environment variables**
3. **Run with production settings**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

Your automated backup system is now running! 🚀
