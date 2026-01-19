# Hassen Dashboard - Vite + Docker Setup Guide

## Project Structure
```
c:\Hassen\
├── src/
│   ├── App.jsx          # Main React component
│   └── main.jsx         # React entry point
├── index.html           # HTML template
├── package.json         # Dependencies
├── vite.config.js       # Vite configuration
├── Dockerfile           # Docker image definition
├── docker-compose.yml   # Docker Compose configuration
├── .dockerignore         # Files to exclude from Docker
└── .gitignore           # Files to exclude from git
```

## Prerequisites

1. **Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop
   - Install and ensure Docker daemon is running

2. **WSL2 (Windows Subsystem for Linux 2)**
   - Recommended for Docker on Windows
   - Docker Desktop will guide you through setup

## Setup Steps

### 1. Install Dependencies (First Time Only)
Open PowerShell in the project folder and run:
```powershell
npm install
```

### 2. Build Docker Image
```powershell
docker build -t hassen-dashboard .
```

### 3. Run with Docker

**Option A: Using Docker Compose (Recommended)**
```powershell
docker-compose up -d
```

**Option B: Using Docker directly**
```powershell
docker run -d -p 5173:5173 --name hassen-dashboard hassen-dashboard
```

### 4. Access the Application
Open your browser and navigate to:
```
http://localhost:5173
```

## Docker Commands

### View running containers
```powershell
docker ps
```

### View logs
```powershell
docker logs hassen-dashboard
```

### Stop the container
```powershell
docker stop hassen-dashboard
```

### Start the container
```powershell
docker start hassen-dashboard
```

### Remove the container
```powershell
docker rm hassen-dashboard
```

### Remove the image
```powershell
docker rmi hassen-dashboard
```

## Development Mode (Without Docker)

For local development without Docker:

```powershell
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Docker Compose Features

- **Automatic restart**: Container restarts unless manually stopped
- **Port mapping**: 5173 → localhost:5173
- **Health checks**: Monitors container health every 30 seconds
- **Volumes**: Can be added for persistent data

## Environment Variables

Edit `docker-compose.yml` to add environment variables:

```yaml
environment:
  - NODE_ENV=production
  - API_URL=http://your-api:8000
```

## Troubleshooting

### Container won't start
```powershell
# Check logs
docker-compose logs app

# Rebuild
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port 5173 already in use
```powershell
# Change port in docker-compose.yml
ports:
  - "5174:5173"  # Map to 5174 instead
```

### Docker daemon not running
- Open Docker Desktop application
- Wait for status indicator to show it's running

### Build fails on Windows
- Ensure no trailing spaces in Dockerfile
- Use CRLF line endings if needed
- Clear Docker cache: `docker system prune -a`

## File Changes to Make

The following files have been created:

1. **package.json** - NPM dependencies and scripts
2. **vite.config.js** - Vite build configuration
3. **index.html** - HTML entry point with Tailwind CSS
4. **src/main.jsx** - React DOM render
5. **src/App.jsx** - Your original app.jsx
6. **Dockerfile** - Multi-stage build for production
7. **docker-compose.yml** - Docker compose configuration
8. **.dockerignore** - Files to exclude from image
9. **.gitignore** - Files to exclude from version control

## Next Steps

1. Install Docker Desktop
2. Navigate to your project directory
3. Run `npm install`
4. Run `docker-compose up -d`
5. Open http://localhost:5173 in your browser

## Production Notes

- The Dockerfile uses a multi-stage build for optimized image size
- Production uses `serve` to run the static site
- Health checks ensure container is responsive
- Node 20 Alpine is used for minimal image size (~150MB)

