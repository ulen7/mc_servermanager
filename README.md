# Minecraft Server Manager with Web Console

A comprehensive Minecraft server deployment solution that combines automated server setup with a real-time web management console.

## Features

### 🎮 Minecraft Server Setup
- **Multiple Server Types**: Vanilla, Fabric, Spigot, Paper
- **Cross-Platform Support**: Geyser integration for Bedrock compatibility
- **Remote Access**: Tailscale VPN integration
- **Automated Backups**: rclone-based cloud backup system
- **Docker-based**: Containerized deployment for easy management

### 🌐 Web Management Console
- **Real-time Log Streaming**: Live server logs via WebSocket
- **Server Control**: Start, stop, restart servers from web interface
- **Command Execution**: Send commands directly to Minecraft server
- **Authentication**: Secure login system
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Linux/macOS system (Windows with WSL2)
- 4GB+ RAM available for Minecraft server
- Network ports available (25565 for Minecraft, 3000 for web console)

### 1. Download and Setup
```bash
# Clone or download the project
git clone <your-repo-url>
cd minecraft-server-manager

# Make scripts executable
chmod +x scripts/build-and-deploy.sh
chmod +x deployment/mc-deploy-wizard.sh

# Build the project
./scripts/build-and-deploy.sh build
```

### 2. Deploy Your Server
```bash
# Run the interactive deployment wizard
./scripts/build-and-deploy.sh deploy

# Or run the deployment script directly
cd deployment
./mc-deploy-wizard.sh
```

Follow the interactive prompts to configure:
- Server name and Minecraft version
- Server type (Vanilla, Fabric, etc.)
- Memory allocation
- Network ports
- Web console credentials
- Optional features (Geyser, Tailscale, backups)

### 3. Access Your Server
After deployment, you'll have access to:
- **Minecraft Server**: `your-server:25565` (Java Edition)
- **Web Console**: `http://your-server:3000`
- **Bedrock Support**: `your-server:19132` (if Geyser enabled)

## Project Structure

```
minecraft-server-manager/
├── deployment/
│   ├── mc-deploy-wizard.sh           # Main deployment script
│   └── templates/web-console/        # Web console templates
│       ├── src/app.js               # Express server with Socket.IO
│       ├── views/                   # EJS templates
│       ├── docker/Dockerfile        # Web console container
│       └── package.json             # Node.js dependencies
├── scripts/
│   └── build-and-deploy.sh          # Build and deployment tools
└── README.md
```

## Configuration Options

### Server Configuration
- **Minecraft Versions**: Any version supported by itzg/minecraft-server
- **Server Types**: 
  - Vanilla (official Minecraft server)
  - Fabric (mod-friendly, lightweight)
  - Spigot (plugin support)
  - Paper (optimized Spigot fork)
- **Memory**: 4-32GB allocation
- **Ports**: Customizable (defaults: 25565 Java, 19132 Bedrock, 3000 Web)

### Web Console Features
- **Authentication**: Username/password login
- **Real-time Logs**: Live streaming via Socket.IO
- **Server Control**: Start/stop/restart functionality
- **Command Interface**: Execute Minecraft commands remotely
- **Auto-reconnect**: Automatic log stream reconnection after server restarts

### Optional Features
- **Geyser**: Cross-platform play (Java ↔ Bedrock)
- **Tailscale**: Secure remote access via VPN
- **Automated Backups**: Scheduled world backups to cloud storage
- **Resource Packs**: Automatic resource pack enforcement

## Advanced Usage

### Manual Deployment
```bash
# Test deployment in isolated environment
./scripts/build-and-deploy.sh test

# Create deployment package for distribution
./scripts/build-and-deploy.sh package
```

### Custom Configuration
Edit template files in `deployment/templates/web-console/` to customize:
- Web interface styling (`public/css/style.css`)
- Server application logic (`src/app.js`)
- HTML templates (`views/*.ejs`)

### Backup Configuration
The script can configure automated backups using rclone:
1. Install and configure rclone with your cloud provider
2. Enable backups during deployment
3. Backups run daily at 3:00 UTC by default

### Tailscale Integration
For secure remote access:
1. Create a Tailscale account and get an OAuth key
2. Enable Tailscale during deployment
3. Access your server using Tailscale IPs from anywhere

## Troubleshooting

### Common Issues

**Docker Permission Errors**
```bash
sudo usermod -aG docker $USER
# Log out and back in
```

**Port Already in Use**
```bash
# Check what's using the port
sudo netstat -tulpn | grep :25565
# Change ports during deployment
```

**Web Console Not Loading**
```bash
# Check container logs
docker logs mc_server-web-console

# Verify container is running
docker ps | grep web-console
```

**Minecraft Server Won't Start**
```bash
# Check server logs
docker logs mc_server

# Common issues: insufficient memory, EULA not accepted
```

### Log Locations
- Deployment logs: `~/minecraft_servers/[server-name]/minecraft_setup.log`
- Minecraft logs: `docker logs [server-name]`
- Web console logs: `docker logs [server-name]-web-console`
- Backup logs: `~/scripts/[server-name]/backup.log`

## Security Considerations

### Network Security
- Change default ports if exposed to internet
- Use Tailscale for secure remote access
- Configure firewall rules appropriately

### Web Console Security
- Use strong passwords for web console
- Consider placing behind reverse proxy (nginx, Caddy)
- Enable HTTPS in production environments

### Docker Security
- Web console requires Docker socket access for server control
- Run containers with minimal necessary privileges
- Regular security updates of base images

## Contributing

### Development Setup
```bash
# Clone repository
git clone <repo-url>
cd minecraft-server-manager

# Make changes to web console
cd deployment/templates/web-console
# Edit src/app.js, views/, etc.

# Test changes
cd ../../../
./scripts/build-and-deploy.sh test
```

### Submitting Changes
1. Fork the repository
2. Create a feature branch
3. Test your changes thoroughly
4. Submit a pull request with detailed description

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [itzg/minecraft-server](https://github.com/itzg/docker-minecraft-server) - Docker Minecraft server
- [Geyser](https://geysermc.org/) - Cross-platform Minecraft proxy
- [Tailscale](https://tailscale.com/) - Secure networking solution
- [Socket.IO](https://socket.io/) - Real-time communication

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review existing GitHub issues
3. Create a new issue with detailed information:
   - Operating system and version
   - Docker version
   - Complete error messages
   - Steps to reproduce

---

**Note**: This tool creates and manages Docker containers with significant system access. Always review the code and understand what it does before running in production environments.