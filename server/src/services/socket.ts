import { Server } from "socket.io";
import { Server as HttpServer } from "node:http";

let io: Server | undefined;


export async function initializeSocket(httpServer: HttpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL ?? 'http://localhost:3000',
            credentials: true
        },
    });

    //Listens for an event
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);
    });

    return io;
}