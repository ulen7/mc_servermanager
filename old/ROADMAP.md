# Minecraft Server Manager Roadmap

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

**Goal**: Create a secure, web-based interface to manage one or more Minecraft servers, moving from basic controls to full remote deployment.

### Phase 2.1: The Foundation - A Single-Server Console
**Objective**: View the live console, send commands, and perform basic start/stop/restart actions for one server.

Technology Stack Recommendation:

- Backend: Node.js with Express.js (for handling HTTP requests) and Socket.IO (for real-time communication).
- Frontend: Simple HTML, CSS, and vanilla JavaScript.
- Docker Interaction: dockerode library for Node.js to communicate with the Docker Engine API.

#### Development Steps:
- Backend Setup:
    - Initialize a Node.js project (npm init).
    - Install dependencies: npm install express socket.io bcrypt dockerode.
    - Create an Express server to serve the HTML page and handle logins.
- Implement secure user authentication:
*Do NOT store passwords in plain text. Use bcrypt to hash and salt user passwords.*
    - Create a simple login endpoint that validates credentials against a stored hash.
    - Use session management to protect other API endpoints.
- Real-Time Console:
    - Set up a Socket.IO server on the backend.
    - When a user is authenticated, use dockerode to get the target Minecraft container.
    - Use the container.logs() method with {follow: true, stdout: true, stderr: true} to stream the container's logs.
    - Pipe this stream directly to the client's browser via Socket.IO.
- Command & Control:
    - Create backend API endpoints for Start, Stop, and Restart (e.g., /api/server/start). These will use dockerode's container.start(), container.stop(), and container.restart() methods.
    - Listen for a "command" event from the client on Socket.IO. When a command is received, use docker exec to run it inside the container. This is safer than attaching to the container's stdin.
- Frontend UI:
    - Create a login.html page.
    - Create a console.html page with:
    - A scrollable `<div>` or `<pre>` tag to display the live console logs.
    - An <input> field and a "Send" button to send commands.
    - "Start," "Stop," and "Restart" buttons.
    - Write JavaScript to handle login, connect to the Socket.IO server, display incoming log data, and send commands/requests to the backend.

### Phase 2.2: Extending Functionality - Properties & Mods
**Objective**: Allow administrators to edit server.properties and manage mods through the web UI.

#### Development Steps:
- Backend - Properties:
    - Create an API endpoint to read the server.properties file from the server's data volume ($HOME/minecraft_servers/[server_name]/data/server.properties).
    - Parse the file's key-value pairs into a JSON object to send to the frontend.
    - Create another endpoint to receive the updated JSON object, safely rebuild the properties file, and overwrite the old one. Always make a backup of the file before overwriting.
- Backend - Mods (for Fabric/Forge):
    - Create an API endpoint to list the contents of the /mods directory.
    - Use a library like multer for Node.js to create an endpoint for handling file uploads. Configure it to save uploaded .jar files directly into the server's mods folder.
- Frontend UI:
    - Add a new "Properties" tab or page that dynamically generates form fields (text inputs, dropdowns) from the JSON data sent by the backend.
    - Add a "Save" button that sends the modified properties back to the server.
    - Add a "Mods" tab that lists current mods and includes a file upload form.
    - *Crucially: Display a prominent "A server restart is required to apply these changes" message and provide a restart button.*

### Phase 2.3: The Major Leap - Multi-Server Management
**Objective**: Evolve the console from managing a single, hardcoded server to a dashboard capable of managing any server created by the script.

#### Development Steps:
*Architecture Refactor: This is the most significant change. The application can no longer assume a single server.*

- Backend:
- Server Discovery: Create a function that scans the $HOME/minecraft_servers/ directory. Each sub-directory represents a server instance. The backend can list these to the frontend.
    - API Redesign: All API endpoints must be modified to accept a server identifier (e.g., the server name). For example: /api/servers/my-first-server/logs.
    - State Management: The backend must manage Docker interactions for multiple containers simultaneously.
- Frontend:
    - Dashboard/Selector: The initial page after login should be a dashboard that lists all available server instances and their current status (Running, Stopped).
    - Context Switching: Clicking on a server should navigate the user to the console/management view for that specific instance. The frontend must send the correct server ID with every API request.

### Phase 2.4: The Ultimate Goal - Full Remote Deployment
**Objective**: Integrate the entire mc-deploy-wizard.sh logic into the web UI, allowing for the creation of new servers without ever touching the command line.

#### Development Steps:

- Backend - The "Wizard" API:
    - Port the entire logic of the mc-deploy-wizard.sh script into a series of Node.js functions.
    - Create a new API endpoint (e.g., /api/servers/create).
    - This endpoint will accept a JSON object containing all the configuration options (server name, version, memory, plugins, etc.).
- The backend logic will then:
    - Perform all validations (port in use, valid name, etc.).
    - Create the server directory structure (mkdir).
    - Dynamically generate the docker-compose.yml file content (fs.writeFile).
    - Execute docker-compose up -d in the new directory using Node's child_process.exec.
- Frontend - The "Wizard" UI:
    - Create a new "Create New Server" page in the web app.
    - This page will be a web form that mirrors the prompts from the original script (text fields for name/version, sliders for memory, checkboxes for Geyser/Tailscale, etc.).
    - On submission, the form data is packaged into a JSON object and sent to the new "create" endpoint on the backend.
    - The UI should show progress feedback (e.g., "Creating directories...", "Pulling Docker image...", "Starting server...") by polling the backend for status updates.
