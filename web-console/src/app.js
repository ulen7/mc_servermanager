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
});

// Function to start streaming Docker logs
function startLogStream(socket, options = {}) {
    const socketId = socket.id;
    
    // Stop existing stream if any
    stopLogStream(socketId);
    
    // Default options for docker logs
    const dockerArgs = [
        'logs',
        '--follow',
        '--tail', options.tail || '50', // Show last 50 lines by default
        MC_CONTAINER
    ];
    
    console.log(`Starting log stream for ${MC_CONTAINER}...`);
    
    // Spawn docker logs process
    const logProcess = spawn('docker', dockerArgs);
    
    // Store the process reference
    logStreams.set(socketId, logProcess);
    
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
        console.log(`Log stream closed with code ${code}`);
        logStreams.delete(socketId);
        if (code !== 0) {
            socket.emit('log', {
                timestamp: new Date().toISOString(),
                message: `Log stream ended with code ${code}`,
                type: 'warn'
            });
        }
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

app.get('/', (req, res) => {
    if (req.session && req.session.authenticated) {
        res.redirect('/console');
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