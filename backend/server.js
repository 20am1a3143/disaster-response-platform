require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const supabase = require('./supabase');

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

// --- API Routes ---

// Get all disasters
app.get('/disasters', async (req, res) => {
    const { data, error } = await supabase.from('disasters').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// Create a new disaster
app.post('/disasters', async (req, res) => {
    const { title, description, tags } = req.body;
    // Using a mock user from the header as before
    const owner_id = req.headers.authorization ? req.headers.authorization.split(' ')[1] : 'anonymous';

    const { data, error } = await supabase
        .from('disasters')
        .insert([{ title, description, tags, owner_id }])
        .select();

    if (error) {
        console.error('Error creating disaster:', error);
        return res.status(500).json({ error: error.message });
    }
    
    if (data && data.length > 0) {
        req.io.emit('disaster_updated', data[0]);
        res.status(201).json(data[0]);
    } else {
        res.status(500).json({ error: "Failed to create disaster and retrieve data."});
    }
});

// Placeholder for other routes that were causing crashes
app.get('/disasters/:id/social-media', (req, res) => res.json([]));
app.get('/disasters/:id/resources', (req, res) => res.json([]));
app.get('/disasters/:id/official-updates', (req, res) => res.json([]));
app.post('/disasters/:id/verify-image', (req, res) => res.json({ reason: 'Verification placeholder' }));
app.get('/geocode', (req, res) => res.json({}));

// API Routes
app.use('/api/disasters', disastersRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/social', socialRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/updates', updatesRouter);
app.use('/api/verify', verifyRouter);

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