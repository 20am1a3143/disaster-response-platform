const express = require('express');
const supabase = require('../supabase');
const { logAction } = require('../utils/logger');
const { geocodeLocation } = require('../utils/geocode');
const { extractLocation } = require('../gemini');
const auth = require('../middleware/auth');

const router = express.Router();

// [POST] /disasters - Create a new disaster
router.post('/', auth, async (req, res) => {
    const { title, description, tags, owner_id } = req.body;

    if (!title || !description) {
        return res.status(400).json({ message: 'Title and description are required' });
    }

    try {
        // 1. Extract location name from description using Gemini
        const locationName = await extractLocation(description);
        if (locationName === 'Unknown') {
            return res.status(400).json({ message: 'Could not determine a location from the description.' });
        }

        // 2. Geocode location name to get lat/lng
        const coordinates = await geocodeLocation(locationName);
        const location = `POINT(${coordinates.lng} ${coordinates.lat})`;

        // 3. Create disaster record in Supabase
        const { data, error } = await supabase
            .from('disasters')
            .insert([{
                title,
                description,
                tags: tags || [],
                owner_id: req.user.username, // From auth middleware
                location_name: locationName,
                location,
                audit_trail: [{ action: 'create', user_id: req.user.username, timestamp: new Date().toISOString() }]
            }])
            .select();

        if (error) throw error;

        const newDisaster = data[0];

        // 4. Emit real-time update
        req.io.emit('disaster_updated', { action: 'create', disaster: newDisaster });

        // 5. Log action
        logAction('disaster_create', { disaster_id: newDisaster.id, owner: req.user.username });

        res.status(201).json(newDisaster);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to create disaster', error: error.message });
    }
});

// [GET] /disasters - Get all disasters (with tag filtering)
router.get('/', async (req, res) => {
    const { tag } = req.query;
    try {
        let query = supabase.from('disasters').select('*').order('created_at', { ascending: false });
        if (tag) {
            query = query.contains('tags', [tag]);
        }
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch disasters', error: error.message });
    }
});

// [PUT] /disasters/:id - Update a disaster
router.put('/:id', auth, async (req, res) => {
    const { id } = req.params;
    const { title, description, tags } = req.body;

    try {
        const { data, error } = await supabase
            .from('disasters')
            .update({ 
                title, 
                description, 
                tags,
                // Add to audit trail
                audit_trail: supabase.sql`audit_trail || '{"action": "update", "user_id": "${req.user.username}", "timestamp": "${new Date().toISOString()}"}'::jsonb`
            })
            .eq('id', id)
            .select();
        
        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Disaster not found' });

        const updatedDisaster = data[0];
        req.io.emit('disaster_updated', { action: 'update', disaster: updatedDisaster });
        logAction('disaster_update', { disaster_id: id, user: req.user.username });
        res.json(updatedDisaster);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update disaster', error: error.message });
    }
});

// [DELETE] /disasters/:id - Delete a disaster
router.delete('/:id', auth, async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase.from('disasters').delete().eq('id', id).select();

        if (error) throw error;
        if (data.length === 0) return res.status(404).json({ message: 'Disaster not found' });
        
        req.io.emit('disaster_updated', { action: 'delete', disaster: { id } });
        logAction('disaster_delete', { disaster_id: id, user: req.user.username });
        res.status(204).send();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to delete disaster', error: error.message });
    }
});

module.exports = router;