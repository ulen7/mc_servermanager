# Minecraft Server Manager

---

## Stage 1: Script Fortification & Prerequisite Automation

**Goal**: Make the mc-deploy-wizard.sh script more robust and self-sufficient by automatically installing its own dependencies on Ubuntu-based systems.

### Step 1.1: Add OS and Permission Checks

Before attempting any installations, the script must verify it's running in the correct environment and has the necessary permissions.
-  Action: Modify the start of the script to check for OS compatibility
-  Action: Check for sudo privileges, as installations will require them.

### Step 1.2: Create a Prerequisite Installation Function
This function will check for and install Docker, Docker Compose, and rclone.
Action: Create a new function called install_prerequisites.
Implementation:
Docker: Check if the docker command exists. If not, use the official convenience script for installation.
```
if ! command -v docker &> /dev/null; then
    echo "Docker not found. Installing..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    echo "Docker installed. You may need to log out and log back in for group changes to take effect."
    rm get-docker.sh
fi
```

Docker Compose: The Docker script now typically includes Docker Compose. Verify its presence.
```
if ! docker compose version &> /dev/null; then
    echo "Docker Compose not found or not working. Please install it manually."
    exit 1
fi
```

---
## Stage 2: Web Management Console Development
