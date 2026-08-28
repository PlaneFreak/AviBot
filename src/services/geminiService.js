const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

let aiClient = null;

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

const VISION_MODELS = [
  'gemini-flash-latest',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.5-flash'
];

module.exports = {
  /**
   * Identifies image subject and generates a witty, customized troll comment
   */
  async generateImageTrollComment(imageUrl, mimeType = 'image/jpeg') {
    const ai = getClient();
    if (!ai) {
      console.warn('⚠️ [Gemini AI] No GEMINI_API_KEY set in .env.');
      return null;
    }

    try {
      console.log(`🤖 [Gemini AI Vision] Downloading and analyzing image: ${imageUrl.slice(0, 70)}...`);

      // 1. Fetch image from Discord URL
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) {
        console.error(`Failed to fetch image for AI analysis (HTTP ${response.status})`);
        return null;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const detectedMime = (response.headers.get('content-type') || mimeType).split(';')[0];

      // 2. Strict prompt forcing the AI to mention exact visual details
      const prompt = `You are AviBot, a hilarious, razor-sharp comedy bot on an aviation Discord server.
Analyze this exact image carefully. Look at all specific visible details:
- If there is an aircraft: identify the exact airline/livery, plane type/model, landing/takeoff situation, weather, and camera framing.
- If it is NOT a plane (e.g. selfie, pet, food, room, gaming screenshot, meme, vehicle): describe specifically what object/person/animal/food is shown and make a funny comparison to aviation or plane spotting.

Instructions:
1. You MUST explicitly reference specific visual items, colors, objects, or actions actually visible in THIS photo so the user knows you analyzed their exact picture.
2. Deliver a side-splitting, hilarious 1-2 sentence comedic roast or witty observation.
3. Do NOT use formal prefixes like "Rejection Reason:" or "Observation:". Just write the natural funny comment directly!
4. Keep it punchy, funny, and include 1-2 relevant emojis. Language: English only.`;

      for (const modelName of VISION_MODELS) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: detectedMime
                }
              },
              prompt
            ]
          });

          if (aiResponse && aiResponse.text) {
            const comment = aiResponse.text.trim();
            console.log(`✅ [Gemini AI Output (${modelName})]: "${comment}"`);
            return comment;
          }
        } catch (modelErr) {
          console.warn(`[Gemini AI] Model ${modelName} failed: ${modelErr.message?.slice(0, 100)}`);
          continue; // Try next model in list
        }
      }
    } catch (err) {
      console.error('Gemini image analysis error:', err.message);
    }

    return null;
  },

  /**
   * Verifies if an image is related to aviation (aircraft, airports, spotting, cockpits, simulators)
   * Returns true if aviation, false if non-aviation.
   */
  async isAviationImage(imageUrl, mimeType = 'image/jpeg') {
    const ai = getClient();
    if (!ai) {
      // If no API key is configured, allow the image through as fallback
      return true;
    }

    try {
      console.log(`🔎 [Gemini Aviation Classifier] Verifying image content: ${imageUrl.slice(0, 70)}...`);

      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) return true;

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const detectedMime = (response.headers.get('content-type') || mimeType).split(';')[0];

      const prompt = `Analyze this image carefully.
Question: Is this image related to aviation, airplanes, helicopters, gliders, airliners, military jets, flight decks, cockpits, airports, runways, aviation navigation/instruments, plane spotting, air traffic control, or flight simulators?
Answer strictly with a single word: YES or NO.`;

      for (const modelName of VISION_MODELS) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: detectedMime
                }
              },
              prompt
            ]
          });

          if (aiResponse && aiResponse.text) {
            const answer = aiResponse.text.trim().toUpperCase();
            console.log(`✈️ [Gemini Aviation Decision (${modelName})]: "${answer}"`);
            return answer.includes('YES');
          }
        } catch (modelErr) {
          console.warn(`[Gemini Aviation Classifier] Model ${modelName} failed: ${modelErr.message?.slice(0, 100)}`);
          continue;
        }
      }
    } catch (err) {
      console.error('Error in Gemini Aviation Classifier:', err);
    }

    // Default to true on error so normal posts aren't blocked if API hiccups
    return true;
  }
};
