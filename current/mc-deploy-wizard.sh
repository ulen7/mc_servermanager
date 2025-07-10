#!/bin/bash
set -euo pipefail

# What this does:
# -e: Exit immediately if a command exits with a non-zero status.
# -u: Treat unset variables as an error when substituting.
# -o pipefail: The return value of a pipeline is the status of the last command
#              to exit with a non-zero status, or zero if no command fails.

# Minecraft Server Setup
# Maintained at: https://github.com/ulen7/mc_servermanager/new/main/current
# Version: 1.0.0

# === 0. Constants & Defaults ===
DEFAULT_SERVER_NAME="mc_server"
DEFAULT_VERSION="1.21"
DEFAULT_SERVER_TYPE=2
DEFAULT_MEMORY="4G"
DEFAULT_JPORT="25565"
DEFAULT_BPORT="19132"
DEFAULT_IMAGE="itzg/minecraft-server"
DEFAULT_SEED=""
DEFAULT_USE_GEYSER="no"
DEFAULT_ENABLE_BACKUPS="no"
DEFAULT_ENABLE_TAILSCALE="no"

# Reserved ports that should be avoided
RESERVED_PORTS=(22 80 443 3389 5432 3306 21 25 53 110 143 993 995)

# === 1. Helper Functions ===

# Cleanup function for script failure
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ] && [ -n "${SERVER_DIR:-}" ] && [ -d "$SERVER_DIR" ]; then
        echo "Script failed. Cleaning up..."
        rm -rf "$SERVER_DIR"
        echo "Removed incomplete server directory: $SERVER_DIR"
    fi
    exit $exit_code
}
trap cleanup EXIT

# Progress indicator
show_progress() {
    local message="$1"
    local delay="${2:-0.1}"
    echo -n "$message"
    for i in {1..3}; do
        echo -n "."
        sleep "$delay"
    done
    echo " Done!"
}

# Enhanced logging function
log() {
    local level="${1:-INFO}"
    shift
    echo "$(date +'%Y-%m-%d %H:%M:%S') [$level] - $*" >> "$SCRIPT_LOG"
}

# Check prerequisites
check_prerequisites() {
    echo "Checking system prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo "Error: Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if docker-compose is available
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        echo "Error: Docker Compose is not available. Please install Docker Compose."
        exit 1
    fi
    
    echo "✓ All prerequisites met"
}

# Reusable function for handling yes/no prompts
prompt_yes_no() {
    local prompt_text="$1"
    local default_value="$2"
    local input

    while true; do
        read -p "$prompt_text" input
        input="${input:-$default_value}" # Apply default if input is empty
        input="${input,,}" # Convert to lowercase

        case "$input" in
            y|yes) echo "yes"; return 0 ;;
            n|no)  echo "no";  return 0 ;;
            *)     echo "Please enter 'yes' or 'no'." ;;
        esac
    done
}

# Enhanced port validation
validate_port() {
    local port="$1"
    local port_name="$2"
    local exclude_port="${3:-}"
    
    # Check format and range
    if ! [[ "$port" =~ ^[0-9]+$ ]] || [ "$port" -lt 1024 ] || [ "$port" -gt 65535 ]; then
        echo "Invalid $port_name port. Please enter a number between 1024 and 65535."
        return 1
    fi
    
    # Check for reserved ports
    for reserved in "${RESERVED_PORTS[@]}"; do
        if [ "$port" -eq "$reserved" ]; then
            echo "Port $port is a commonly reserved system port. Please choose another."
            return 1
        fi
    done
    
    # Check for port conflicts with other selected ports
    if [ -n "$exclude_port" ] && [ "$port" -eq "$exclude_port" ]; then
        echo "$port_name port $port conflicts with another selected port ($exclude_port)."
        return 1
    fi
    
    # Check if port is already in use
    if ss -tuln | awk '{print $5}' | grep -Eq ":${port}\$"; then
        echo "Port $port is already in use by another service."
        return 1
    fi
    
    return 0
}

# === 2. System Checks ===
check_prerequisites

# === 3. Intro & User Prompts ===
echo "=== Minecraft Server Setup Script v1.1.0 ==="
echo "Let's configure your Minecraft server..."
echo "Pressing Enter will select the default option shown in [brackets]."
echo ""

# === Server Name ===
RESERVED_NAMES=("con" "nul" "prn" "aux" "clock\$" "com1" "com2" "com3" "lpt1" "lpt2" "lpt3" "dev" "sys" "proc")

while true; do
    read -p "Enter a name for your server [${DEFAULT_SERVER_NAME}]: " SERVER_NAME
    SERVER_NAME="${SERVER_NAME:-$DEFAULT_SERVER_NAME}"

    # 1. Validate characters
    if ! [[ "$SERVER_NAME" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "Invalid name. Use only letters, numbers, underscores, or dashes."
        continue
    fi

    # 2. Check against reserved/system names
    for reserved in "${RESERVED_NAMES[@]}"; do
        if [[ "${SERVER_NAME,,}" == "$reserved" ]]; then
            echo "'$SERVER_NAME' is a reserved system name. Please choose another."
            continue 2
        fi
    done

    # 3. Check for existing server folders, case-insensitively
    SERVER_ROOT="$HOME/minecraft_servers"
    if [ ! -d "$SERVER_ROOT" ]; then
        mkdir -p "$SERVER_ROOT"
    fi

    existing_dirs=$(find "$SERVER_ROOT" -mindepth 1 -maxdepth 1 -type d -printf "%f\n" 2>/dev/null | tr '[:upper:]' '[:lower:]')

    if echo "$existing_dirs" | grep -qx "${SERVER_NAME,,}"; then
        echo "A server with a similar name already exists: '$SERVER_NAME'"
        while true; do
            read -p "Type [r] to rename or [c] to cancel: " choice
            case "${choice,,}" in
                r) break ;;
                c) echo "Setup cancelled."; exit 1 ;;
                *) echo "Invalid choice. Please type 'r' to rename or 'c' to cancel." ;;
            esac
        done
    else
        break
    fi
done

# Directory Creation
SERVER_DIR="$SERVER_ROOT/$SERVER_NAME"
SCRIPT_LOG="$SERVER_DIR/minecraft_setup.log"

show_progress "Generating server folder"

mkdir -p "$SERVER_DIR" || {
    echo "Failed to create server directory: $SERVER_DIR"
    exit 1
}

touch "$SCRIPT_LOG" || {
    echo "Cannot write to log file: $SCRIPT_LOG"
    exit 1
}

log "INFO" "=== Minecraft Setup Started ==="
log "INFO" "Minecraft server $SERVER_NAME created"

# === Minecraft Version ===
while true; do
    read -p "Enter the Minecraft version [${DEFAULT_VERSION}]: " MC_VERSION
    MC_VERSION="${MC_VERSION:-$DEFAULT_VERSION}"
    if [[ "$MC_VERSION" =~ ^[0-9]+\.[0-9]+(\.[0-9]+)?$ ]]; then
        log "INFO" "Minecraft version set to: $MC_VERSION"
        break
    else
        log "WARN" "Invalid Minecraft version input: $MC_VERSION"
        echo "Invalid version format. Use format like '1.20.4' or '1.21'."
    fi
done

# === Server Type ===
echo "Select the server type:"
PS3="Choose an option [default: ${DEFAULT_SERVER_TYPE}]: "
options=("vanilla" "fabric" "spigot" "paper")
select opt in "${options[@]}"; do
    if [[ -z "$REPLY" ]]; then # Check if user just pressed Enter
        SERVER_TYPE="$DEFAULT_SERVER_TYPE"
        echo "Defaulting to: $SERVER_TYPE"
        log "INFO" "Minecraft type set to: $SERVER_TYPE"
        break
    elif [[ " ${options[*]} " == *" $opt "* ]]; then
        SERVER_TYPE="$opt"
        log "INFO" "Minecraft type set to: $SERVER_TYPE"
        break
    else
        echo "Invalid option. Please choose a number from the list."
        log "WARN" "Failed to select a server type"
    fi
done

# === Memory Allocation ===
while true; do
    read -p "How much memory in GB to allocate (4-32) [${DEFAULT_MEMORY}]: " MEMORY
    MEMORY="${MEMORY:-$DEFAULT_MEMORY}"

    if [[ "$MEMORY" =~ ^[0-9]+$ ]] && (( MEMORY >= 4 && MEMORY <= 32 )); then
        MEMORY="${MEMORY}G"
        log "INFO" "$MEMORY selected for memory"
        break
    else
        echo "Please enter a whole number between 4 and 32."
        log "WARN" "$MEMORY is an invalid value for memory"
    fi
done

# === Java Port ===
while true; do
    read -p "Enter the Java Edition port [${DEFAULT_JPORT}]: " MC_JPORT
    MC_JPORT="${MC_JPORT:-$DEFAULT_JPORT}"

    if validate_port "$MC_JPORT" "Java Edition"; then
        log "INFO" "$MC_JPORT port selected for Java Minecraft"
        break
    fi
done

# === Optional Features - Geyser for Bedrock compatibility===
USE_GEYSER=$(prompt_yes_no "Enable Geyser for Bedrock cross-play? (y/n) [${DEFAULT_USE_GEYSER}]: " "$DEFAULT_USE_GEYSER")

# === Bedrock Port ===
if [ "$USE_GEYSER" == "yes" ]; then
    log "INFO" "Geyser enabled. Asking for Bedrock port..."

    while true; do
        read -p "Enter the Bedrock Edition port [${DEFAULT_BPORT}]: " MC_BPORT
        MC_BPORT="${MC_BPORT:-$DEFAULT_BPORT}"

        if validate_port "$MC_BPORT" "Bedrock Edition" "$MC_JPORT"; then
            log "INFO" "Bedrock port selected: $MC_BPORT"
            break
        fi
    done
else
    log "INFO" "Geyser not enabled. Skipping Bedrock port configuration."
fi

# === SEED (Fixed) ===
while true; do
    read -p "Enter desired seed (leave blank for random) [${DEFAULT_SEED}]: " MC_SEED
    MC_SEED="${MC_SEED:-$DEFAULT_SEED}"
    
    # Allow empty seed (random generation)
    if [[ -z "$MC_SEED" ]]; then
        log "INFO" "Random seed will be used"
        break
    elif [[ "$MC_SEED" =~ ^[0-9]+$ ]] && \
        awk -v n="$MC_SEED" 'BEGIN { exit !(n >= 0 && n <= 9999999999999999999) }'; then
        log "Seed chosen: $MC_SEED"
        break      
    else
        log "WARN" "Invalid Seed chosen: $MC_SEED"
        echo "Invalid Seed. Please enter a number between 0 and 9999999999999999999, or leave blank for random."
    fi
done

# === Optional Features - Back-Ups===
ENABLE_BACKUPS=$(prompt_yes_no "Enable automatic backups? (y/n) [${DEFAULT_ENABLE_BACKUPS}]: " "$DEFAULT_ENABLE_BACKUPS")

# === Tailscale Prompt & Secure Key Input ===
ENABLE_TAILSCALE=$(prompt_yes_no "Enable remote access with Tailscale? (y/n) [${DEFAULT_ENABLE_TAILSCALE}]: " "$DEFAULT_ENABLE_TAILSCALE")
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    echo ""
    echo ""    
    log "INFO" "Tailscale Enabled, setting configuration..."
    echo "Please generate an OAuth Key from your Tailscale Admin Console."
    echo "Visit: https://tailscale.com/kb/1282/docker"
    echo "It is recommended to use an Ephemeral, Pre-authorized, and Tagged key."
    
    # Ensure directory exists
    if [ ! -d "$SERVER_DIR" ]; then
        mkdir -p "$SERVER_DIR" || { log "ERROR" "Failed to create directory: $SERVER_DIR"; exit 1; }
    fi
    
    while true; do
        read -s -p "Enter your Tailscale OAuth Key (will not be displayed): " TS_AUTHKEY
        echo ""
        read -s -p "Enter your Tailscale Tag (will not be displayed): " TS_TAG
        echo
        if [ -z "$TS_AUTHKEY" ]; then
            echo "❌ Auth Key cannot be empty."
            continue
        fi
        
        log "INFO" "Validating Tailscale Auth Key format..."
        show_progress "Validating key format"
        
        if [[ ! "$TS_AUTHKEY" =~ ^tskey-auth-[a-zA-Z0-9_-]+$ ]]; then
            echo "❌ Invalid Auth Key format. Please check your key."
            log "WARN" "Auth Key format is invalid (length: ${#TS_AUTHKEY})"
            continue
        fi
        
        # Create .env file with error checking
        if echo "TS_AUTHKEY=${TS_AUTHKEY}" > "${SERVER_DIR}/.env" && chmod 600 "${SERVER_DIR}/.env"; then
            log "INFO" "Auth Key validated and saved securely."
            echo "✓ Created .env file for secure key storage."
        else
            log "ERROR" "Failed to create .env file"
            echo "❌ Failed to create .env file"
            exit 1
        fi
        
        # Create .gitignore file with error checking
        if cat > "${SERVER_DIR}/.gitignore" <<EOF
# Ignore sensitive environment variables
.env
# Ignore log files and state directories
*.log
tailscale-state/
# Ignore backups
backups/
*.tar.gz
EOF
        then
            log "INFO" "Created .gitignore file."
        else
            log "WARN" "Failed to create .gitignore file"
        fi
        break
    done
fi

# === 4. Configuration Summary ===
log "INFO" "Displaying configuration summary"
echo ""
echo "=== Configuration Summary ==="
printf "%-22s %s\n" "----------------------" "----------------------------------------"
printf "%-20s: %s\n" "Server Name" "$SERVER_NAME"
printf "%-20s: %s\n" "Minecraft Version" "$MC_VERSION"
printf "%-20s: %s\n" "Server Type" "$SERVER_TYPE"
printf "%-20s: %s\n" "Memory" "$MEMORY"
printf "%-20s: %s\n" "Java Port" "$MC_JPORT"
printf "%-20s: %s\n" "Enable Geyser" "$USE_GEYSER"
if [ -n "$MC_SEED" ]; then
    printf "%-20s: %s\n" "Seed" "$MC_SEED"
    printf "%-20s: %s\n" "Seed Map" "https://www.chunkbase.com/apps/seed-map#seed=$MC_SEED"
else
    printf "%-20s: %s\n" "Seed" "Random"
fi
if [ "$USE_GEYSER" == "yes" ]; then
    printf "%-20s: %s\n" "Bedrock Port" "$MC_BPORT"
fi
printf "%-20s: %s\n" "Enable Backups" "$ENABLE_BACKUPS"
printf "%-20s: %s\n" "Enable Tailscale" "$ENABLE_TAILSCALE"
echo ""

# === 5. Confirmation & Action ===
CONFIRMATION=$(prompt_yes_no "Proceed with this configuration? (y/n) [y]: " "y")
if [ "$CONFIRMATION" == "no" ]; then
    log "INFO" "Setup cancelled by user"
    echo "Setup cancelled by user."
    exit 1
fi

cd "$SERVER_DIR" || exit 1

# === 6. Generate docker-compose.yml ===
log "INFO" "Generating docker-compose file in $SERVER_DIR"

# Initialize variables
IMAGE="$DEFAULT_IMAGE"
MOD_ENV_BLOCK=""
COMPOSE_FILE="${SERVER_DIR}/docker-compose.yml"

# Check if the server type is Fabric to add mods
if [ "$SERVER_TYPE" == "fabric" ]; then
    MODS_LIST="fabric-api, viaversion,viafabric"
    if [ "$USE_GEYSER" == "yes" ]; then
        MODS_LIST="${MODS_LIST},floodgate,skinrestorer"
        log "INFO" "Mods added: $MODS_LIST"
    fi
    MOD_ENV_BLOCK="      MODRINTH_PROJECTS: \"${MODS_LIST}\""
fi

# Start creation of the docker-compose.yml file with error handling
if ! cat > "$COMPOSE_FILE" <<EOF
services:
EOF
then
    log "ERROR" "Failed to create docker-compose.yml"
    exit 1
fi

# Add Tailscale service if enabled

if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    # Create tailscale state directory
    mkdir -p "${SERVER_DIR}/tailscale-state"
    
    cat >> "$COMPOSE_FILE" <<EOF
  tailscale-sidecar:
    image: tailscale/tailscale:latest
    hostname: ${SERVER_NAME}
    container_name: ${SERVER_NAME}-tailscale-sidecar
    environment:
      - TS_AUTHKEY=\${TS_AUTHKEY}
      - TS_EXTRA_ARGS=--advertise-tags=tag:${TS_TAG}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
    volumes:
      - ${SERVER_DIR}/tailscale-state:/var/lib/tailscale
    devices:
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - net_admin
    restart: unless-stopped
    ports:
      - "${MC_JPORT}:${MC_JPORT}"
EOF
    if [ "$USE_GEYSER" == "yes" ]; then
        echo "      - \"${MC_BPORT}:${MC_BPORT}/udp\"" >> "$COMPOSE_FILE"
    fi
fi

# Create the docker-compose.yml file with error handling
cat >> "$COMPOSE_FILE" <<EOF
  minecraft:
    image: ${IMAGE}
    container_name: ${SERVER_NAME}
    restart: unless-stopped
    tty: true
    stdin_open: true
EOF

# Add network mode for Tailscale
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    echo "    network_mode: \"service:tailscale-sidecar\"" >> "$COMPOSE_FILE"
fi

# Add ports only if NOT using Tailscale (since sidecar handles networking)
if [ "$ENABLE_TAILSCALE" != "yes" ]; then
    cat >> "$COMPOSE_FILE" <<EOF
    ports:
      - "${MC_JPORT}:${MC_JPORT}"
EOF
    if [ "$USE_GEYSER" == "yes" ]; then
        echo "      - \"${MC_BPORT}:${MC_BPORT}/udp\"" >> "$COMPOSE_FILE"
    fi
fi

# Add environment variables
cat >> "$COMPOSE_FILE" <<EOF
    environment:
      EULA: "TRUE"
      VERSION: "${MC_VERSION}"
      TYPE: "${SERVER_TYPE^^}"
      MEMORY: "${MEMORY}"
      SERVER_PORT: "${MC_JPORT}"
      MAX_PLAYERS: "4"
      MODE: "creative"
      PVP: "false"
      RESOURCE_PACK_ENFORCE: "TRUE"
EOF

# Only add SEED if it's not empty
if [ -n "$MC_SEED" ]; then
    echo "      SEED: \"${MC_SEED}\"" >> "$COMPOSE_FILE"
fi

# Add mod environment block if present
if [ -n "$MOD_ENV_BLOCK" ]; then
    echo "      $MOD_ENV_BLOCK" >> "$COMPOSE_FILE"
fi

# Add volumes
cat >> "$COMPOSE_FILE" <<EOF
    volumes:
      - ${SERVER_DIR}:/data
EOF

# TO REVIEW

if [ "$USE_GEYSER" == "yes" ]; then

    GEYSER_DIR="${SERVER_DIR}/config/geyser"
    GEYSER_CONFIG="${GEYSER_DIR}/config.yml"

    mkdir -p "$GEYSER_DIR"

    cat >> "$COMPOSE_FILE" <<EOF
  geyser:
    image: bmoorman/geyser:latest
    container_name: ${SERVER_NAME}-geyser
    restart: unless-stopped
EOF

fi
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    echo "    network_mode: \"service:tailscale-sidecar\"" >> "$COMPOSE_FILE"
fi
if [ "$USE_GEYSER" == "yes" ]; then
    cat >> "$COMPOSE_FILE" <<EOF
    volumes:
      - ${GEYSER_DIR}:/var/lib/geyser
EOF
fi

if [ "$USE_GEYSER" == "yes" ]; then
    cat > "$GEYSER_CONFIG" <<EOF
bedrock:
  port: ${MC_BPORT}
  clone-remote-port: false
  motd1: "Geyser"
  motd2: "Another Geyser server."
  server-name: "Geyser"
  compression-level: 6
  enable-proxy-protocol: false
remote:
  address: auto
  port: ${MC_JPORT}
  auth-type: floodgate
  use-proxy-protocol: false
  forward-hostname: false
floodgate-key-file: key.pem
saved-user-logins:
  - ThisExampleUsernameShouldBeLongEnoughToNeverBeAnXboxUsername
  - ThisOtherExampleUsernameShouldAlsoBeLongEnough
pending-authentication-timeout: 120
command-suggestions: true
passthrough-motd: true
passthrough-player-counts: true
legacy-ping-passthrough: false
ping-passthrough-interval: 3
forward-player-ping: false
max-players: 100
debug-mode: false
show-cooldown: title
show-coordinates: true
disable-bedrock-scaffolding: false
emote-offhand-workaround: "disabled"
cache-images: 0
allow-custom-skulls: true
max-visible-custom-skulls: 128
custom-skull-render-distance: 32
add-non-bedrock-items: true
above-bedrock-nether-building: false
force-resource-packs: true
xbox-achievements-enabled: false
log-player-ip-addresses: true
notify-on-new-bedrock-update: true
unusable-space-block: minecraft:barrier
scoreboard-packet-threshold: 20

enable-proxy-connections: false
mtu: 1400
use-direct-connection: true
disable-compression: true
config-version: 4
EOF
fi

# Verify file was created successfully
if [ -f "$COMPOSE_FILE" ]; then
    echo "✓ docker-compose.yml created successfully!"
    log "INFO" "docker-compose.yml created in: $SERVER_DIR"
else
    log "ERROR" "Failed to create docker-compose.yml"
    exit 1
fi

echo ""
echo "To start your server, run these commands:"
echo "   cd $SERVER_DIR"
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    echo "   docker compose --env-file .env up -d"
else
    echo "   docker compose up -d"
fi

# === 7. Launch & Final Configuration ===

LAUNCH_NOW=$(prompt_yes_no "Would you like to start the server now? (y/n) [y]: " "y")

if [ "$LAUNCH_NOW" == "no" ]; then
    echo "All set! You can start your server later using the commands above."
    log "INFO" "Docker container will be launched manually"
    exit 0
fi

# Start the Docker Container

show_progress "Starting the server in the background"

# Use the appropriate docker compose command based on Tailscale configuration
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    log "INFO" "Starting with Tailscale configuration (using .env file)"
    if ! (cd "$SERVER_DIR" && docker compose --env-file .env up -d); then
        echo "Docker Compose failed to start. Check logs with: docker logs ${SERVER_NAME}"
        log "ERROR" "Docker Compose failed to start with Tailscale configuration"
        exit 1
    fi
else
    log "INFO" "Starting without Tailscale"
    if ! (cd "$SERVER_DIR" && docker compose up -d); then
        echo "Docker Compose failed to start. Check logs with: docker logs ${SERVER_NAME}"
        log "ERROR" "Docker Compose failed to start"
        exit 1
    fi
fi

# Connection information
if [ "$ENABLE_TAILSCALE" == "yes" ]; then
    echo ""
    echo "   Tailscale is enabled. Your server will be available on your Tailnet."
    echo "   Check your Tailscale admin console: https://login.tailscale.com/admin/machines"
    echo "   Look for the machine named '${SERVER_NAME}'"
    echo "   Connect using its Tailscale IP or hostname in Minecraft."
else
    echo ""
    echo "   Your server should be available at:"
    echo "   Java Edition: $(hostname):${MC_JPORT}"
    if [ "$USE_GEYSER" == "yes" ]; then
        echo "   Bedrock Edition: $(hostname):${MC_BPORT}"
    fi
fi

# Wait for server initialization with better feedback
echo ""
echo "Waiting for server to initialize... (This may take a few minutes)"
TIMEOUT=300 # 5 minutes
SECONDS=0
DOTS=0

while ! docker logs "$SERVER_NAME" 2>&1 | grep -q "Starting remote control"; do
    if [ $SECONDS -gt $TIMEOUT ]; then
        echo ""
        echo "Server did not start within the timeout period."
        log "ERROR" "Server startup timeout. Check logs: docker logs ${SERVER_NAME}"
        echo "   Check the logs with: docker logs ${SERVER_NAME}"
        exit 1
    fi
    
    # Progress dots with counter
    printf "."
    DOTS=$((DOTS + 1))
    if [ $((DOTS % 20)) -eq 0 ]; then
        echo " ${SECONDS}s"
    fi
    sleep 5
done

echo ""
echo "Server has initialized successfully!"
log "INFO" "Server has initialized successfully."

# Configure Geyser / copying floodgate key with improved timing
if [ "$USE_GEYSER" == "yes" ]; then
    echo ""
    show_progress "Configuring Geyser"
    log "INFO" "Attempting to configure Geyser..."
    
    # Wait a bit more for Geyser files to be created
    sleep 10
    
    PLUGINS_DIR="$SERVER_DIR/config"
    FLOODGATE_CONFIG_PATH=$(find "$PLUGINS_DIR" -type f -name "key.pem" -path "*/floodgate*/key.pem" 2>/dev/null | head -n 1)

    if [ -f "$FLOODGATE_CONFIG_PATH" ]; then
        echo "Found Floodgate config at: $FLOODGATE_CONFIG_PATH"
        log "INFO" "Found Floodgate config at: $FLOODGATE_CONFIG_PATH"
        
        CONFIRM_SED=$(prompt_yes_no "Use Floodgate to authenticate Bedrock users? (y/n) [y]: " "y")
        if [ "$CONFIRM_SED" == "yes" ]; then
            # Create backup of original config
            cp "$FLOODGATE_CONFIG_PATH" "$GEYSER_DIR"

            show_progress "Restarting geyser to apply new settings"
            (cd "$SERVER_DIR" && docker restart "$SERVER_NAME"-geyser)
            echo "Geyser configuration complete!"
        else
            echo "Configuration skipped. Update port manually to ${MC_BPORT} if needed."
            log "WARN" "Geyser configuration skipped by user."
        fi
    else
        echo "   Could not find Floodgate key.pem"
        echo "   The server may need more time, or Floodgate may not be installed correctly."
        echo "   You may need to copy the key.pem file to ${GEYSER_DIR} manually."
        log "WARN" "Could not find floodgate key.oem file, to be copied manually later"
    fi
fi

# === 8. Backup Configuration ===
if [ "$ENABLE_BACKUPS" == "yes" ]; then
    echo ""
    echo "=== Configuring Backups ==="
    log "INFO" "Setting up backup configuration..."

    # Check if rclone is installed
    if ! command -v rclone &> /dev/null; then
        echo "⚠ rclone is not installed, but is required for backups."
        log "WARN" "rclone not installed"
        INSTALL_RCLONE=$(prompt_yes_no "   Install rclone now? (requires sudo) (y/n) [y]: " "y")
        if [ "$INSTALL_RCLONE" == "yes" ]; then
            if ! sudo -v; then
                echo "✗ Sudo permissions required. Install rclone manually."
                exit 1
            fi
            show_progress "Installing rclone"
            sudo apt-get update && sudo apt-get install -y rclone
            if ! command -v rclone &> /dev/null; then
                 echo "rclone installation failed. Install manually."
                 log "ERROR" "Failed to install rclone"
                 exit 1
            fi
            echo "✅ rclone installed successfully."
            log "INFO" "rclone installed successfully."
        else
            echo "⚠ Skipping backup configuration. Install rclone and re-run to set up backups."
            log "INFO" "Backup configuration skipped"
            ENABLE_BACKUPS="no"
        fi
    fi

    # Configure rclone remote
    if [ "$ENABLE_BACKUPS" == "yes" ]; then
         while true; do
            read -p "Enter your configured rclone remote name (e.g., gdrive): " RCLONE_REMOTE
            if [ -n "$RCLONE_REMOTE" ]; then
                if rclone listremotes | grep -q "^${RCLONE_REMOTE}:$"; then
                    echo "✓ Found rclone remote: ${RCLONE_REMOTE}"
                    log "INFO" "Using rclone remote: ${RCLONE_REMOTE}"
                    break
                else
                    echo "⚠ Warning: rclone remote '${RCLONE_REMOTE}' not found."
                    PROCEED_ANYWAY=$(prompt_yes_no "   Continue anyway? (y/n) [y]: " "y")
                    if [ "$PROCEED_ANYWAY" == "yes" ]; then
                        log "WARN" "Using unverified rclone remote: ${RCLONE_REMOTE}"
                        break
                    fi
                fi
            else
                echo "Remote name cannot be empty."
            fi
        done
    fi
fi

# Generate Backup Script
if [ "$ENABLE_BACKUPS" == "yes" ]; then
    log "INFO" "Generating backup script"
    show_progress "Generating backup script"
    
    SCRIPTS_DIR="$SERVER_DIR/scripts"
    BACKUP_SCRIPT_PATH="$SCRIPTS_DIR/backup.sh"
    LOCAL_BACKUP_PATH="$HOME/minecraft_backups/$SERVER_NAME"
    
    mkdir -p "$SCRIPTS_DIR"

    cat > "$BACKUP_SCRIPT_PATH" << EOF
#!/bin/bash
# Auto-generated backup script for ${SERVER_NAME}

# --- Configuration ---
WORLD_NAME="${SERVER_NAME}"
WORLD_DATA_DIR="${SERVER_DIR}"
BACKUP_DIR="${LOCAL_BACKUP_PATH}"
TIMESTAMP=\$(date +'%Y-%m-%d_%H-%M')
BACKUP_NAME="\${WORLD_NAME}_\${TIMESTAMP}.tar.gz"
REMOTE_NAME="${RCLONE_REMOTE}"
REMOTE_PATH="minecraft_backups/\${WORLD_NAME}"
LOG_FILE="${SCRIPTS_DIR}/backup.log"
MAX_LOCAL_BACKUPS=7
MAX_REMOTE_BACKUPS=4

# --- Logging ---
log_backup() {
    echo "[\$(date +'%Y-%m-%d %H:%M:%S')] \$1" >> "\${LOG_FILE}"
}

log_backup "=== Starting Backup for \${WORLD_NAME} ==="

# --- Create Backup Directory ---
mkdir -p "\$BACKUP_DIR"

# --- Stop server temporarily for consistent backup ---
log_backup "Stopping server for backup..."
docker compose -f "${SERVER_DIR}/docker-compose.yml" stop minecraft

# --- Create Compressed Backup ---
log_backup "Creating compressed backup..."
if tar -czf "\$BACKUP_DIR/\$BACKUP_NAME" -C "\$WORLD_DATA_DIR" .; then
    log_backup "Successfully created local backup: \$BACKUP_NAME"
else
    log_backup "ERROR: Failed to create tarball."
    docker compose -f "${SERVER_DIR}/docker-compose.yml" start minecraft
    exit 1
fi

# --- Restart server ---
log_backup "Restarting server..."
docker compose -f "${SERVER_DIR}/docker-compose.yml" start minecraft

# --- Upload to Cloud Storage ---
log_backup "Uploading to \${REMOTE_NAME}..."
if rclone copy "\$BACKUP_DIR/\$BACKUP_NAME" "\${REMOTE_NAME}:\${REMOTE_PATH}"; then
    log_backup "Successfully uploaded to \${REMOTE_NAME}"
else
    log_backup "ERROR: rclone upload failed."
fi

# --- Rotate Local Backups ---
log_backup "Rotating local backups (keeping \${MAX_LOCAL_BACKUPS})..."
ls -1t "\$BACKUP_DIR"/*.tar.gz 2>/dev/null | tail -n +\$((MAX_LOCAL_BACKUPS + 1)) | xargs -r rm

echo "--- Backup Complete ---" >> "\${LOG_FILE}"

EOF

    log "Backup Script created succesfully"
    # Make the script executable
    chmod +x "$BACKUP_SCRIPT_PATH"
    echo "Backup script created at ${BACKUP_SCRIPT_PATH}"

    # --- Prepare Cron Job Instruction ---
    CRON_JOB="0 3 * * 0 TZ=America/Toronto ${BACKUP_SCRIPT_PATH} >> ${SCRIPTS_DIR}/cron.log 2>&1"
    
    # Store the cron instruction in a variable to display at the end
    BACKUP_INSTRUCTION=$(cat <<EOF

---
backups:
   To automate your backups, add the following line to your system's crontab.
   Run 'crontab -e' and paste this line at the bottom:

   ${CRON_JOB}

   This will run the backup every Sunday at 3:00 AM Toronto time.
EOF
)

fi


# === 8. Completion Message ===

# Display the backup instruction if it was generated
if [ -n "$BACKUP_INSTRUCTION" ]; then
    echo "$BACKUP_INSTRUCTION"
fi

echo "---"
log "All taks completed"
echo "All tasks complete. Enjoy your server!"
