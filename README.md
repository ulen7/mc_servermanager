# Minecraft Server Manager

## ROADMAP

---

### Stage 1: Local Web Console (Single Server)

#### Features:
- View Minecraft server logs (console output)
- Start/stop/restart server
- Edit server properties (e.g., memory, mode, max players, seed)
- Reflect current status (running, stopped, errors)

##### Suggested Tech Stack:
  - Backend: Flask (Python) or Express (Node.js) — fast, simple, and Docker-friendly
  - Frontend: HTML + minimal JS (Bootstrap or Tailwind)
  - Access: Local network only (http://host:port)

---

### Stage 2: Add Dynamic Config Editor

#### Features:
- GUI for editing server.properties (and optionally, docker-compose.yml)
- Save & restart server to apply changes
- Show live feedback if syntax is wrong

---

### Stage 3: Support Multiple Servers
#### Features:
- “Add New Server” wizard (name, ports, memory, version, etc.)
- Each server has its own page with control panel
- Dynamically generate and launch a new Docker Compose project per server

---

### Stage 4: Central Manager & User Auth
#### Features:
- Admin login (simple password-based to start)

- Central dashboard of all server instances (statuses, ports, actions)

***Optionally*** run over Tailscale for secure remote access

---

### Stage 5: Advanced Features
- Web-based backup management (launch now, view history)
- Integration with Geyser auto-config
- Port conflict detection
- Resource usage stats (RAM/CPU per container)
- API endpoints (for automation or mobile app in the future)

--- 

## OLD STUFF

---

An interactive Bash script that helps you configure and deploy a fully customized Minecraft server using Docker Compose — with support for **Java**, **Bedrock (via Geyser)**, **Fabric mods**, **Tailscale VPN**, **automatic backups to Google Drive**, and optional **RCON web interface**.

---

## Features

- 🧱 Supports **Vanilla**, **Fabric**, **Spigot**, and **Paper**
- 🌉 Optional **Geyser** for Bedrock Edition cross-play
- 📦 **Fabric mod installation** via Modrinth (with future manual mod support)
- 🔒 **Tailscale VPN** support for remote play on a private network
- ☁️ **Automated backups** to Google Drive via `rclone`, with rotation and logging
- 💾 Fully interactive and **recoverable setup**
- 📂 Generates `docker-compose.yml`, `backup.sh`, and startup instructions
- ⌛ Optional progress bar and post-launch configuration (e.g., auto-patching Geyser)

---

## Requirements

- **Bash**
- **Docker** + **Docker Compose V2**
- Optional:
  - `rclone` (for cloud backups)
  - `sudo` access (for rclone installation)
  - Tailscale account & auth key

---

## How It Works

1. Clone or download the script.
2. Run it in your terminal:
   ```
   ./setup-mc-server.sh
   ```
3. Follow the interactive prompts to:
    - Set server name, version, type, ports, memory, seed
    - Enable optional services (Geyser, Tailscale, backups, RCON)
    - Input mod preferences (for Fabric)
4. The script:
    - Generates a complete docker-compose.yml
    - Sets up optional Tailscale and backup services
    - Can immediately launch your server
5. (Optional) Automatically configures Geyser's Bedrock port inside the container.

---

## Output Files
- `docker-compose.yml`: Main config to launch your Minecraft server
- `scripts/backup.sh`: Cloud backup script (if enabled)
- `scripts/backup.log`: Backup execution logs
- `scripts/cron.log`: Output of scheduled cron jobs
- Server files: Located under `~/minecraft_servers/<server_name>`

---

## Backups
- Runs every weekly according to a preset schedule
- Keeps only the 4 most recent cloud backups
- To enable:
  - Install rclone
  - Configure your remote (e.g., gdrive)
  - Add the provided cron job:
 
    
    ```
    crontab -e
    # Add this line (to create backup every sunday at 3am Toronto time)
    0 3 * * 0 TZ=America/Toronto /home/user/minecraft_servers/myserver/scripts/backup.sh >> /home/user/minecraft_servers/myserver/scripts/cron.log 2>&1
    ```

---

## Tailscale Setup
If enabled:
- A sidecar container is added to provide Tailscale access
- You’ll need an auth key from your Tailscale admin panel
- Your server becomes reachable via your Tailnet IP/hostname

---

## Planned Features
- [X] Other checks like port repetion and different name for backups
- [ ] Allow user to select when to do the backups and how often.
- [ ] Option to display and validate YAML before launch
- [ ] Manual mod input for Fabric servers
- [ ] Auto-add Geyser plugin for Spigot and Paper
- [X] .env support for cleaner docker-compose templates

## License
This project is released under the MIT License.

## 🙋 FAQ
Q: Does this support Forge or Bukkit?

    - A: Not currently. The focus is on Fabric, Vanilla, Paper, and Spigot for now.

Q: Can I edit the generated docker-compose.yml?

    - A: Absolutely. Just open it in a text editor after generation.

Q: I made a mistake during setup — do I have to start over?

    -  A: No. The script is designed to be recoverable. You can re-run it and overwrite or adjust values.
