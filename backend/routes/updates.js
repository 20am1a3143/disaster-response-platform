const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { getCache, setCache } = require('../cache');
const auth = require('../middleware/auth');

const router = express.Router();

// A mock URL to scrape for demonstration purposes
const SCRAPE_URL = 'https://www.reuters.com/world/';

// GET /disasters/:id/official-updates
router.get('/:id/official-updates', auth, async (req, res) => {
    const { id } = req.params;
    const cacheKey = `updates:${id}`; // In a real app, this might be tied to disaster keywords

    try {
        let cached = await getCache(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT for ${cacheKey}`);
            return res.json(cached);
        }
        console.log(`[Cache] MISS for ${cacheKey}`);

        // Fetch the webpage
        const { data } = await axios.get(SCRAPE_URL);
        const $ = cheerio.load(data);

        const updates = [];
        // This selector is specific to the reuters page structure and may break.
        $('a[data-testid="Heading"]').each((i, el) => {
            if (updates.length < 5) { // Limit to 5 updates
                const title = $(el).text();
                const url = $(el).attr('href');
                updates.push({
                    source: 'Reuters World News',
                    update: title,
                    link: `https://www.reuters.com${url}`
                });
            }
        });

        if (updates.length === 0) {
            return res.status(404).json({ message: 'No updates found from the source.' });
        }

        await setCache(cacheKey, updates, 1800); // Cache for 30 mins
        res.json(updates);

    } catch (error) {
        console.error(`Failed to scrape ${SCRAPE_URL}:`, error);
        res.status(500).json({ message: 'Failed to fetch official updates' });
    }
});

module.exports = router;