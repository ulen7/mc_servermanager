# Minecraft Server Manager

[ROADMAP](./ROADMAP.md)

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
To run the script download the script to your ubuntu machine with:
```
curl -o mc-deploy-wizard.sh https://raw.githubusercontent.com/ulen7/mc_servermanager/main/current/mc-deploy-wizard.sh
```
or
```
curl -o mc-deploy-wizard.sh https://shorturl.at/U0OHn
```
Then do
```
bash ./mc-deploy-wizard.sh
```

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
    0 3 * * * /home/user/scripts/backup_mc_servername.sh >> /home/user/scripts/cron.log 2>&1
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
