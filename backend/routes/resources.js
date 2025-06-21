const express = require('express');
const supabase = require('../supabase');
const { getCache, setCache } = require('../cache');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /disasters/:id/resources?lat=...&lon=...
router.get('/:id/resources', auth, async (req, res) => {
    const { id } = req.params;
    let { lat, lon, distance = 10 } = req.query;
    const cacheKey = `resources:${id}:${lat}:${lon}:${distance}`;

    try {
        let cached = await getCache(cacheKey);
        if (cached) {
            console.log(`[Cache] HIT for ${cacheKey}`);
            return res.json(cached);
        }
        console.log(`[Cache] MISS for ${cacheKey}`);

        if (!lat || !lon) {
            const { data: disaster, error } = await supabase
                .from('disasters')
                .select('location')
                .eq('id', id)
                .single();
            if (error || !disaster) return res.status(404).json({ message: 'Disaster not found' });

            const match = disaster.location.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
            if (!match) return res.status(500).json({ message: 'Invalid location format in database' });

            lon = parseFloat(match[1]);
            lat = parseFloat(match[2]);
        }

        const { data, error } = await supabase.rpc('find_resources_near', {
            lon: parseFloat(lon),
            lat: parseFloat(lat),
            distance_km: parseFloat(distance)
        });

        if (error) throw error;

        await setCache(cacheKey, data);
        req.io.emit('resources_updated', { disaster_id: id, resources: data });
        res.json(data);

    } catch (error) {
        console.error('Failed to fetch resources:', error);
        res.status(500).json({ message: 'Failed to fetch resources', error: error.message });
    }
});

module.exports = router;