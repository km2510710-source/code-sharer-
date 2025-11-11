const { WebSocketServer } = require('ws');

const wss = new WebSocketServer({ port: 8080 });

// Map to store rooms and the clients within them
// rooms = Map<roomName, Set<WebSocketClient>>
const rooms = new Map();

console.log('Codesharer server started on port 8080...');

wss.on('connection', (ws) => {
    console.log('Client connected');
    let clientRoom = null;

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        // The first message must be 'join'
        if (data.type === 'join') {
            const { roomName } = data.payload;
            clientRoom = roomName;

            if (!rooms.has(roomName)) {
                rooms.set(roomName, new Set());
            }
            rooms.get(roomName).add(ws);
            console.log(`Client joined room: ${roomName}`);
            
            // Notify others in the room
            broadcast(clientRoom, {
                type: 'info',
                payload: { text: 'A new user has joined.' }
            }, ws);

            return;
        }

        // For other messages, broadcast them to the room
        if (clientRoom && rooms.has(clientRoom)) {
            broadcast(clientRoom, data, ws);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
        if (clientRoom && rooms.has(clientRoom)) {
            rooms.get(clientRoom).delete(ws);

            // If the room is empty, delete it
            if (rooms.get(clientRoom).size === 0) {
                rooms.delete(clientRoom);
                console.log(`Room ${clientRoom} is now empty and has been closed.`);
            } else {
                // Notify remaining users
                broadcast(clientRoom, {
                    type: 'info',
                    payload: { text: 'A user has left.' }
                }, ws);
            }
        }
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

/**
 * Broadcasts a message to all clients in a room, except the sender.
 * @param {string} roomName - The name of the room.
 * @param {object} message - The message object to send.
 * @param {WebSocket} sender - The client that sent the message.
 */
function broadcast(roomName, message, sender) {
    if (rooms.has(roomName)) {
        const clients = rooms.get(roomName);
        clients.forEach((client) => {
            if (client !== sender && client.readyState === client.OPEN) {
                client.send(JSON.stringify(message));
            }
        });
    }
}
