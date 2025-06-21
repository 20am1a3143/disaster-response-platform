// backend/utils/geocode.js
const express = require('express');
const { extractLocation } = require('../gemini');
const { geocodeLocation } = require('../utils/geocode');
const { logAction } = require('../utils/logger');

const router = express.Router();

// [POST] /geocode - Extract location from text and return coordinates
router.post('/', async (req, res) => {
    const { description } = req.body;

    if (!description) {
        return res.status(400).json({ message: 'Description is required' });
    }

    try {
        // Step 1: Extract location name from description using Gemini
        const locationName = await extractLocation(description);
        if (locationName === 'Unknown') {
            return res.status(400).json({ message: 'Could not determine a location from the description.' });
        }

        // Step 2: Geocode the location name to get lat/lng
        const coordinates = await geocodeLocation(locationName);

        logAction('geocode_success', { location: locationName });

        res.json({
            locationName,
            coordinates
        });
    } catch (error) {
        console.error(error);
        logAction('geocode_failure', { description, error: error.message });
        res.status(500).json({ message: 'Failed to geocode location', error: error.message });
    }
});

module.exports = router;