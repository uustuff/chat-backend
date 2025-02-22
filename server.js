const WebSocket = require('ws');
const express = require('express');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let clients = [];
let adminClients = [];
let messages = [];
let messageIdCounter = 0;
let onlineUsers = [];

app.use(express.static(path.join(__dirname, 'public')));

wss.on('connection', (ws) => {
    console.log('New client connected');
    ws.send(JSON.stringify({ type: 'init', messages }));

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        switch (data.type) {
            case 'user':
                if (data.message === '!online') {
                    const userList = onlineUsers.map((u, i) => `${i + 1}. ${u.username}👨‍💻`).join('<br>');
                    ws.send(JSON.stringify({ type: 'system', message: `Online users 🌐:<br>${userList}` }));
                } else {
                    let mentionedUsers = [];
                    let newMessage = {
                        id: messageIdCounter++,
                        type: 'user',
                        username: data.username,
                        message: data.message,
                        isAdmin: false
                    };

                    messages.push(newMessage);
                    broadcast(newMessage);

                    data.message.replace(/@(\w+)/g, (_, mentionedUser) => {
                        let user = onlineUsers.find(u => u.username === mentionedUser);
                        if (user) mentionedUsers.push(user.ws);
                    });

                    mentionedUsers.forEach(userWs => {
                        userWs.send(JSON.stringify({
                            type: 'mention',
                            from: data.username,
                            message: data.message
                        }));
                    });
                }
                break;
            case 'admin-login':
                if (data.username === 'admin' && data.password === '690595') {
                    ws.send(JSON.stringify({ type: 'admin-login-success' }));
                    adminClients.push(ws);
                } else {
                    ws.send(JSON.stringify({ type: 'admin-login-failed' }));
                }
                break;
            case 'delete-message':
                if (adminClients.includes(ws)) {
                    messages = messages.filter(msg => msg.id !== parseInt(data.messageId));
                    broadcast({ type: 'delete-message', messageId: data.messageId });
                }
                break;
            case 'typing':
                broadcast({ type: 'typing', username: data.username });
                break;
            case 'stop-typing':
                broadcast({ type: 'stop-typing', username: data.username });
                break;
        }
    });

    clients.push(ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);
        if (data.type === 'user' && !onlineUsers.some(user => user.username === data.username)) {
            onlineUsers.push({ ws, username: data.username });
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        adminClients = adminClients.filter(admin => admin !== ws);
        onlineUsers = onlineUsers.filter(user => user.ws !== ws);
    });
});

function broadcast(message) {
    clients.forEach(client => client.send(JSON.stringify(message)));
}

server.listen(3000, () => console.log('Server running on port 3000'));
