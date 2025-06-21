const express = require('express');
const supabase = require('../supabase');
const { verifyImage } = require('../gemini');
const { getCache, setCache } = require('../cache');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /disasters/:id/verify-image
router.post('/:id/verify-image', auth, async (req, res) => {
  const { id } = req.params;
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ message: 'image_url is required' });

  const cacheKey = `verify:${id}:${image_url}`;

  try {
    let cached = await getCache(cacheKey);
    if (cached) {
      console.log(`[Cache] HIT for ${cacheKey}`);
      return res.json(cached);
    }
    console.log(`[Cache] MISS for ${cacheKey}`);

    // Get disaster type/description
    const { data: disaster, error } = await supabase
      .from('disasters')
      .select('title, description')
      .eq('id', id)
      .single();
    if (error || !disaster) return res.status(404).json({ error: 'Disaster not found' });

    const result = await verifyImage(image_url);

    await setCache(cacheKey, result);

    // Optional: Update a 'reports' table with the verification status
    // For now, just return the result.

    res.json(result);
  } catch (error) {
    console.error('Failed to verify image:', error);
    res.status(500).json({ message: 'Failed to verify image', error: error.message });
  }
});

module.exports = router;
