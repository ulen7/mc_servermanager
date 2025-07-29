// All application configuration and constants
export const CONFIG = {
    // Socket configuration
    SOCKET: {
        RECONNECTION_DELAY: 1000,
        RECONNECTION_ATTEMPTS: 5
    },
    
    // Log management
    LOGS: {
        MAX_LOGS: 1000,
        TAIL_COUNT: 50,
        DEBOUNCE_DELAY: 1000,
        STORAGE_KEY: 'minecraft_console_logs'
    },
    
    // Command history
    COMMANDS: {
        MAX_HISTORY: 50,
        STORAGE_KEY: 'minecraft_command_history'
    },
    
    // UI settings
    UI: {
        AUTO_SCROLL_DEFAULT: true,
        SEARCH_HIGHLIGHT_CLASS: 'search-highlight',
        LOG_CATEGORIES: ['all', 'error', 'player', 'server', 'command', 'info']
    },
    
    // API endpoints
    API: {
        CONTROL: {
            START: '/api/control/start',
            STOP: '/api/control/stop',
            RESTART: '/api/control/restart'
        },
        COMMAND: '/api/command'
    },
    
    // RCON filter patterns
    RCON_FILTER_PATTERNS: [
        /RCON LISTENER.*started/i,
        /RCON Client.*started/i,
        /RCON Client.*shutting down/i,
        /Thread RCON Client/i,
        /\[RCON\]/i,
        /^\s*$/,
        /Connection.*established/i,
    ]
};

// Icon mappings
export const ICONS = {
    CONNECTION_STATUS: {
        success: '🟢',
        error: '🔴',
        warning: '🟡',
        default: '🔌'
    }
};

// Status messages
export const MESSAGES = {
    CONNECTION: {
        CONNECTED: 'Connected to server',
        DISCONNECTED: 'Disconnected from server',
        ERROR: 'Connection error occurred',
        RECONNECTING: 'Reconnecting...'
    },
    SERVER: {
        STARTING: 'Starting server...',
        STOPPING: 'Stopping server...',
        RESTARTING: 'Restarting server...'
    }
};
