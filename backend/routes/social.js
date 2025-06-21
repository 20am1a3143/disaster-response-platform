const express = require('express');
const { getCache, setCache } = require('../cache');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /disasters/:id/social-media
router.get('/:id/social-media', auth, async (req, res) => {
  const { id } = req.params;
  const cacheKey = `social:${id}`;
  
  try {
    let cached = await getCache(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT for ${cacheKey}`);
      return res.json(cached);
    }
    console.log(`[Cache] MISS for ${cacheKey}`);

    // Mock social media data
    const mockData = [
      { post: "#floodrelief Need food in NYC", user: "citizen1", priority: "urgent" },
      { post: "Offering shelter in Brooklyn", user: "reliefAdmin", priority: "normal" }
    ];

    await setCache(cacheKey, mockData);
    req.io.emit('social_media_updated', { disaster_id: id, reports: mockData });
    res.json(mockData);
  } catch (error) {
    console.error('Failed to fetch social media data:', error);
    res.status(500).json({ message: 'Failed to fetch social media data' });
  }
});

module.exports = router;