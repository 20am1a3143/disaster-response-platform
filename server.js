const disastersRouter = require('./routes/disasters');
const geocodeRouter = require('./routes/geocode');
const socialRouter = require('./routes/social');
const resourcesRouter = require('./routes/resources');
const updatesRouter = require('./routes/updates');
const verifyRouter = require('./routes/verify');

app.use('/disasters', disastersRouter);
app.use('/geocode', geocodeRouter);
app.use('/disasters', socialRouter); // social and resources are subroutes of disasters
app.use('/disasters', resourcesRouter);
app.use('/disasters', updatesRouter);
app.use('/disasters', verifyRouter);

require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Generate a Node.js Express route for POST /disasters

const express = require('express');
const app = express();
const port = 3000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.use(express.json());

app.post('/disasters', async (req, res) => {
    const { title, description, tags } = req.body;

    if (!title || !description) {
        return res.status(400).send({ message: 'Title and description are required' });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        const prompt = `Extract the location from the following disaster description: "${description}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const location = response.text().trim();

        const newDisaster = {
            id: Date.now(),
            title,
            description,
            location,
            tags: tags || []
        };

        res.status(201).send(newDisaster);
    } catch (error) {
        console.error('Error with Gemini API:', error);
        res.status(500).send({ message: 'Failed to extract location using Gemini API' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});

// Use Mapbox API to get coordinates for location