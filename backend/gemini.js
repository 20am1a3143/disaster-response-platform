// backend/utils/gemini.js
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function extractLocation(description) {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Returning mock location.");
    return 'Manhattan, NYC'; // Fallback mock
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = `Extract only the location name (e.g., "City, State" or "Neighborhood, City") from the following disaster description. If no specific location is mentioned, return "Unknown". Description: "${description}"`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const location = response.text().trim();
    return location;
  } catch (error) {
    console.error('Error with Gemini API:', error);
    // In case of API error, maybe return a default or re-throw
    throw new Error('Failed to extract location using Gemini API');
  }
}

async function verifyImage(imageUrl) {
  if (!GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not set. Returning mock image verification.");
    return {
      verified: true,
      reason: 'Mock verification: Cannot verify image without API key.'
    };
  }
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
    const prompt = "Analyze this image for signs of manipulation or to verify if it depicts a real disaster context. Provide a summary of your findings.";
    
    const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageMimeType = imageResponse.headers['content-type'];
    const imageBase64 = Buffer.from(imageResponse.data).toString('base64');

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: imageMimeType
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const summary = response.text();

    return {
      verified: !summary.toLowerCase().includes("manipulated"), // Simple check
      reason: summary
    };

  } catch (error) {
    console.error('Error with Gemini Vision API:', error);
    throw new Error('Failed to verify image using Gemini API');
  }
}

module.exports = { extractLocation, verifyImage };