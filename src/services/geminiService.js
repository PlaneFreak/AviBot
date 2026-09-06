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
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
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
  },

  /**
   * Analyzes a JetPhotos dashboard screenshot to verify account ownership (checks for private acceptance rate)
   * and extracts accepted photo count and photographer username.
   */
  async verifyJetPhotosDashboard(imageUrl, mimeType = 'image/jpeg') {
    const ai = getClient();
    if (!ai) {
      return { success: false, error: 'Gemini API is not configured.' };
    }

    try {
      console.log(`📸 [Gemini JetPhotos Verification] Analyzing dashboard screenshot: ${imageUrl.slice(0, 70)}...`);

      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
      });
      if (!response.ok) {
        return { success: false, error: `Failed to download image (HTTP ${response.status})` };
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');
      const detectedMime = (response.headers.get('content-type') || mimeType).split(';')[0];

      const prompt = `You are a strict JetPhotos verification analyzer for an aviation Discord bot.
Analyze this screenshot carefully to determine if it is an authentic personal logged-in JetPhotos photographer dashboard/upload queue.

Strict Verification Requirements:
1. Full Browser URL Bar: The entire browser address bar showing the complete JetPhotos URL (e.g. "https://www.jetphotos.com/..." or "jetphotos.com/...") MUST be clearly visible in the screenshot. If the URL / browser address bar is cropped, cut off, or missing, isOwnerDashboard MUST be false.
2. Private Acceptance Rate: The "Acceptance Ratio" or "Acceptance Rate" / "Acceptance %" (e.g. "85.2%", "78.4%") is a private metric that is ONLY visible to the logged-in photographer in their personal dashboard. If Acceptance Rate is NOT visible, isOwnerDashboard MUST be false.

Instructions:
1. Check if the full browser URL / address bar is visible (hasFullUrl: true/false).
2. Check if the Acceptance Rate is visible (hasAcceptanceRate: true/false).
3. If either hasFullUrl or hasAcceptanceRate is false, set isOwnerDashboard = false.
4. Extract the total number of Accepted Photos (photos accepted in database, e.g. 184, 45, 1250, etc.).
5. Extract the photographer username or name visible on the dashboard.
6. Extract the Acceptance Ratio value (e.g. "82.5%").
7. Extract the detected full URL string (e.g. "https://www.jetphotos.com/members/queue.php").

Respond strictly with a JSON object (no markdown code blocks, raw JSON only):
{
  "isOwnerDashboard": true or false,
  "hasFullUrl": true or false,
  "hasAcceptanceRate": true or false,
  "detectedUrl": "string or null",
  "acceptanceRate": "string percentage or null",
  "acceptedPhotos": integer or 0,
  "username": "string or null",
  "rejectionReason": "string explanation if rejected or null"
}`;

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
            let text = aiResponse.text.trim();
            // Clean any potential markdown code block formatting
            text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

            const parsed = JSON.parse(text);
            console.log(`✅ [Gemini JetPhotos Result (${modelName})]:`, parsed);

            return {
              success: true,
              isOwnerDashboard: !!parsed.isOwnerDashboard,
              hasFullUrl: !!parsed.hasFullUrl,
              hasAcceptanceRate: !!parsed.hasAcceptanceRate,
              detectedUrl: parsed.detectedUrl || null,
              acceptanceRate: parsed.acceptanceRate || null,
              acceptedPhotos: parseInt(parsed.acceptedPhotos, 10) || 0,
              username: parsed.username || null,
              rejectionReason: parsed.rejectionReason || null
            };
          }
        } catch (modelErr) {
          console.warn(`[Gemini JetPhotos Verification] Model ${modelName} failed: ${modelErr.message?.slice(0, 100)}`);
          continue;
        }
      }
    } catch (err) {
      console.error('Error during JetPhotos AI verification:', err);
      return { success: false, error: err.message };
    }

    return { success: false, error: 'AI analysis could not be completed.' };
  }
};
