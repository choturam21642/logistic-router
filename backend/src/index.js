import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
// 1. ADD THIS IMPORT LINE HERE (Adjust the file path if your routes folder structure is different):
import routeRouter from './routes/route.routes.js'; 

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Create HTTP Server
const httpServer = createServer(app);

// Initialize Socket.io with CORS configured for Vite's port
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Store active simulation intervals so we can clear them if needed
const activeSimulations = new Map();

// Socket.io Connection Handler
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('start-driver-simulation', ({ routeId, pathCoordinates }) => {
    console.log(`🚚 Starting driver simulation for Route: ${routeId}`);
    
    if (activeSimulations.has(routeId)) {
      clearInterval(activeSimulations.get(routeId));
    }

    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < pathCoordinates.length) {
        const currentLoc = pathCoordinates[currentIndex];
        
        io.emit('driver-position-update', {
          routeId,
          position: currentLoc,
          isFinished: currentIndex === pathCoordinates.length - 1
        });

        currentIndex++;
      } else {
        clearInterval(interval);
        activeSimulations.delete(routeId);
        console.log(`🏁 Simulation finished for Route: ${routeId}`);
      }
    }, 1500);

    activeSimulations.set(routeId, interval);
  });

  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// 2. ADD THIS MIDDLEWARE LINE HERE:
app.use('/api', routeRouter); 

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server spinning on port ${PORT}`);
});