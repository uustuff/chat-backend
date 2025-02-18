const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];
let adminClients = []; // List of admin clients
let messages = [];
let messageIdCounter = 0;
let onlineUsers = []; // List of online users

app.use(express.static(path.join(__dirname)));

// Fallback route to serve index.html for all unknown routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

wss.on('connection', (ws) => {
    console.log('New client connected');

    // Send initial messages to the client
    ws.send(JSON.stringify({ type: 'init', messages }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'user':
                if (data.message === '!online') {
                    // Handle !online command
                    const onlineUsernames = onlineUsers.map((user, index) => `${index + 1}. ${user.username}👨‍💻`).join('<br>');
                    ws.send(JSON.stringify({ type: 'system', message: `Online users 🌐:<br>${onlineUsernames}` }));
                } else {
                    // Handle user messages
                    const newMessage = {
                        id: messageIdCounter++,
                        type: 'user',
                        username: data.username,
                        message: data.message,
                        isAdmin: false // Default isAdmin to false for regular user messages
                    };
                    messages.push(newMessage);
                    broadcast(newMessage);
                }
                break;
            case 'admin-login':
                // Handle admin login attempt
                if (data.username === 'admin' && data.password === '690595') {
                    ws.send(JSON.stringify({ type: 'admin-login-success' }));
                    adminClients.push(ws); // Add to admin clients list
                } else {
                    ws.send(JSON.stringify({ type: 'admin-login-failed' }));
                }
                break;
            case 'delete-message':
                // Handle message deletion by admin
                if (adminClients.includes(ws)) {
                    const messageId = parseInt(data.messageId);
                    messages = messages.filter(msg => msg.id !== messageId);
                    broadcast({ type: 'delete-message', messageId });
                }
                break;
            default:
                break;
        }
    });

    // Add new client to clients array
    clients.push(ws);

    // Add new user to online users list
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'user' && !onlineUsers.find(user => user.username === data.username)) {
            onlineUsers.push({ ws, username: data.username });
        }
    });

    // Handle client disconnection
    ws.on('close', () => {
        console.log('Client disconnected');
        clients = clients.filter(client => client !== ws);
        adminClients = adminClients.filter(admin => admin !== ws); // Remove from admin clients list
        onlineUsers = onlineUsers.filter(user => user.ws !== ws); // Remove from online users list
    });
});

function broadcast(message) {
    clients.forEach(client => {
        client.send(JSON.stringify(message));
    });
}

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
