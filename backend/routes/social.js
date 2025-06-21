const express = require('express');
const { getCache, setCache } = require('../cache');
const auth = require('../middleware/auth');

const router = express.Router();

const URGENT_KEYWORDS = ['urgent', 'sos', 'help', 'emergency', 'asap'];

// Simple keyword-based classifier
function classifyReport(post) {
    const postLower = post.toLowerCase();
    for (const keyword of URGENT_KEYWORDS) {
        if (postLower.includes(keyword)) {
            return 'High';
        }
    }
    return 'Normal';
}

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

    // More varied mock social media data
    const rawPosts = [
      { post: "#floodrelief Need food in NYC, this is an SOS!", user: "citizen1" },
      { post: "Offering shelter in Brooklyn for anyone displaced.", user: "reliefAdmin" },
      { post: "Is the bridge on 5th street closed? Need info ASAP", user: "travelerX" },
      { post: "Just saw a fire near the old warehouse. Can anyone confirm?", user: "observer22" },
      { post: "We need URGENT medical assistance at the town square.", user: "medic_volunteer" }
    ];

    const classifiedData = rawPosts.map(p => ({
        ...p,
        priority: classifyReport(p.post)
    }));

    await setCache(cacheKey, classifiedData);
    req.io.emit('social_media_updated', { disaster_id: id, reports: classifiedData });
    res.json(classifiedData);
  } catch (error) {
    console.error('Failed to fetch social media data:', error);
    res.status(500).json({ message: 'Failed to fetch social media data' });
  }
});

module.exports = router;