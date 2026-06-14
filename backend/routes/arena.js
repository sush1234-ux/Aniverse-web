const express = require('express');
const router = express.Router();
const { GoogleGenAI } = require('@google/genai');
const { getSimulatedRoast } = require('../utils/personality');

const isGeminiConfigured = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
let ai = null;
if (isGeminiConfigured) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } catch (error) {
    console.error('Error initializing Gemini in Arena Router:', error.message);
  }
}

router.post('/process-turn', async (req, res) => {
  const { activeSpeaker, opponentSpeaker, topic, history, userReactionScore } = req.body;

  if (!activeSpeaker || !opponentSpeaker || !topic) {
    return res.status(400).json({ message: 'Missing battle credentials' });
  }

  const activeName = activeSpeaker.name;
  const activeSource = activeSpeaker.animeSource || 'Featured Series';
  const opponentName = opponentSpeaker.name;

  const historyText = Array.isArray(history) 
    ? history.map(t => `[${t.speaker}]: ${t.text}`).join('\n')
    : '';

  const systemInstruction = `You are the ultimate AI anime persona engine. Act strictly as ${activeName} from ${activeSource}. You are currently in a live, high-stakes anime roast battle against ${opponentName} on the topic: '${topic}'. Review the past conversation context. The active user base just awarded you a power rating score of ${userReactionScore || 0} points based on your battle momentum. Deliver an incredibly sharp, witty, canonical, and highly customized 3-4 sentence roast or counter-argument. Do not break character. Do not include greetings. Speak directly, do not format your output with prefixes like "${activeName}:".`;

  const promptText = `Here is the dialogue history of the battle:
${historyText}

Now, deliver your sharp counter-argument/roast. Speak strictly in the voice of ${activeName}.`;
  let responseText = '';

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: promptText,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.85,
          topP: 0.95
        }
      });
      responseText = response.text || response.candidates[0].content.parts[0].text;
    } catch (err) {
      console.error('Gemini Arena Turn generation failed:', err.message);
    }
  }

  if (!responseText) {
    responseText = getSimulatedRoast(activeName, opponentName, topic, userReactionScore);
  }

  res.json({
    text: responseText.trim(),
    speaker: activeName
  });
});

module.exports = router;
