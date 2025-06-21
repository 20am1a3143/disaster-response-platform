const express = require('express');
const request = require('supertest');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mClient = {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    rpc: jest.fn(),
    in: jest.fn().mockReturnThis(),
  };
  return {
    createClient: jest.fn(() => mClient),
  };
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient();

// Mock axios and Gemini
jest.mock('axios');
jest.mock('@google/generative-ai');

// Express app and router setup
const router = express.Router();
router.post('/disasters', async (req, res) => {
  try {
    const { type, location, date, severity, description } = req.body;
    if (!type || !location || !date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const disaster = {
      type,
      location,
      date,
      severity: severity || 'medium',
      description: description || '',
      reportedAt: new Date(),
    };
    res.status(201).json({ message: 'Disaster reported successfully', disaster });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/disasters/:id/resources', async (req, res) => {
  try {
    const { id } = req.params;
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('latitude, longitude')
      .eq('id', id)
      .single();
    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    const { latitude, longitude } = disaster;
    const { data: resources, error: rpcError } = await supabase.rpc('find_resources_in_radius', {
      lat: latitude,
      long: longitude,
      radius_km: 10,
    });
    if (rpcError) {
      throw rpcError;
    }
    res.status(200).json({ resources });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/disasters/:id/verify-image', async (req, res) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: 'Image URL is required' });
    }
    const { data: disaster, error: disasterError } = await supabase
      .from('disasters')
      .select('type, description')
      .eq('id', id)
      .single();
    if (disasterError || !disaster) {
      return res.status(404).json({ error: 'Disaster not found' });
    }
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
    const genAI = new GoogleGenerativeAI('fake-key');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    const prompt = `This image is claimed to be related to a ${disaster.type} disaster with the description: "${disaster.description}". Does the image content visually support this claim? Please answer with only "Yes" or "No".`;
    const imagePart = {
      inlineData: {
        data: imageBuffer.toString('base64'),
        mimeType: imageResponse.headers['content-type'],
      },
    };
    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const isVerified = responseText.toLowerCase().includes('yes');
    res.status(200).json({ verified: isVerified, reason: responseText });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

const app = express();
app.use(express.json());
app.use('/', router);

// TESTS

describe('POST /disasters', () => {
  it('should create a new disaster record with required fields', async () => {
    const testData = {
      type: 'Earthquake',
      location: 'Tokyo, Japan',
      date: '2023-12-01',
      severity: 'high',
      description: 'Major earthquake in Tokyo',
    };
    const response = await request(app).post('/disasters').send(testData);
    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Disaster reported successfully');
    expect(response.body.disaster).toMatchObject(testData);
    expect(response.body.disaster.reportedAt).toBeDefined();
  });

  it('should return 400 if required fields are missing', async () => {
    const invalidData = { type: 'Flood', severity: 'medium' };
    const response = await request(app).post('/disasters').send(invalidData);
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Missing required fields');
  });

  it('should use default severity if not provided', async () => {
    const testData = {
      type: 'Wildfire',
      location: 'California, USA',
      date: '2023-12-01',
    };
    const response = await request(app).post('/disasters').send(testData);
    expect(response.status).toBe(201);
    expect(response.body.disaster.severity).toBe('medium');
  });
});

describe('GET /disasters/:id/resources', () => {
  it('should return resources within 10km of a disaster', async () => {
    const disasterId = 1;
    const disasterData = { latitude: 35.6895, longitude: 139.6917 };
    const resourcesData = [
      { name: 'Tokyo International Clinic', type: 'hospital' },
      { name: 'Shinjuku Central Park Shelter', type: 'shelter' },
    ];
    supabase.from().select().eq().single.mockResolvedValueOnce({ data: disasterData, error: null });
    supabase.rpc.mockResolvedValueOnce({ data: resourcesData, error: null });
    const response = await request(app).get(`/disasters/${disasterId}/resources`);
    expect(response.status).toBe(200);
    expect(response.body.resources).toEqual(resourcesData);
  });

  it('should return 404 if disaster not found', async () => {
    supabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: 'Not found' });
    const response = await request(app).get('/disasters/999/resources');
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Disaster not found');
  });
});

describe('POST /disasters/:id/verify-image', () => {
  it('should verify an image as related to the disaster using Gemini API', async () => {
    const disasterId = 2;
    const disasterData = { type: 'Wildfire', description: 'A large wildfire spreading across a forest.' };
    supabase.from().select().eq().single.mockResolvedValueOnce({ data: disasterData, error: null });
    const mockImageBuffer = Buffer.from('fake-image-data');
    axios.get.mockResolvedValueOnce({ data: mockImageBuffer, headers: { 'content-type': 'image/jpeg' } });
    const mockGeminiResponse = { response: { text: () => 'Yes, the image clearly shows a forest fire.' } };
    const mockGenerateContent = jest.fn().mockResolvedValue(mockGeminiResponse);
    GoogleGenerativeAI.prototype.getGenerativeModel = jest.fn().mockReturnValue({ generateContent: mockGenerateContent });
    const imageUrl = 'http://example.com/wildfire.jpg';
    const response = await request(app).post(`/disasters/${disasterId}/verify-image`).send({ imageUrl });
    expect(response.status).toBe(200);
    expect(response.body.verified).toBe(true);
    const expectedPrompt = `This image is claimed to be related to a ${disasterData.type} disaster with the description: "${disasterData.description}". Does the image content visually support this claim? Please answer with only "Yes" or "No".`;
    expect(mockGenerateContent).toHaveBeenCalledWith([
      expectedPrompt,
      { inlineData: { data: mockImageBuffer.toString('base64'), mimeType: 'image/jpeg' } },
    ]);
  });

  it('should return 404 if disaster not found', async () => {
    supabase.from().select().eq().single.mockResolvedValueOnce({ data: null, error: 'Not found' });
    const response = await request(app).post('/disasters/999/verify-image').send({ imageUrl: 'http://example.com/any.jpg' });
    expect(response.status).toBe(404);
    expect(response.body.error).toBe('Disaster not found');
  });
});

// Note: Add to your package.json:
// "scripts": { "test": "jest" }
