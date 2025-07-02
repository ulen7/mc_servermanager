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
