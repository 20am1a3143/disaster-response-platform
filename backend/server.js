require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// Import routers
const disastersRouter = require('./routes/disasters');
const geocodeRouter = require('./routes/geocode');
const socialRouter = require('./routes/social');
const resourcesRouter = require('./routes/resources');
const updatesRouter = require('./routes/updates');
const verifyRouter = require('./routes/verify');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Adjust for production
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to our routers
app.use((req, res, next) => {
  req.io = io;
  next();
});

// API Routes
app.use('/disasters', disastersRouter);
app.use('/geocode', geocodeRouter);
app.use('/disasters', socialRouter);
app.use('/disasters', resourcesRouter);
app.use('/disasters', updatesRouter);
app.use('/disasters', verifyRouter);

app.get('/', (req, res) => {
  res.send('Disaster Response Backend is running.');
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('a user connected');
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server, io }; // Export for testing