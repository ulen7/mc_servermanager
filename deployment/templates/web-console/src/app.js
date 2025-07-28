// src/app.js - Updated with Socket.IO support
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
const { spawn } = require('child_process');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const MC_CONTAINER = process.env.MC_CONTAINER || 'mc_server';

// --- Middleware & Configuration ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // For form data
app.use(express.static(path.join(__dirname, '../public')));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.authenticated) {
        return next();
    } else {
        return res.redirect('/login');
    }
}

// Store active log streams
const logStreams = new Map();

// --- Socket.IO Connection Handler ---
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Start streaming logs when client connects
    startLogStream(socket);
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
        // Clean up log stream for this socket
        stopLogStream(socket.id);
    });
    
    // Handle custom log requests
    socket.on('requestLogs', (options) => {
        console.log('Client requested logs with options:', options);
        startLogStream(socket, options);
    });
    
    // Handle manual log stream restart
    socket.on('restartLogStream', () => {
        console.log('Client requested log stream restart');
        startLogStream(socket);
    });
});

// Function to start streaming Docker logs
function startLogStream(socket, options = {}) {
    const socketId = socket.id;
    
    // Stop existing stream if any
    stopLogStream(socketId);
    
    // First check if container is running
    const { exec } = require('child_process');
    exec(`docker inspect -f '{{.State.Running}}' ${MC_CONTAINER}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Container inspect error:', error);
            socket.emit('log', {
                timestamp: new Date().toISOString(),
                message: `Error checking container status: ${error.message}`,
                type: 'error'
            });
            return;
        }
        
        const isRunning = stdout.trim() === 'true';
        if (!isRunning) {
            socket.emit('log', {
                timestamp: new Date().toISOString(),
                message: `Container ${MC_CONTAINER} is not running. Start the server to see logs.`,
                type: 'warn'
            });
            return;
        }
        
        // Container is running, start log stream
        startActualLogStream(socket, options);
    });
}

// Separate function for the actual log streaming
function startActualLogStream(socket, options = {}) {
    const socketId = socket.id;
    
    // Default options for docker logs
    const dockerArgs = [
        'logs',
        '--follow',
        '--tail', options.tail || '50',
        MC_CONTAINER
    ];
    
    console.log(`Starting log stream for ${MC_CONTAINER}...`);
    
    // Spawn docker logs process
    const logProcess = spawn('docker', dockerArgs);
    
    // Store the process reference
    logStreams.set(socketId, logProcess);
    
    // Send confirmation to client
    socket.emit('log', {
        timestamp: new Date().toISOString(),
        message: `Connected to ${MC_CONTAINER} log stream`,
        type: 'success'
    });
    
    // Handle stdout (normal logs)
    logProcess.stdout.on('data', (data) => {
        const logLines = data.toString().split('\n').filter(line => line.trim());
        logLines.forEach(line => {
            if (line.trim()) {
                socket.emit('log', {
                    timestamp: new Date().toISOString(),
                    message: line,
                    type: 'info'
                });
            }
        });
    });
    
    // Handle stderr (error logs)
    logProcess.stderr.on('data', (data) => {
        const logLines = data.toString().split('\n').filter(line => line.trim());
        logLines.forEach(line => {
            if (line.trim()) {
                socket.emit('log', {
                    timestamp: new Date().toISOString(),
                    message: line,
                    type: 'error'
                });
            }
        });
    });
    
    // Handle process errors
    logProcess.on('error', (error) => {
        console.error('Log stream error:', error);
        socket.emit('log', {
            timestamp: new Date().toISOString(),
            message: `Log stream error: ${error.message}`,
            type: 'error'
        });
    });
    
    // Handle process exit
    logProcess.on('close', (code) => {
        console.log(`Log stream closed with code ${code} for socket ${socketId}`);
        logStreams.delete(socketId);
        
        if (code !== 0) {
            socket.emit('log', {
                timestamp: new Date().toISOString(),
                message: `Log stream ended with code ${code}`,
                type: 'warn'
            });
        }
        
        // Notify client that log stream ended
        socket.emit('logStreamEnded', { code: code });
    });
}

// Function to stop log stream
function stopLogStream(socketId) {
    const logProcess = logStreams.get(socketId);
    if (logProcess) {
        logProcess.kill('SIGTERM');
        logStreams.delete(socketId);
        console.log(`Stopped log stream for socket ${socketId}`);
    }
}

// --- Routes ---
app.get('/login', (req, res) => {
    // If already authenticated, redirect to console
    if (req.session && req.session.authenticated) {
        return res.redirect('/console');
    }
    
    res.render('login', {
        title: 'Login Page',
        error: null
    });
});

// Handle login POST request
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;
    
    if (username === adminUser && password === adminPass) {
        req.session.authenticated = true;
        req.session.username = username;
        res.redirect('/console');
    } else {
        res.render('login', {
            title: 'Login Page',
            error: 'Invalid username or password'
        });
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Session destruction error:', err);
        }
        res.redirect('/login');
    });
});

app.get('/console', requireAuth, (req, res) => {
    res.render('console', {
        title: 'Server Console',
        containerName: MC_CONTAINER,
        username: req.session.username
    });
});

// Dashboard route
app.get('/dashboard', requireAuth, (req, res) => {
    res.render('dashboard', {
        title: 'Server Dashboard',
        containerName: MC_CONTAINER,
        username: req.session.username
    });
});

app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.redirect('/dashboard'); // Changed from /console
    } else {
        res.redirect('/login');
    }
});

// --- API Routes for Server Control ---
app.post('/api/control/start', requireAuth, (req, res) => {
    const { exec } = require('child_process');
    
    exec(`docker start ${MC_CONTAINER}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Start error:', error);
            return res.json({ success: false, error: error.message });
        }
        
        console.log('Container started:', stdout);
        res.json({ success: true, message: 'Server started successfully' });
        
        // Broadcast to all connected clients
        io.emit('serverStatus', { status: 'running', message: 'Server started' });
        
        // Wait longer for container to fully start, then restart log streams
        setTimeout(() => {
            console.log('Restarting log streams for all connected clients...');
            io.emit('restartLogStream');
        }, 5000); // Increased to 5 seconds
    });
});

app.post('/api/control/stop', requireAuth, (req, res) => {
    const { exec } = require('child_process');
    
    exec(`docker stop ${MC_CONTAINER}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Stop error:', error);
            return res.json({ success: false, error: error.message });
        }
        
        console.log('Container stopped:', stdout);
        res.json({ success: true, message: 'Server stopped successfully' });
        
        // Broadcast to all connected clients
        io.emit('serverStatus', { status: 'stopped', message: 'Server stopped' });
    });
});

app.post('/api/control/restart', requireAuth, (req, res) => {
    const { exec } = require('child_process');
    
    exec(`docker restart ${MC_CONTAINER}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Restart error:', error);
            return res.json({ success: false, error: error.message });
        }
        
        console.log('Container restarted:', stdout);
        res.json({ success: true, message: 'Server restarted successfully' });
        
        // Broadcast to all connected clients
        io.emit('serverStatus', { status: 'running', message: 'Server restarted' });
        
        // Wait longer for container to fully restart, then restart log streams
        setTimeout(() => {
            console.log('Restarting log streams after restart...');
            io.emit('restartLogStream');
        }, 8000); // Increased to 8 seconds for restart
    });
});

// Send command to Minecraft server
app.post('/api/command', requireAuth, (req, res) => {
    const { command } = req.body;
    const { exec } = require('child_process');
    
    // Execute command in the Minecraft container
    exec(`docker exec ${MC_CONTAINER} rcon-cli ${command}`, (error, stdout, stderr) => {
        if (error) {
            console.error('Command error:', error);
            return res.json({ success: false, error: error.message });
        }
        
        res.json({ success: true, output: stdout.trim() });
        
        // Broadcast command execution to all clients
        io.emit('log', {
            timestamp: new Date().toISOString(),
            message: `Command executed: ${command}`,
            type: 'command'
        });
    });
});

// Dashboard Stats API - Add this after your existing /api routes
app.get('/api/dashboard/stats', requireAuth, async (req, res) => {
    try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        
        const stats = {
            timestamp: new Date().toISOString(),
            server: {},
            performance: {},
            players: {}
        };
        
        // Get Docker container status and basic info
        try {
            const { stdout: statusOutput } = await execAsync(`docker inspect ${MC_CONTAINER} --format "{{.State.Status}},{{.State.StartedAt}},{{.Config.Image}}"`);
            const [status, startedAt, image] = statusOutput.trim().split(',');
            
            stats.server.status = status;
            stats.server.image = image;
            
            // Calculate uptime
            if (status === 'running' && startedAt) {
                const startTime = new Date(startedAt);
                const uptime = Date.now() - startTime.getTime();
                stats.server.uptime = formatUptime(uptime);
                stats.server.uptimeMs = uptime;
            } else {
                stats.server.uptime = 'Not running';
                stats.server.uptimeMs = 0;
            }
        } catch (error) {
            console.log('Container status error:', error.message);
            stats.server.status = 'unknown';
            stats.server.uptime = 'Unknown';
            stats.server.uptimeMs = 0;
        }
        
        // Get Docker container resource stats
        try {
            const { stdout: dockerStats } = await execAsync(`docker stats ${MC_CONTAINER} --no-stream --format "table {{.MemUsage}}\\t{{.CPUPerc}}\\t{{.MemPerc}}"`);
            const lines = dockerStats.trim().split('\n');
            if (lines.length > 1) {
                const statsLine = lines[1].trim();
                const [memUsage, cpuPerc, memPerc] = statsLine.split(/\s+/);
                
                stats.performance.memoryUsage = memUsage;
                stats.performance.cpuUsage = cpuPerc;
                stats.performance.memoryPercent = memPerc;
                
                // Parse memory numbers for more detailed info
                const memMatch = memUsage.match(/^([\d.]+\w+)\s*\/\s*([\d.]+\w+)$/);
                if (memMatch) {
                    stats.performance.memoryUsed = memMatch[1];
                    stats.performance.memoryTotal = memMatch[2];
                }
            }
        } catch (error) {
            console.log('Docker stats error:', error.message);
            stats.performance.memoryUsage = 'N/A';
            stats.performance.cpuUsage = 'N/A';
            stats.performance.memoryPercent = 'N/A';
        }
        
        // Get player information using rcon (only if server is running)
        if (stats.server.status === 'running') {
            try {
                const { stdout: playerOutput } = await execAsync(`docker exec ${MC_CONTAINER} rcon-cli list`);
                const playerInfo = parsePlayerInfo(playerOutput);
                stats.players = playerInfo;
            } catch (error) {
                console.log('Player info error:', error.message);
                stats.players = { count: 0, names: [], max: 20, online: [] };
            }
        } else {
            stats.players = { count: 0, names: [], max: 20, online: [] };
        }
        
        // Add server configuration info
        stats.server.version = process.env.MC_VERSION || 'Unknown';
        stats.server.type = process.env.SERVER_TYPE || 'Unknown';
        stats.server.container = MC_CONTAINER;
        
        res.json({ success: true, stats });
        
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to retrieve dashboard stats',
            stats: getDefaultStats()
        });
    }
});

// Helper function to format uptime
function formatUptime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
        return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    } else {
        return `${seconds}s`;
    }
}

// Enhanced player info parser
function parsePlayerInfo(rconOutput) {
    try {
        const lines = rconOutput.trim().split('\n');
        const mainLine = lines[0] || '';
        
        // Parse: "There are 2 of a max of 20 players online: player1, player2"
        const countMatch = mainLine.match(/There are (\d+) of a max of (\d+) players online/);
        if (countMatch) {
            const count = parseInt(countMatch[1]);
            const max = parseInt(countMatch[2]);
            
            // Extract player names
            const namesMatch = mainLine.match(/online: (.+)$/);
            const names = namesMatch ? 
                namesMatch[1].split(', ').map(name => name.trim()).filter(name => name.length > 0) : 
                [];
            
            // Create detailed player objects
            const online = names.map(name => ({
                name: name,
                joinTime: 'Unknown', // Could be enhanced with log parsing
                status: 'online'
            }));
            
            return { count, max, names, online };
        }
        
        return { count: 0, max: 20, names: [], online: [] };
        
    } catch (error) {
        console.log('Player parsing error:', error.message);
        return { count: 0, max: 20, names: [], online: [] };
    }
}

// Default stats for error cases
function getDefaultStats() {
    return {
        timestamp: new Date().toISOString(),
        server: {
            status: 'unknown',
            uptime: 'Unknown',
            uptimeMs: 0,
            version: 'Unknown',
            type: 'Unknown',
            container: MC_CONTAINER
        },
        performance: {
            memoryUsage: 'N/A',
            cpuUsage: 'N/A',
            memoryPercent: 'N/A'
        },
        players: {
            count: 0,
            max: 20,
            names: [],
            online: []
        }
    };
}

// --- Server Startup ---
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Monitoring Minecraft container: ${MC_CONTAINER}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    
    // Stop all log streams
    logStreams.forEach((process, socketId) => {
        stopLogStream(socketId);
    });
    
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});