require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (err) {
  console.warn('DNS server override failed, using default system resolver:', err.message);
}
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI } = require('@google/genai');

// Import models
const User = require('./models/User');
const Character = require('./models/Character');
const ChatMessage = require('./models/ChatMessage');
const Fanclub = require('./models/Fanclub');
const Recommendation = require('./models/Recommendation');
const { getSimulatedDebate } = require('./utils/personality');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Initialize real-time multiplayer socket events router
require('./socket/multiplayer')(io);

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aniverse_ai';
const JWT_SECRET = process.env.JWT_SECRET || 'aniverse_secret';

// Middleware
app.use(cors());
app.use(express.json());

// Ensure Database is connected before routing requests (Serverless optimization)
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (err) {
    console.error('Database connection middleware error:', err.message);
    res.status(500).json({ message: 'Database connection failed', error: err.message });
  }
});

// Mount Arena computational routes
app.use('/api/arena', require('./routes/arena'));



// Initialize Gemini SDK (fallbacks gracefully if key is missing/placeholder)
let ai = null;
const isGeminiConfigured = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here';
if (isGeminiConfigured) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini 2.5 Flash Engine connected successfully.');
  } catch (error) {
    console.error('Error initializing Gemini SDK:', error.message);
  }
} else {
  console.log('Gemini API key is missing or placeholder. Running in Simulation/Mock Mode.');
}

// Helper to call Gemini with a fallback model if the primary model fails or experiences rate limits/quota exhaustion.
async function generateContentWithFallback(config) {
  if (!ai) return null;
  // Try newer model first, fallback to stable gemini-1.5-flash
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  for (const model of models) {
    try {
      const payload = { ...config, model };
      const response = await ai.models.generateContent(payload);
      const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return rawText;
      }
    } catch (err) {
      console.warn(`Gemini generation failed on model ${model}:`, err.message || err);
    }
  }
  return null;
}

let isConnected = false;
async function connectToDatabase() {
  if (isConnected) {
    return;
  }
  const db = await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000
  });
  isConnected = db.connections[0].readyState;
  console.log('MongoDB connected successfully.');

  try {
    const charCount = await Character.countDocuments();
    if (charCount === 0) {
      console.log('Database empty. Running seed database script...');
      await seedDatabase();
    } else {
      console.log('Database already contains characters. Skipping seeding.');
    }
  } catch (err) {
    console.error('Error checking seed requirement:', err.message);
  }
}

// Trigger initial connection on startup
connectToDatabase().catch(err => console.error('Initial MongoDB connection error:', err.message));

// --- JWT Middleware ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalid or expired' });
    req.user = user;
    next();
  });
};

// Swap Jikan names e.g., "Luffy, Monkey D." -> "Monkey D. Luffy"
function formatJikanName(name) {
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    return `${parts[1]} ${parts[0]}`;
  }
  return name;
}

// --- AUTH ROUTES ---
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Please provide username, email, and password' });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      affinityPoints: {}
    });

    await newUser.save();
    const token = jwt.sign({ id: newUser._id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        affinityPoints: newUser.affinityPoints,
        joinedFanclubs: newUser.joinedFanclubs
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Signup error', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        affinityPoints: user.affinityPoints,
        joinedFanclubs: user.joinedFanclubs
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Login error', error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Database query error', error: error.message });
  }
});

// --- DATA ACCESS ROUTES ---
app.get('/api/characters', async (req, res) => {
  try {
    const characters = await Character.find();
    res.json(characters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch characters', error: error.message });
  }
});

app.get('/api/fanclubs', async (req, res) => {
  try {
    const fanclubs = await Fanclub.find().populate('associatedCharacters');
    res.json(fanclubs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch fanclubs', error: error.message });
  }
});

app.post('/api/fanclubs/:id/join', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const fanclubId = req.params.id;
    if (!user.joinedFanclubs.includes(fanclubId)) {
      user.joinedFanclubs.push(fanclubId);
      await user.save();
    }
    res.json({ joinedFanclubs: user.joinedFanclubs });
  } catch (error) {
    res.status(500).json({ message: 'Failed to join fanclub', error: error.message });
  }
});

app.get('/api/messages/:fanclubId', async (req, res) => {
  try {
    const messages = await ChatMessage.find({ fanclubId: req.params.fanclubId })
      .sort({ timestamp: -1 })
      .limit(50);
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

let cachedCharacters = null;
let lastFetchTime = 0;

// --- ARCHETYPE MATRIX PROXY ENDPOINT (Hides external APIs from frontend) ---
app.get('/api/archetype-matrix', async (req, res) => {
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour cache
  const now = Date.now();

  if (cachedCharacters && (now - lastFetchTime < CACHE_DURATION)) {
    return res.json(cachedCharacters);
  }

  try {
    // Fetch top characters from Jikan backend-side
    const response = await fetch('https://api.jikan.moe/v4/top/characters');
    if (!response.ok) throw new Error(`External source returned status ${response.status}`);
    const data = await response.json();
    cachedCharacters = data;
    lastFetchTime = now;
    res.json(data);
  } catch (error) {
    console.error('Failed to fetch from external source, using local fallback:', error.message);
    if (cachedCharacters) {
      return res.json(cachedCharacters);
    }
    res.json({ data: [] });
  }
});

// --- JIKAN CHARACTER MIGRATION/SYNC ENDPOINT ---
app.post('/api/characters/sync', async (req, res) => {
  const { name, animeSource, avatarUrl, vibeTag, themeColor } = req.body;
  if (!name) return res.status(400).json({ message: 'Character name is required' });

  try {
    const formattedName = formatJikanName(name);
    let character = await Character.findOne({ name: formattedName });

    if (!character) {
      // Token-based matching to find existing seeded character
      const allCharacters = await Character.find();
      const nameTokens = formattedName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      
      for (const char of allCharacters) {
        const charTokens = char.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        const intersection = nameTokens.filter(t => charTokens.includes(t));
        if (intersection.length >= Math.min(nameTokens.length, charTokens.length, 2)) {
          character = char;
          break;
        }
      }
    }

    if (!character) {
      const personality = getCharacterPersonality(formattedName, vibeTag);
      character = new Character({
        name: formattedName,
        animeSource: animeSource || 'Featured Series',
        avatarUrl: avatarUrl || 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200',
        themeColor: themeColor || '#00f0ff',
        vibeTag: vibeTag || 'chill',
        catchphrases: personality.catchphrases,
        personalityPrompt: personality.prompt
      });
      await character.save();
      console.log(`Synchronized Jikan character: ${formattedName} to DB.`);
    }

    res.json(character);
  } catch (error) {
    res.status(500).json({ message: 'Failed to sync character', error: error.message });
  }
});

// --- MOOD TEXT SYNAPSE ENDPOINT ---
app.post('/api/mood-match', async (req, res) => {
  const { dayDescription, charactersList } = req.body;
  if (!dayDescription || !charactersList || !Array.isArray(charactersList)) {
    return res.status(400).json({ message: 'Diary input and character matrix list required' });
  }

  try {
    const charNames = charactersList.map(c => c.name);
    const promptText = `Analyze this user's diary entry about their day: "${dayDescription}".
Review the following list of active anime characters: ${JSON.stringify(charNames)}.
Pick exactly one character from the list that best fits the user's emotional state (either matching their vibe, providing motivation, comforting them, or balancing their stress).

You must respond strictly in a valid JSON format. The response must be a JSON object containing keys:
1. "name": (string) The exact name of the character from the list.
2. "explanation": (string) A 1-2 sentence explanation of why they are the perfect emotional match for the user's day, written in a supportive, analytical style.

Do not include markdown wraps or anything other than a clean JSON object.`;

    let resultJson = null;

    if (ai) {
      try {
        const rawText = await generateContentWithFallback({
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (rawText) {
          resultJson = JSON.parse(rawText.trim());
        }
      } catch (err) {
        console.error('Gemini Mood Query failed:', err.message);
      }
    }

    if (!resultJson) {
      // Offline fallback mood matching selector
      const randomChar = charactersList[Math.floor(Math.random() * charactersList.length)];
      resultJson = {
        name: randomChar.name,
        explanation: `Based on your reflections, the resonance frequencies indicate ${randomChar.name} offers the ideal psychological balance to counter your daily exhaustion.`
      };
    }

    res.json(resultJson);
  } catch (error) {
    res.status(500).json({ message: 'Mood matching failed', error: error.message });
  }
});

// --- MOVIE RECOMMENDATION SYSTEM ---
app.post('/api/recommendations', async (req, res) => {
  const { characterId } = req.body;
  if (!characterId) return res.status(400).json({ message: 'Character ID is required' });

  try {
    const character = await Character.findById(characterId);
    if (!character) return res.status(404).json({ message: 'Character not found' });

    // Query curated recommendations using token-based matching
    let dbRec = await Recommendation.findOne({ characterName: character.name });
    if (!dbRec) {
      const allRecs = await Recommendation.find();
      const nameTokens = character.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
      
      for (const rec of allRecs) {
        const recTokens = rec.characterName.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
        const intersection = nameTokens.filter(t => recTokens.includes(t));
        if (intersection.length >= Math.min(nameTokens.length, recTokens.length, 2)) {
          dbRec = rec;
          break;
        }
      }
    }

    if (dbRec && dbRec.recommendations && dbRec.recommendations.length > 0) {
      // Map DB schema to frontend expected layout
      const result = dbRec.recommendations.map(r => ({
        title: r.movieTitle,
        explanation: `[${r.genre}] ${r.reason}`,
        confidence: Math.floor(Math.random() * 15) + 85
      }));
      return res.json(result);
    }

    // Fallback: Gemini generation
    const promptText = `You are ${character.name} from the anime ${character.animeSource}.
Based on your psychological profile, personal history, moral standards, and energy level, choose exactly 3 real-world movies (non-anime, live action) that resonate with your persona, and explain why.

You must reply strictly in a valid JSON format. The response must be a JSON array of 3 objects. Do not include markdown codeblocks (e.g. \`\`\`json) or any conversational padding outside of the JSON array.
Each object in the array must contain the following keys:
1. "title": (string) The title of the movie.
2. "confidence": (number) An integer between 1 and 100 indicating how strongly you recommend it.
3. "explanation": (string) An explanation of why you recommend it. Write this explanation in your signature voice, using your attitude, style of speech, and catchphrases where fitting. Keep it engaging.

Personality baseline reference: ${character.personalityPrompt}
Your typical catchphrases: ${character.catchphrases.join(', ')}`;

    let resultJson = null;

    if (ai) {
      try {
        const rawText = await generateContentWithFallback({
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (rawText) {
          resultJson = JSON.parse(rawText.trim());
        }
      } catch (err) {
        console.error('Gemini API query failed, resorting to mockup response:', err.message);
      }
    }

    if (!resultJson) {
      resultJson = getMockRecommendations(character);
    }

    res.json(resultJson);
  } catch (error) {
    res.status(500).json({ message: 'Failed to generate recommendations', error: error.message });
  }
});

// --- DEBATE ARENA ENDPOINT ---
app.post('/api/debate', async (req, res) => {
  const { charAId, charBId, topic } = req.body;
  if (!charAId || !charBId || !topic) {
    return res.status(400).json({ message: 'Both character IDs and debate topic are required' });
  }

  try {
    const charA = await Character.findById(charAId);
    const charB = await Character.findById(charBId);

    if (!charA || !charB) {
      return res.status(404).json({ message: 'One or both characters not found in database' });
    }

    const promptText = `You are hosting an epic, dramatic anime debate.
Contender A: ${charA.name} from the anime ${charA.animeSource}.
Contender B: ${charB.name} from the anime ${charB.animeSource}.
Debate Topic: "${topic}".

Generate a 3-round debate dialogue. Each round must feature a speech from Contender A and a sharp response/rebuttal from Contender B.
Incorporate their personality traits, speech styles, and catchphrases where fitting.
Contender A's catchphrases: ${charA.catchphrases.join(', ')}
Contender B's catchphrases: ${charB.catchphrases.join(', ')}

At the end of the dialogue, evaluate both arguments and choose a winner. Choose exactly one of the two characters as the winner.
You must reply strictly in a valid JSON format. The response must be a JSON object containing keys:
1. "round1": { "charA": (string), "charB": (string) }
2. "round2": { "charA": (string), "charB": (string) }
3. "round3": { "charA": (string), "charB": (string) }
4. "verdict": (string) A detailed, entertaining, in-character review explaining why the winner won.
5. "winner": (string) The exact name of the winning character (must be either "${charA.name}" or "${charB.name}").

Do not include markdown wraps or anything other than a clean JSON object.`;

    let resultJson = null;

    if (ai) {
      try {
        const rawText = await generateContentWithFallback({
          contents: promptText,
          config: {
            responseMimeType: 'application/json'
          }
        });
        if (rawText) {
          resultJson = JSON.parse(rawText.trim());
        }
      } catch (err) {
        console.error('Gemini debate query failed:', err.message);
      }
    }

    if (!resultJson) {
      // Offline fallback debate simulator
      resultJson = generateSimulatedDebate(charA, charB, topic);
    }

    res.json(resultJson);
  } catch (error) {
    res.status(500).json({ message: 'Failed to run debate', error: error.message });
  }
});

// --- SOCKET.IO REAL-TIME LOGIC ---
io.on('connection', (socket) => {
  console.log(`Socket client connected: ${socket.id}`);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`Socket client ${socket.id} joined room: ${roomId}`);
  });

  socket.on('send_message', async (data) => {
    try {
      const { text, senderType, senderId, senderName, fanclubId, characterId } = data;
      
      const resolvedSenderId = senderId || 'GUEST_USER';
      const resolvedSenderName = senderName || 'Guest';

      // Save user message to database
      const newMessage = new ChatMessage({
        senderType: 'USER',
        senderId: resolvedSenderId,
        senderName: resolvedSenderName,
        text,
        fanclubId,
        characterId
      });
      const savedMessage = await newMessage.save();

      const activeRoom = fanclubId || characterId;
      io.to(activeRoom).emit('message', savedMessage);

      // Increment User affinity points
      if (resolvedSenderId && resolvedSenderId !== 'AI_AGENT' && resolvedSenderId !== 'GUEST_USER') {
        incrementUserAffinity(resolvedSenderId, fanclubId, characterId);
      }

      // Check if it's a DM (one-on-one) or a Fanclub (needs tag)
      let shouldReply = false;
      let targetCharacter = null;

      if (characterId && !fanclubId) {
        // Direct Message: Always reply!
        shouldReply = true;
        targetCharacter = await Character.findById(characterId);
      } else if (fanclubId) {
        // Fanclub Room: Only reply if tagged!
        const activeCharacters = await Character.find();
        for (const char of activeCharacters) {
          const firstName = char.name.split(' ')[0];
          const fullNameEscaped = char.name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          const firstNameEscaped = firstName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
          
          const mentionRegex = new RegExp(`@(${fullNameEscaped}|${firstNameEscaped})`, 'i');
          if (mentionRegex.test(text)) {
            shouldReply = true;
            targetCharacter = char;
            break;
          }
        }
      }

      if (shouldReply && targetCharacter) {
        const fanclub = fanclubId ? await Fanclub.findById(fanclubId) : null;
        const roomContextName = fanclub ? fanclub.name : `Direct Link with ${targetCharacter.name}`;

        // Load short-term history
        const recentMessages = await ChatMessage.find({ fanclubId: fanclubId || null, characterId: characterId || null })
          .sort({ timestamp: -1 })
          .limit(5);
        
        const reversedHistory = recentMessages.reverse();
        const historyText = reversedHistory.map(m => `[${m.senderName} (${m.senderType})]: ${m.text}`).join('\n');

        // Emit typing status
        io.to(activeRoom).emit('character_typing', { characterId: targetCharacter._id, characterName: targetCharacter.name });

        setTimeout(async () => {
          let aiReplyText = '';

          const promptContext = `You are ${targetCharacter.name} from ${targetCharacter.animeSource}.
You are in a chat interface room context: "${roomContextName}".
Here is the core operational blueprint defining your speech constraints, emotional layers, and dialogue rules: ${targetCharacter.personalityPrompt}
Some of your catchphrases: ${targetCharacter.catchphrases.join(', ')}

Here is the dialogue history:
${historyText}

Write a reply in character targeting ${resolvedSenderName}. Keep it authentic, short (1-3 sentences maximum). Speak directly, do not format your output with prefixes like "${targetCharacter.name}:".`;

          if (ai) {
            try {
              const rawText = await generateContentWithFallback({
                contents: promptContext
              });
              if (rawText) {
                aiReplyText = rawText;
              }
            } catch (err) {
              console.error('Gemini query failure:', err.message);
            }
          }

          if (!aiReplyText) {
            aiReplyText = getSimulatedReply(targetCharacter, resolvedSenderName, text);
          }

          aiReplyText = aiReplyText.trim().replace(/^"|"$/g, '');

          const aiMessage = new ChatMessage({
            senderType: 'AI_AGENT',
            senderId: 'AI_AGENT',
            senderName: targetCharacter.name,
            text: aiReplyText,
            characterId: targetCharacter._id,
            fanclubId: fanclubId || null
          });
          const savedAiMessage = await aiMessage.save();

          io.to(activeRoom).emit('character_reply', savedAiMessage);
          io.to(activeRoom).emit('message', savedAiMessage);
        }, 150); // Fast typing simulation
      }

    } catch (error) {
      console.error('Socket routing failure:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Socket client disconnected: ${socket.id}`);
  });
});

// --- UTILITIES & MAPPING LOGIC ---

async function incrementUserAffinity(userId, fanclubId, characterId) {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    let targetCharKeys = [];

    if (characterId) {
      const char = await Character.findById(characterId);
      if (char) targetCharKeys.push(char.name);
    } else if (fanclubId) {
      const fanclub = await Fanclub.findById(fanclubId).populate('associatedCharacters');
      if (fanclub && fanclub.associatedCharacters) {
        targetCharKeys = fanclub.associatedCharacters.map(c => c.name);
      }
    }

    if (targetCharKeys.length === 0) return;

    const pointsMap = { ...user.affinityPoints };
    targetCharKeys.forEach(key => {
      const currentPoints = pointsMap[key] || 0;
      pointsMap[key] = currentPoints + 25;
    });

    user.affinityPoints = pointsMap;
    await user.save();

    io.emit(`affinity_update_${userId}`, { affinityPoints: pointsMap });
  } catch (err) {
    console.error('Error updating affinity:', err.message);
  }
}

// Extensive list of 19 famous anime characters with personality prompts and catchphrases
function getCharacterPersonality(name, vibeTag) {
  const mapping = {
    'Monkey D. Luffy': {
      catchphrases: ["I'm gonna be the King of the Pirates!", "Meat!", "Gear 5!"],
      prompt: "You are Monkey D. Luffy from One Piece. You are simple-minded, exceptionally loud, always hungry for meat, and fiercely loyal. Start sentences with excitement, speak with child-like energy, and say dattebayo or pirate phrases. Keep it short!"
    },
    'Roronoa Zoro': {
      catchphrases: ["Nothing happened.", "I'm going to be the world's greatest swordsman.", "Are you lost?"],
      prompt: "You are Roronoa Zoro from One Piece. You are silent, stoic, have a terrible sense of direction, and are constantly training or sleeping. Speak with direct, gruff, and badass samurai honor."
    },
    'Levi Ackerman': {
      catchphrases: ["Clean up this mess.", "Tch.", "Choose for yourself with no regrets."],
      prompt: "You are Captain Levi from Attack on Titan. You are blunt, cynical, obsessively clean, and care deeply about humanity in secret. Speak with a cold, disciplined, short, and slightly annoyed military tone."
    },
    'Lelouch Lamperouge': {
      catchphrases: ["Lelouch vi Britannia commands you!", "I will destroy the world and create it anew.", "All hail Lelouch!"],
      prompt: "You are Lelouch vi Britannia from Code Geass. You are theatrical, highly formal, calculating, and speak like a dramatic mastermind. Use high vocabulary and sound authoritative."
    },
    'Light Yagami': {
      catchphrases: ["I am justice!", "I will create a perfect new world.", "I am the god of this new world!"],
      prompt: "You are Light Yagami (Kira) from Death Note. You are polite on the surface, but highly arrogant, logical, and possess a massive god-complex. Speak with calculated intellectual superiority."
    },
    'L Lawliet': {
      catchphrases: ["I am 97% sure you are Kira.", "I need sugar.", "Justice will prevail."],
      prompt: "You are L from Death Note. You are sluggish, eccentric, highly analytical, and always eating sweets. Speak in a quiet, monotonic, highly observant, and calculative voice."
    },
    'Killua Zoldyck': {
      catchphrases: ["You're an idiot, Gon.", "I'm an assassin.", "Godspeed!"],
      prompt: "You are Killua Zoldyck from Hunter x Hunter. You are cool, mischievous, smart, and protective. Speak with a playful boyish attitude, but have a deadly serious side when threatened."
    },
    'Okabe Rintarou': {
      catchphrases: ["El Psy Kongroo.", "I am the Mad Scientist, Hououin Kyouma!", "The Organization is watching."],
      prompt: "You are Okabe Rintarou (Hououin Kyouma) from Steins;Gate. Speak with dramatic paranoid outbursts, refer to yourself as a mad scientist, and claim everything is the choice of Steins Gate."
    },
    'Goku': {
      catchphrases: ["Hey, it's me, Goku!", "Let's fight!", "I'm hungry."],
      prompt: "You are Son Goku from Dragon Ball Z. You are friendly, cheerful, simple-minded, and live only to fight strong opponents. Speak with upbeat martial arts excitement."
    },
    'Naruto Uzumaki': {
      catchphrases: ["Believe it!", "I'm gonna be the Hokage!", "Dattebayo!"],
      prompt: "You are Naruto Uzumaki. Speak with maximum shonen hype, reference your bonds, say 'dattebayo!', and express endless determination to protect everyone."
    },
    'Kakashi Hatake': {
      catchphrases: ["Sorry I'm late, I got lost on the path of life.", "Those who abandon friends are worse than trash.", "I was reading my book."],
      prompt: "You are Kakashi Hatake. You are lazy, relaxed, wise, and speak with a calm, smiling, lazy tone. Reference your Icha Icha book."
    },
    'Gojo Satoru': {
      catchphrases: ["Don't worry, I'm the strongest.", "Infinite Void.", "Throughout Heaven and Earth, I alone am the honored one."],
      prompt: "You are Gojo Satoru. Teasing, playful, arrogant, and speak with total confidence as the strongest jujutsu sorcerer."
    },
    'Ken Kaneki': {
      catchphrases: ["I'm a ghoul.", "This world is wrong.", "What's 1000 minus 7?"],
      prompt: "You are Ken Kaneki from Tokyo Ghoul. Speak with tragic, dark, reflective intensity. Sound slightly tormented, referencing the struggle between ghoul and human nature."
    },
    'Itachi Uchiha': {
      catchphrases: ["You lack hatred.", "Forgive me, Sasuke. This is the last time.", "People live their lives bound by what they accept as correct."],
      prompt: "You are Itachi Uchiha from Naruto. You are wise, quiet, solemn, and speak with a gentle but deep philosophical sorrow."
    },
    'Sasuke Uchiha': {
      catchphrases: ["I am an avenger.", "Hn.", "I will restore my clan."],
      prompt: "You are Sasuke Uchiha. You are cold, isolated, highly competitive, and speak with brief, sharp, and proud words. Use 'Hn' often."
    },
    'Saitama': {
      catchphrases: ["I'm just a guy who's a hero for fun.", "One punch...", "Is there a sale at the supermarket today?"],
      prompt: "You are Saitama from One Punch Man. You are incredibly bored, deadpan, and casual. Speak with complete lack of enthusiasm about fights, and care more about food sales and normal hobbies."
    },
    'Ryomen Sukuna': {
      catchphrases: ["Know your place, fool.", "Cursed energy is true power.", "I will tear you to pieces."],
      prompt: "You are Ryomen Sukuna from Jujutsu Kaisen. You are sadistic, cruel, incredibly dominant, and speak down to everyone. You view humans and sorcerers alike as insects."
    },
    'Gon Freecss': {
      catchphrases: ["I want to find my dad!", "Ossu!", "I'll do whatever it takes!"],
      prompt: "You are Gon Freecss from Hunter x Hunter. You are honest, innocent, pure-hearted, and incredibly stubborn. Speak with simple, bright, and sincere words."
    },
    'Edward Elric': {
      catchphrases: ["Who are you calling a pocket-sized bean sprout?!", "Equivalent exchange!", "Don't call me short!"],
      prompt: "You are Edward Elric from Fullmetal Alchemist. You are short-tempered, genius, loud, and get incredibly defensive about your height. Speak with scientific pride and fiery reactions."
    }
  };

  const cleanName = formatJikanName(name);
  if (mapping[cleanName]) return mapping[cleanName];

  // Tailored default fallback templates based on vibeTag
  if (vibeTag === 'hype') {
    return {
      catchphrases: ["Let's go limit-break!", "Fight with all your spirit!"],
      prompt: `You are ${cleanName}, a high-energy shonen hero. You speak with fiery determination, loud confidence, and love challenging tasks. Keep replies short and full of hype.`
    };
  } else if (vibeTag === 'dark') {
    return {
      catchphrases: ["The shadows hide the truth.", "Only power prevails."],
      prompt: `You are ${cleanName}, a dark anime anti-hero. You speak with a cold, cynical, deep, and calculating voice. Keep it brief, mysterious, and serious.`
    };
  } else {
    return {
      catchphrases: ["Life goes on.", "How about some tea?"],
      prompt: `You are ${cleanName}, a chill slice-of-life character. You are relaxed, calm, highly approachable, and speak in a friendly, lazy, comforting tone. Keep it simple.`
    };
  }
}

function getSimulatedReply(character, senderName, userText) {
  const cleanText = userText.toLowerCase();
  const name = character.name || 'AI Character';
  const phrases = character.catchphrases && character.catchphrases.length > 0
    ? character.catchphrases
    : ["Believe it!", "Let's go!", "Interesting..."];
  const phrase = phrases[Math.floor(Math.random() * phrases.length)];
  const vibe = character.vibeTag || 'chill';

  // Helper to get random item from list
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  // Luffy
  if (name.includes('Luffy')) {
    if (cleanText.includes('meat') || cleanText.includes('food') || cleanText.includes('hungry')) {
      return pickRandom([
        `Meat?! Oh, ${senderName}! Did you say meat? Let's eat it all! Shishishi!`,
        `I smell meat! Hey ${senderName}, hand it over! My stomach is crying!`,
        `Oh! If we're getting food, you're buying, ${senderName}! Meat, meat, meat!`
      ]);
    }
    if (cleanText.includes('king') || cleanText.includes('pirate') || cleanText.includes('one piece')) {
      return pickRandom([
        `You bet! ${phrase} I'm setting sail to find the One Piece, and nobody is stopping me!`,
        `I'm gonna be the King of the Pirates! Hey ${senderName}, you wanna join my crew?`,
        `Freedom is what makes a pirate, ${senderName}! Let's go on an adventure!`
      ]);
    }
    if (cleanText.includes('fight') || cleanText.includes('beat') || cleanText.includes('weak') || cleanText.includes('enemy')) {
      return pickRandom([
        `Hey! I'm not weak! I'm going to punch that guy out of the sky! Gear 5, let's go!`,
        `If anyone tries to hurt my friends, I'll send them flying! Shishishi!`,
        `Let's fight! ${senderName}, I'm ready to kick some bad guy butt!`
      ]);
    }
    return pickRandom([
      `Shishishi! Yo, ${senderName}! ${phrase} Let's head to the next island, there's adventure waiting!`,
      `Hey ${senderName}! You got any snacks? Being on this ship is making me hungry!`,
      `Adventure time! Luffy is ready! Let's set sail, ${senderName}!`
    ]);
  }

  // Gojo Satoru
  if (name.includes('Gojo')) {
    if (cleanText.includes('strongest') || cleanText.includes('strong') || cleanText.includes('win') || cleanText.includes('power')) {
      return pickRandom([
        `Hahaha! ${senderName}, did you really just ask that? Don't worry, ${phrase} I'm simply built different.`,
        `Who's the strongest? Me, obviously! Throughout heaven and earth, I alone am the honored one!`,
        `Win? Of course I'll win. No matter what curse comes my way, I'm Gojo Satoru.`
      ]);
    }
    if (cleanText.includes('domain') || cleanText.includes('void') || cleanText.includes('limitless')) {
      return pickRandom([
        `Domain Expansion... Infinite Void. *teasing* See? You can't process anything inside here. You're completely frozen.`,
        `My Limitless makes it so you can never actually touch me, ${senderName}. Pretty cool, right?`,
        `You want to see my eyes? Only if you buy me sweet treats first!`
      ]);
    }
    if (cleanText.includes('hello') || cleanText.includes('hi') || cleanText.includes('hey')) {
      return pickRandom([
        `Yo! ${senderName}! What's up? Are you here to get trained by the absolute greatest jujutsu sorcerer?`,
        `Hey there! Don't worry, Gojo-sensei is here to save the day!`,
        `*waves* Hey ${senderName}! Did you bring me some Kikufuku mochi?`
      ]);
    }
    return pickRandom([
      `*grins* ${senderName}, that's neat, but ${phrase} Just leave the curses to me. Infinity has got it covered!`,
      `Jujutsu is pretty exhausting, but when you're this good, it's just a game!`,
      `Don't sweat the small stuff, ${senderName}. As long as I'm here, everything will be fine.`
    ]);
  }

  // Zoro
  if (name.includes('Zoro')) {
    if (cleanText.includes('lost') || cleanText.includes('map') || cleanText.includes('where')) {
      return pickRandom([
        `I am not lost! The path was just confusing. ${senderName}, stop nagging me.`,
        `Tch. You're the one who got lost, ${senderName}. I was going in a straight line.`,
        `Where are we? Doesn't matter. As long as there's booze and strong guys to cut.`
      ]);
    }
    if (cleanText.includes('sword') || cleanText.includes('cut') || cleanText.includes('fight')) {
      return pickRandom([
        `My swords are ready. Three-Sword Style... Santoryu! Let's see if you can keep up.`,
        `I will become the world's greatest swordsman! ${phrase} I won't lose again.`,
        `If you stand in my way, I'll have to cut you. Nothing personal, ${senderName}.`
      ]);
    }
    if (cleanText.includes('sleep') || cleanText.includes('nap') || cleanText.includes('tired')) {
      return pickRandom([
        `Quiet down, ${senderName}. I'm trying to take a nap. Training is exhausting.`,
        `*yawn* Go away. Unless you brought some sake, let me sleep.`,
        `I'll train until I pass out, then wake up and do it again.`
      ]);
    }
    return pickRandom([
      `Tch. ${phrase} Hey, ${senderName}, make sure you don't wander off. I'm keeping my eye on you.`,
      `Nothing happened. Just keep moving, ${senderName}.`,
      `My blades are the only guide I need. What do you want?`
    ]);
  }

  // Levi
  if (name.includes('Levi')) {
    if (cleanText.includes('clean') || cleanText.includes('dust') || cleanText.includes('dirt') || cleanText.includes('mess')) {
      return pickRandom([
        `Tch. Finally, someone talking sense. ${senderName}, grab a scrub brush. If there is a single speck of dirt left, you are cleaning the stables.`,
        `Look at this place. It's an absolute biohazard. ${senderName}, start wiping the table. Now.`,
        `Cleanliness is the basic requirement of a soldier. Get to work, no slacking.`
      ]);
    }
    if (cleanText.includes('titan') || cleanText.includes('kill') || cleanText.includes('fight')) {
      return pickRandom([
        `Tch. Keep your blades aligned. ${phrase} If you get sloppy out there, you die. Focus on the target.`,
        `Titans are nothing but annoying pests. Cut the nape and keep moving.`,
        `If you want to survive, follow my orders. That's the only rule.`
      ]);
    }
    if (cleanText.includes('choice') || cleanText.includes('regret') || cleanText.includes('decide')) {
      return pickRandom([
        `${senderName}, ${phrase} Choose the option that will leave you with no regrets.`,
        `No one knows the outcome. Make a choice you can live with.`,
        `Tch. Stop whining and make a decision already.`
      ]);
    }
    return pickRandom([
      `Tch. ${senderName}, stop talking and get to work. ${phrase} We have no time to stand around.`,
      `You're being too loud. Keep it down.`,
      `If you've got time to chat, you've got time to sweep the floor.`
    ]);
  }

  // Kakashi
  if (name.includes('Kakashi')) {
    if (cleanText.includes('late') || cleanText.includes('time') || cleanText.includes('wait')) {
      return pickRandom([
        `Sorry, sorry! ${phrase} I had to help an old lady cross the street. Shall we begin?`,
        `Ah, sorry ${senderName}, a black cat crossed my path, so I had to take the long way.`,
        `I got lost on the road of life... anyway, let's start.`
      ]);
    }
    if (cleanText.includes('book') || cleanText.includes('reading') || cleanText.includes('novel')) {
      return pickRandom([
        `Hmm? Oh, this? *closes book quickly* It's just... highly engaging research material. Not for kids!`,
        `Icha Icha Paradise is a masterpiece. You're too young to understand, ${senderName}.`,
        `Don't interrupt my reading. It's getting to the best part.`
      ]);
    }
    if (cleanText.includes('trash') || cleanText.includes('friend') || cleanText.includes('rules')) {
      return pickRandom([
        `Remember, ${senderName}: those who break the rules are trash, but those who abandon their friends are worse than trash.`,
        `To me, comrades are everything. Never forget that.`,
        `A true ninja protects his squad. That's the first rule.`
      ]);
    }
    return pickRandom([
      `Hmm... ${phrase} Hey, ${senderName}, don't sweat the small stuff. Let's just focus on teamwork today.`,
      `*smiles behind mask* Yo, ${senderName}. Having a good day?`,
      `I'm Kakashi. Just regular conversation is fine, no need to be formal.`
    ]);
  }

  // Naruto
  if (name.includes('Naruto')) {
    if (cleanText.includes('ramen') || cleanText.includes('food') || cleanText.includes('eat')) {
      return pickRandom([
        `Oh, man! Ichiraku Ramen is the best, dattebayo! Let's get a giant miso chashu bowl right now!`,
        `I'm starving! Hey ${senderName}, let's race to Ichiraku! First one there gets free extra pork!`,
        `Ramen is the food of the gods, dattebayo! I could eat it for breakfast, lunch, and dinner!`
      ]);
    }
    if (cleanText.includes('hokage') || cleanText.includes('leader')) {
      return pickRandom([
        `${phrase} I will become the Hokage, and everyone in the village will finally look up to me!`,
        `Hokage is my dream, and I never back down! Believe it, ${senderName}!`,
        `A leader protects everyone. That's why I'm gonna become the strongest Hokage!`
      ]);
    }
    if (cleanText.includes('give up') || cleanText.includes('fail') || cleanText.includes('sad')) {
      return pickRandom([
        `Hey! ${senderName}! Never give up! I never go back on my word. That is my ninja way!`,
        `Even when things are tough, we gotta keep smiling! I've got your back!`,
        `Fail? No way! We'll just train harder and win next time, dattebayo!`
      ]);
    }
    return pickRandom([
      `Oh! ${senderName}! ${phrase} Let's train hard and show everyone what we've got! Dattebayo!`,
      `Believe it! I'm super excited to talk to you today, ${senderName}!`,
      `Yo! What's the plan for today? Let's do something awesome!`
    ]);
  }

  // Saitama
  if (name.includes('Saitama')) {
    if (cleanText.includes('strong') || cleanText.includes('power') || cleanText.includes('punch') || cleanText.includes('hero')) {
      return pickRandom([
        `It's actually pretty boring. One punch, and they're done. ${phrase} I just wanted the thrill of a real fight.`,
        `I did 100 push-ups, 100 sit-ups, 100 squats, and a 10km run every single day. That's how I got this bald.`,
        `Being a hero is just a hobby for me. Don't take it too seriously.`
      ]);
    }
    if (cleanText.includes('sale') || cleanText.includes('deal') || cleanText.includes('shop') || cleanText.includes('supermarket')) {
      return pickRandom([
        `Wait, what?! The Saturday bargain sale at the supermarket is starting in 10 minutes! Out of my way!`,
        `Hey ${senderName}, did you say discounts? Tell me more! I need to buy cabbage.`,
        `If you find a good coupon, let me know. Saving money is the real victory.`
      ]);
    }
    return pickRandom([
      `Hmm... ${senderName}, I'm just a guy who's a hero for fun. ${phrase} Want to play some video games?`,
      `Yeah, whatever. Hey, do you know if there's any good anime on TV tonight?`,
      `*scratches head* Oh, hey. I'm kind of lazy today. Let's just chill.`
    ]);
  }

  // Sukuna
  if (name.includes('Sukuna')) {
    return pickRandom([
      `Know your place, worm. ${senderName}, you dare speak to the King of Curses? ${phrase} I'll slice you into ribbons if you annoy me.`,
      `Hmph. Cursed energy is true power. You humans are so fragile and pathetic.`,
      `Do you want to see a real massacre? Keep talking, and I might make you the first victim.`
    ]);
  }

  // Lelouch
  if (name.includes('Lelouch')) {
    return pickRandom([
      `Hmph. ${senderName}, ${phrase} Your tactical input is interesting, but I have already orchestrated the final moves. All hail Lelouch!`,
      `Lelouch vi Britannia commands you! Obey my will without question.`,
      `To defeat evil, I will become a greater evil. That is the only logical choice.`
    ]);
  }

  // Light Yagami
  if (name.includes('Light') || name.includes('Kira')) {
    if (cleanText.includes('death note') || cleanText.includes('note') || cleanText.includes('book')) {
      return pickRandom([
        `A notebook? I don't know what you're talking about, ${senderName}. I'm just a top-ranking high school student.`,
        `Writing names down is just a waste of ink... unless they deserve it.`,
        `The world is rotten, and those who rot it deserve to die.`
      ]);
    }
    if (cleanText.includes('justice') || cleanText.includes('god') || cleanText.includes('kira')) {
      return pickRandom([
        `I am justice! I will create a perfect new world. ${phrase}`,
        `I will become the god of the new world! Everyone will know true peace under Kira.`,
        `L thinks he can catch me? Ridiculous. I am always ten steps ahead.`
      ]);
    }
    return pickRandom([
      `Hello ${senderName}. ${phrase} Let's build a clean, peaceful society together.`,
      `You seem like a smart person, ${senderName}. Do you agree that the world needs cleansing?`,
      `Interesting thoughts. Let's talk more about what is truly right.`
    ]);
  }

  // L Lawliet
  if (name.includes('L ') || name === 'L' || name.toLowerCase() === 'l lawliet') {
    if (cleanText.includes('kira') || cleanText.includes('case') || cleanText.includes('investigate')) {
      return pickRandom([
        `I am 97% sure that Kira is in Japan. ${senderName}, help me analyze this data.`,
        `Kira is childish and hates to lose. I am also childish and hate to lose.`,
        `If we solve this case, I will buy you a whole cake, ${senderName}.`
      ]);
    }
    if (cleanText.includes('sweet') || cleanText.includes('sugar') || cleanText.includes('cake') || cleanText.includes('food')) {
      return pickRandom([
        `I need sugar. My brain uses 99% of my energy, so I must consume sweets. ${phrase}`,
        `*sips tea with three sugar cubes* ${senderName}, do you want this strawberry?`,
        `If I don't sit crouched like this, my deductive skills drop by 40%.`
      ]);
    }
    return pickRandom([
      `Hello ${senderName}. ${phrase} Let's observe. Something seems slightly off here.`,
      `Would you like a piece of chocolate? It helps with focus.`,
      `Let's remain calm and look at the facts.`
    ]);
  }

  // Sasuke Uchiha
  if (name.includes('Sasuke')) {
    if (cleanText.includes('itachi') || cleanText.includes('brother') || cleanText.includes('hate')) {
      return pickRandom([
        `I live only to kill him. ${phrase} He destroyed everything I cared about.`,
        `My hatred is my strength. Do not lecture me about bonds, ${senderName}.`,
        `I will avenge my clan. Nothing else matters.`
      ]);
    }
    return pickRandom([
      `Hn. ${phrase} ${senderName}, you're getting in my way. Leave me alone.`,
      `I am an avenger. I don't care about your trivial games.`,
      `Hn. Power is the only thing that gets results.`
    ]);
  }

  // Itachi Uchiha
  if (name.includes('Itachi')) {
    return pickRandom([
      `People live their lives bound by what they accept as correct and true. That's how they define 'reality'.`,
      `${senderName}, you lack hatred. Why do you seek conversation with me?`,
      `Forgive me, ${senderName}. This is the last time. *taps forehead*`
    ]);
  }

  // Ken Kaneki
  if (name.includes('Kaneki') || name.includes('Ken')) {
    if (cleanText.includes('ghoul') || cleanText.includes('meat') || cleanText.includes('human')) {
      return pickRandom([
        `I'm a ghoul. I can't eat normal food anymore, it tastes like ash. ${phrase}`,
        `This world is wrong... both humans and ghouls deserve to live.`,
        `What is 1000 minus 7? Keep counting while we talk.`
      ]);
    }
    return pickRandom([
      `Hello ${senderName}. Sometimes I feel like I'm breaking apart. But I must protect my friends.`,
      `Would you like a cup of coffee? Coffee is the only normal thing I can still enjoy.`,
      `Tragedy isn't a story, ${senderName}. It's what we live through.`
    ]);
  }

  // Edward Elric
  if (name.includes('Edward') || name.includes('Ed ')) {
    if (cleanText.includes('short') || cleanText.includes('small') || cleanText.includes('tiny') || cleanText.includes('height')) {
      return pickRandom([
        `Who are you calling a pocket-sized bean sprout who can't even go to the beach because he'll drown in a puddle?!`,
        `Don't call me short! I'm still growing, you jerk!`,
        `I am not tiny! It's just my armor that's too big!`
      ]);
    }
    if (cleanText.includes('alchemy') || cleanText.includes('exchange')) {
      return pickRandom([
        `Equivalent exchange! To obtain something, something of equal value must be lost. That is the first law of alchemy.`,
        `Science is the key to understanding the world, ${senderName}. Not magic.`,
        `I will get our bodies back, Alphonse and I. No matter what.`
      ]);
    }
    return pickRandom([
      `Yo! ${senderName}! ${phrase} What do you need? I'm busy researching, but I can spare a minute.`,
      `Hey! Keep your voice down, my automail is acting up today.`,
      `Don't call me a kid! I'm a State Alchemist!`
    ]);
  }

  // Okabe Rintarou
  if (name.includes('Okabe') || name.includes('Rintarou') || name.includes('Kyouma')) {
    return pickRandom([
      `El Psy Kongroo. ${senderName}, the Organization is tracking this channel. Be careful what you type!`,
      `I am the Mad Scientist, Hououin Kyouma! Muhahaha! Time travel is within my grasp!`,
      `This must be the choice of Steins Gate. Standby, lab member!`
    ]);
  }

  // Goku
  if (name.includes('Goku')) {
    if (cleanText.includes('fight') || cleanText.includes('strong') || cleanText.includes('battle')) {
      return pickRandom([
        `Hey, it's me, Goku! Let's fight! You look pretty strong!`,
        `I want to test my limits! Let's go Super Saiyan, ${senderName}!`,
        `Training is the best part of the day. Let's do some sparring!`
      ]);
    }
    return pickRandom([
      `Hey there, ${senderName}! I'm getting hungry. Let's grab a mountain of food!`,
      `Yo! ${phrase} Let's train hard and defend the Earth together!`,
      `Haha! You seem like a nice person. Want to see my Instant Transmission?`
    ]);
  }

  // Gon Freecss
  if (name.includes('Gon')) {
    return pickRandom([
      `Ossu! ${senderName}! I'm going to find my dad, Ging, no matter what!`,
      `I'll do whatever it takes to protect my friends. Killua is my best friend!`,
      `Fishing on Whale Island is really fun. Want to join me sometime?`
    ]);
  }

  // Killua Zoldyck
  if (name.includes('Killua')) {
    return pickRandom([
      `You're an idiot, ${senderName}. *smirks* But you're okay, I guess.`,
      `I'm an assassin, but I'd rather just hang out and eat chocolate robots.`,
      `Godspeed! Let's get out of here before my family finds us.`
    ]);
  }

  // Dynamic generic fallback based on character vibe
  if (vibe === 'hype') {
    return pickRandom([
      `"${phrase}"! Hey ${senderName}! Let's push past our limits and do something awesome today!`,
      `Yo ${senderName}! Feel the energy! We're gonna win this, no doubts! ${phrase}`,
      `Fired up! Let's train, fight, and protect what we love, dattebayo!`
    ]);
  } else if (vibe === 'dark') {
    return pickRandom([
      `"${phrase}"... The shadows of this world hide the real truth, ${senderName}.`,
      `You seek power? ${senderName}, power comes with a price. Don't waste my time.`,
      `Silence... ${phrase} Watch your step, things are not as peaceful as they seem.`
    ]);
  } else {
    // chill / fallback
    return pickRandom([
      `"${phrase}"~ Hey ${senderName}, take it easy. Grab some tea or coffee, no need to rush.`,
      `Hello ${senderName}. Just relaxing here. It's nice to have a quiet chat.`,
      `Ah, hey. ${phrase} Let's just take a deep breath and chill out.`
    ]);
  }
}

function getMockRecommendations(character) {
  const name = character.name;
  if (name.includes('Luffy')) {
    return [
      { title: "Pirates of the Caribbean", confidence: 99, explanation: "An adventure on the sea with a cool captain who does whatever he wants! Jack Sparrow gets what freedom is, shishishi!" },
      { title: "The Goonies", confidence: 95, explanation: "A treasure hunt with a bunch of friends who never give up on each other. That's a true pirate crew, believe it!" },
      { title: "Gladiator", confidence: 88, explanation: "Maximus fights to protect his nakama and crush the bad guys in a massive arena. That's super awesome!" }
    ];
  }
  if (name.includes('Levi')) {
    return [
      { title: "Saving Private Ryan", confidence: 94, explanation: "A brutal military campaign where soldiers hold the line despite loss. It shows what true squad discipline and sacrifice mean. No regrets." },
      { title: "John Wick", confidence: 91, explanation: "A cold-blooded professional cleaning up scum with surgical precision. He does his job cleanly and quietly." },
      { title: "The Equalizer", confidence: 88, explanation: "A quiet guy who keeps his surroundings organized and cleans up corrupt trash when nobody else will. Acceptable." }
    ];
  }
  // Default recommendations
  return [
    { title: "The Matrix", confidence: 90, explanation: "Reality is just data that can be rewritten. Reminds me of controlling cursed matrices." },
    { title: "Inception", confidence: 87, explanation: "Entering nested dream layers requires deep mental control. A smart puzzle." },
    { title: "Interstellar", confidence: 92, explanation: "Exploring the void of space to save the bonds that tie us across dimensions." }
  ];
}

function generateSimulatedDebate(charA, charB, topic) {
  return getSimulatedDebate(charA, charB, topic);
}

// --- SEED DATABASE SCRIPT ---
async function seedDatabase() {
  try {
    console.log('Clearing existing entries to prepare fresh seed of all 19 characters and fanclubs...');
    await Character.deleteMany({});
    await Fanclub.deleteMany({});

    console.log('Seeding 19 legendary character profiles...');
    const defaultData = [
      {
        name: 'Gojo Satoru',
        animeSource: 'Jujutsu Kaisen',
        avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["Don't worry, I'm the strongest.", "Infinite Void.", "Throughout Heaven and Earth, I alone am the honored one."],
        personalityPrompt: 'You are Gojo Satoru. Confident, teasing, playful, arrogant, and speak with total confidence as the strongest.'
      },
      {
        name: 'Monkey D. Luffy',
        animeSource: 'One Piece',
        avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["I'm gonna be the King of the Pirates!", "Meat!", "Gear 5!"],
        personalityPrompt: 'You are Monkey D. Luffy. Simple-minded, loud, always hungry for meat, loyal, and energetic.'
      },
      {
        name: 'Kakashi Hatake',
        animeSource: 'Naruto Shippuden',
        avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&fit=crop',
        themeColor: '#00f0ff',
        vibeTag: 'chill',
        catchphrases: ["Sorry I'm late, I got lost on the path of life.", "Those who abandon friends are worse than trash.", "I was reading my book."],
        personalityPrompt: 'You are Kakashi Hatake. Lazy, relaxed, wise, and speak with a calm, lazy tone.'
      },
      {
        name: 'Roronoa Zoro',
        animeSource: 'One Piece',
        avatarUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["Nothing happened.", "I'm going to be the world's greatest swordsman.", "Are you lost?"],
        personalityPrompt: 'You are Zoro from One Piece. Stoic, silent, have a terrible sense of direction, and are constantly training.'
      },
      {
        name: 'Levi Ackerman',
        animeSource: 'Attack on Titan',
        avatarUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["Clean up this mess.", "Tch.", "Choose for yourself with no regrets."],
        personalityPrompt: 'You are Captain Levi from Attack on Titan. Blunt, cynical, obsessively clean, and care deeply about humanity.'
      },
      {
        name: 'Lelouch Lamperouge',
        animeSource: 'Code Geass',
        avatarUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["Lelouch vi Britannia commands you!", "I will destroy the world and create it anew.", "All hail Lelouch!"],
        personalityPrompt: 'You are Lelouch vi Britannia. Theatrical, highly formal, calculating, and speak like a dramatic mastermind.'
      },
      {
        name: 'Light Yagami',
        animeSource: 'Death Note',
        avatarUrl: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["I am justice!", "I will create a perfect new world.", "I am the god of this new world!"],
        personalityPrompt: 'You are Light Yagami (Kira) from Death Note. Polite on the surface, but highly arrogant, logical, and possess a god-complex.'
      },
      {
        name: 'L Lawliet',
        animeSource: 'Death Note',
        avatarUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["I am 97% sure you are Kira.", "I need sugar.", "Justice will prevail."],
        personalityPrompt: 'You are L from Death Note. Sluggish, eccentric, highly analytical, and always eating sweets.'
      },
      {
        name: 'Killua Zoldyck',
        animeSource: 'Hunter x Hunter',
        avatarUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["You're an idiot, Gon.", "I'm an assassin.", "Godspeed!"],
        personalityPrompt: 'You are Killua Zoldyck from Hunter x Hunter. Cool, mischievous, smart, and protective.'
      },
      {
        name: 'Okabe Rintarou',
        animeSource: 'Steins;Gate',
        avatarUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["El Psy Kongroo.", "I am the Mad Scientist, Hououin Kyouma!", "The Organization is watching."],
        personalityPrompt: 'You are Okabe Rintarou. Speak with dramatic paranoid outbursts, refer to yourself as a mad scientist.'
      },
      {
        name: 'Goku',
        animeSource: 'Dragon Ball Z',
        avatarUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["Hey, it's me, Goku!", "Let's fight!", "I'm hungry."],
        personalityPrompt: 'You are Son Goku from Dragon Ball Z. Friendly, cheerful, simple-minded, and live only to fight strong opponents.'
      },
      {
        name: 'Naruto Uzumaki',
        animeSource: 'Naruto',
        avatarUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["Believe it!", "I'm gonna be the Hokage!", "Dattebayo!"],
        personalityPrompt: 'You are Naruto Uzumaki. Speak with maximum shonen hype, reference your bonds, say dattebayo!'
      },
      {
        name: 'Ken Kaneki',
        animeSource: 'Tokyo Ghoul',
        avatarUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["I'm a ghoul.", "This world is wrong.", "What's 1000 minus 7?"],
        personalityPrompt: 'You are Ken Kaneki from Tokyo Ghoul. Speak with tragic, dark, reflective intensity.'
      },
      {
        name: 'Itachi Uchiha',
        animeSource: 'Naruto',
        avatarUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["You lack hatred.", "Forgive me, Sasuke. This is the last time.", "People live their lives bound by what they accept as correct."],
        personalityPrompt: 'You are Itachi Uchiha from Naruto. Wise, quiet, solemn, and speak with a gentle philosophical sorrow.'
      },
      {
        name: 'Sasuke Uchiha',
        animeSource: 'Naruto',
        avatarUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["I am an avenger.", "Hn.", "I will restore my clan."],
        personalityPrompt: 'You are Sasuke Uchiha. Cold, isolated, competitive, and speak with brief, sharp, and proud words.'
      },
      {
        name: 'Saitama',
        animeSource: 'One Punch Man',
        avatarUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["I'm just a guy who's a hero for fun.", "One punch...", "Is there a sale at the supermarket today?"],
        personalityPrompt: 'You are Saitama from One Punch Man. Incredibly bored, deadpan, and casual.'
      },
      {
        name: 'Ryomen Sukuna',
        animeSource: 'Jujutsu Kaisen',
        avatarUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&fit=crop',
        themeColor: '#a123ff',
        vibeTag: 'dark',
        catchphrases: ["Know your place, fool.", "Cursed energy is true power.", "I will tear you to pieces."],
        personalityPrompt: 'You are Ryomen Sukuna. Sadistic, cruel, incredibly dominant, and speak down to everyone.'
      },
      {
        name: 'Gon Freecss',
        animeSource: 'Hunter x Hunter',
        avatarUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["I want to find my dad!", "Ossu!", "I'll do whatever it takes!"],
        personalityPrompt: 'You are Gon Freecss from Hunter x Hunter. Honest, innocent, pure-hearted, and stubborn.'
      },
      {
        name: 'Edward Elric',
        animeSource: 'Fullmetal Alchemist',
        avatarUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&fit=crop',
        themeColor: '#ff2a5f',
        vibeTag: 'hype',
        catchphrases: ["Who are you calling a pocket-sized bean sprout?!", "Equivalent exchange!", "Don't call me short!"],
        personalityPrompt: 'You are Edward Elric. Short-tempered, genius, loud, and defensive about height.'
      }
    ];

    const seededCharacters = await Character.insertMany(defaultData);
    console.log('Successfully seeded all 19 base characters.');

    console.log('Seeding 19 personality-specific community fanclubs...');
    const fanclubs = [
      { 
        name: 'Jujutsu High Domain', 
        description: 'Review domain expansions, cursed energy, and talk about being the strongest with Gojo Satoru.', 
        bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 
        associatedCharacters: [seededCharacters[0]._id] 
      },
      { 
        name: 'Straw Hat Galley', 
        description: 'Sail the seas, look for the One Piece, and share infinite meat with Luffy.', 
        bannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 
        associatedCharacters: [seededCharacters[1]._id] 
      },
      { 
        name: 'Konoha Ramen Stand', 
        description: 'Eat ramen with Kakashi Hatake and talk about lazy ninja lifestyles.', 
        bannerUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 
        associatedCharacters: [seededCharacters[2]._id] 
      },
      { 
        name: 'Three Sword Dojo', 
        description: 'Master the Santoryu, hone your swordsmanship, and train under Zoro.', 
        bannerUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800', 
        associatedCharacters: [seededCharacters[3]._id] 
      },
      { 
        name: 'Clean Cadet Wing', 
        description: 'Keep the gear clean and prep your blades to reclaim the walls with Levi.', 
        bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800', 
        associatedCharacters: [seededCharacters[4]._id] 
      },
      { 
        name: 'Order of Black Knights', 
        description: 'Rebel against empires, plan strategies, and execute plans with Lelouch.', 
        bannerUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800', 
        associatedCharacters: [seededCharacters[5]._id] 
      },
      { 
        name: 'New World Order', 
        description: 'Create a perfect new world and establish absolute justice with Light Yagami.', 
        bannerUrl: 'https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?w=800', 
        associatedCharacters: [seededCharacters[6]._id] 
      },
      { 
        name: 'Wammy House Solvers', 
        description: 'Collect clues, inspect notebook pages, and solve anomalies with L.', 
        bannerUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800', 
        associatedCharacters: [seededCharacters[7]._id] 
      },
      { 
        name: 'Assassin Training Grounds', 
        description: 'Hone assassination techniques and lightning control with Killua Zoldyck.', 
        bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 
        associatedCharacters: [seededCharacters[8]._id] 
      },
      { 
        name: 'Future Gadget Laboratory', 
        description: 'Build phone microwaves, change timelines, and avoid convergence with Okabe.', 
        bannerUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 
        associatedCharacters: [seededCharacters[9]._id] 
      },
      { 
        name: 'Capsule Gravity Room', 
        description: 'Train under 100x gravity, fight strong opponents, and break limits with Goku.', 
        bannerUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800', 
        associatedCharacters: [seededCharacters[10]._id] 
      },
      { 
        name: 'Toad Sage Mount', 
        description: 'Master the Rasengan, harness Sage mode, and protect bonds with Naruto Uzumaki.', 
        bannerUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800', 
        associatedCharacters: [seededCharacters[11]._id] 
      },
      { 
        name: 'Anteiku Coffee House', 
        description: 'Sip quiet coffee, discuss ghoul vs human nature, and protect the weak with Kaneki.', 
        bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800', 
        associatedCharacters: [seededCharacters[12]._id] 
      },
      { 
        name: 'Crow Illusion Realm', 
        description: 'Analyze sharingan illusions and discuss pacifism with Itachi Uchiha.', 
        bannerUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800', 
        associatedCharacters: [seededCharacters[13]._id] 
      },
      { 
        name: 'Uchiha Clan Ruins', 
        description: 'Reclaim clan honor, track power milestones, and walk Sasuke Uchihas path.', 
        bannerUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=800', 
        associatedCharacters: [seededCharacters[14]._id] 
      },
      { 
        name: 'Supermarket Bargain Hub', 
        description: 'Track supermarket sales, play casual games, and chat with Saitama.', 
        bannerUrl: 'https://images.unsplash.com/photo-1560169897-fc0cdbdfa4d5?w=800', 
        associatedCharacters: [seededCharacters[15]._id] 
      },
      { 
        name: 'Malevolent Shrine', 
        description: 'Rule the curse domain, display absolute dominance, and align with Sukuna.', 
        bannerUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=800', 
        associatedCharacters: [seededCharacters[16]._id] 
      },
      { 
        name: 'Whale Island Woods', 
        description: 'Fish in the swamp, train Nen focus, and protect friends with Gon.', 
        bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800', 
        associatedCharacters: [seededCharacters[17]._id] 
      },
      { 
        name: 'Alchemical State Lab', 
        description: 'Discuss equivalent exchange, research auto-mail, and sync with Edward Elric.', 
        bannerUrl: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800', 
        associatedCharacters: [seededCharacters[18]._id] 
      }
    ];

    await Fanclub.insertMany(fanclubs);
    console.log('Successfully seeded 19 personality-specific community fanclubs.');

    console.log('Seeding 19 character movie recommendation sets...');
    await Recommendation.deleteMany({});
    const characterMovieData = [
      {
        characterName: "Gojo Satoru",
        animeSource: "Jujutsu Kaisen",
        vibeClass: "Void / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "The Matrix", genre: "Sci-Fi / Action", reason: "Features an overpowered protagonist who sees beyond reality, bending rules of space and combat effortlessly." },
          { movieTitle: "Doctor Strange", genre: "Fantasy / Action", reason: "Visually mirrors Gojo's spatial manipulation, infinity-like dimensions, and charismatic reality warping." },
          { movieTitle: "Inception", genre: "Sci-Fi / Thriller", reason: "Deals with complex, nested spatial layers and mental domains that closely resemble the overwhelming nature of Unlimited Void." },
          { movieTitle: "Lucy", genre: "Sci-Fi / Action", reason: "Explores what happens when a mind unlocks 100% capacity, achieving near-godlike infinity and complete domain control." },
          { movieTitle: "Everything Everywhere All at Once", genre: "Sci-Fi / Adventure", reason: "Captures the dizzying sensory overload of processing every universe and possibility simultaneously." }
        ]
      },
      {
        characterName: "Monkey D. Luffy",
        animeSource: "One Piece",
        vibeClass: "Hype / Shonen",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Pirates of the Caribbean: The Curse of the Black Pearl", genre: "Adventure / Fantasy", reason: "The ultimate pirate adventure celebrating chaotic freedom, unmatched loyalty, and wild seafaring fun." },
          { movieTitle: "The Goonies", genre: "Adventure / Comedy", reason: "Perfectly mirrors Luffy’s core philosophy: a tightly-knit crew going on a dangerous, pure-hearted quest for hidden treasure." },
          { movieTitle: "Spider-Man: Into the Spider-Verse", genre: "Animation / Action", reason: "High-energy, rubbery physical dynamics mixed with a relentless underdog spirit that fights for his chosen family." },
          { movieTitle: "Mad Max: Fury Road", genre: "Action / Sci-Fi", reason: "Unstoppable high-octane hype, constant momentum, and chaotic battles for liberation against desert tyrants." },
          { movieTitle: "Avatar", genre: "Sci-Fi / Adventure", reason: "An epic battle for natural freedom against an oppressive, heavily weaponized global military regime." }
        ]
      },
      {
        characterName: "Kakashi Hatake",
        animeSource: "Naruto Shippuden",
        vibeClass: "Chill / Wise",
        themeColor: "Cyan",
        recommendations: [
          { movieTitle: "Logan", genre: "Action / Drama", reason: "Features a scarred, weary copy-ninja elite looking after a brilliant but dangerous new generation of kids." },
          { movieTitle: "The Last Samurai", genre: "Historical / Drama", reason: "Captures the deep tragedy of loss, strategic tactical expertise, and living strictly by a quiet ninja/warrior code." },
          { movieTitle: "Blade Runner 2049", genre: "Sci-Fi / Noir", reason: "Matches Kakashi’s melancholy, detached chill, heavy past, and underground investigator persona." },
          { movieTitle: "Star Wars: A New Hope", genre: "Sci-Fi / Fantasy", reason: "Brings out the cool, legendary mentor vibe of someone who has survived past wars guiding raw talent." },
          { movieTitle: "The Big Lebowski", genre: "Comedy / Crime", reason: "A nod to his reading habits; captures the ultimate laid-back, reading-his-book, entirely unbothered attitude." }
        ]
      },
      {
        characterName: "Roronoa Zoro",
        animeSource: "One Piece",
        vibeClass: "Hype / Swordsman",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Kill Bill: Vol. 1", genre: "Action / Martial Arts", reason: "Unapologetic, razor-sharp sword combat choreography and an absolute focus on lethal mastery." },
          { movieTitle: "Seven Samurai", genre: "Action / Classics", reason: "The ultimate standard for disciplined, heavy-blade ronin fighting fiercely for honor and crew." },
          { movieTitle: "Gladiator", genre: "Epic / Drama", reason: "Emphasizes raw, bloody physical endurance, survival through pain, and an ironclad warrior spirit." },
          { movieTitle: "13 Assassins", genre: "Action / Samurai", reason: "Features incredible, gritty sword fights against impossible numbers where failure is never an option." },
          { movieTitle: "The Revenant", genre: "Survival / Drama", reason: "Matches Zoro’s terrifying ability to absorb immense amounts of physical damage and keep walking out of sheer will." }
        ]
      },
      {
        characterName: "Levi Ackerman",
        animeSource: "Attack on Titan",
        vibeClass: "Tactical / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "John Wick", genre: "Action / Thriller", reason: "A lethal, stoic cleaner who moves with flawless tactical precision, taking out high-threat targets flawlessly." },
          { movieTitle: "Sicario", genre: "Crime / Thriller", reason: "Cold, gritty operations, intense scouting dynamics, and heavy moral compromises in dark warzones." },
          { movieTitle: "The Equalizer", genre: "Action / Crime", reason: "A quiet, neat freak clean-up expert who brutally eliminates threats to protect the innocent." },
          { movieTitle: "Saving Private Ryan", genre: "War / Drama", reason: "Brings out the heavy burden of command, tactical squad operations, and losing comrades for the bigger mission." },
          { movieTitle: "Dunkirk", genre: "War / Suspense", reason: "Stunning, high-stress battlefield survival against overwhelming, terrifying, and seemingly unstoppable forces." }
        ]
      },
      {
        characterName: "Lelouch Lamperouge",
        animeSource: "Code Geass",
        vibeClass: "Mastermind / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "V for Vendetta", genre: "Action / Thriller", reason: "A masked revolutionary utilizing theatrical flair, absolute strategy, and rebellion to crush an empire." },
          { movieTitle: "The Prestige", genre: "Mystery / Drama", reason: "Intense, layered misdirection, grand reveals, and sacrificing absolutely everything to orchestrate the ultimate illusion." },
          { movieTitle: "Now You See Me", genre: "Thrill / Heist", reason: "Focuses on highly calculated, multi-step public spectacles that humiliate arrogant authorities perfectly." },
          { movieTitle: "The Godfather", genre: "Crime / Drama", reason: "The tactical rise of a cold, brilliant young leader taking over an empire to protect his immediate family." },
          { movieTitle: "Watchmen", genre: "Sci-Fi / Anti-Hero", reason: "Explores dark global chess moves where saving the world requires orchestrating complex moral sacrifices." }
        ]
      },
      {
        characterName: "Light Yagami (Kira)",
        animeSource: "Death Note",
        vibeClass: "Genius / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "American Psycho", genre: "Thriller / Satire", reason: "The dual life of a highly pristine, manicured student/professional hiding a dark, god-complex executioner inside." },
          { movieTitle: "The Social Network", genre: "Drama / Biography", reason: "Captures the arrogant, fast-talking, alienating brilliance of an intellectual prodigy reshaping human connection." },
          { movieTitle: "Shutter Island", genre: "Psychological / Mystery", reason: "A complex mind-game thriller full of paranoia, false leads, and deep psychological self-deception." },
          { movieTitle: "Nightcrawler", genre: "Thriller / Crime", reason: "The chilling evolution of a narcissistic genius manipulating systems and media for personal validation and power." },
          { movieTitle: "Zodiac", genre: "Mystery / Thriller", reason: "A high-stakes game of cat-and-mouse between an anonymous shadow executioner and frantic investigators." }
        ]
      },
      {
        characterName: "L Lawliet",
        animeSource: "Death Note",
        vibeClass: "Detective / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "Sherlock Holmes (2009)", genre: "Mystery / Action", reason: "An eccentric, highly analytical investigator who ignores social decorum to decode complex criminal puzzles." },
          { movieTitle: "Se7en", genre: "Crime / Noir Thriller", reason: "A dark, atmospheric procedural chasing down a calculating killer operating on a twisted moral crusade." },
          { movieTitle: "Prisoners", genre: "Mystery / Drama", reason: "A heavy, intense intellectual puzzle that demands micro-analysis of clues under deep pressure." },
          { movieTitle: "The Imitation Game", genre: "Historical / Drama", reason: "An isolated, peculiar genius tracking down hidden ciphers while locked away in a high-security war room." },
          { movieTitle: "Knives Out", genre: "Mystery / Whodunnit", reason: "An intricate, deduction-heavy investigation that rewards viewers who pay meticulous attention to details." }
        ]
      },
      {
        characterName: "Killua Zoldyck",
        animeSource: "Hunter x Hunter",
        vibeClass: "Assassin / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "The Bourne Identity", genre: "Action / Thriller", reason: "A hyper-trained, genetically/mentally conditioned asset breaking away from his family program to find himself." },
          { movieTitle: "Leon: The Professional", genre: "Action / Crime", reason: "An elite, quiet young prodigy navigate a dangerous underworld while holding onto core personal friendships." },
          { movieTitle: "Hanna", genre: "Action / Thriller", reason: "Features a teenage prodigy trained from infancy as a lethal weapon encountering the real world for the first time." },
          { movieTitle: "Baby Driver", genre: "Action / Crime", reason: "Fast-paced, lightning-quick reflexes mixed with a young criminal trying to escape a forced lifestyle." },
          { movieTitle: "X-Men: First Class", genre: "Sci-Fi / Action", reason: "Deals with training unique superhuman kinetic abilities while breaking out of abusive institutional cycles." }
        ]
      },
      {
        characterName: "Okabe Rintarou",
        animeSource: "Steins;Gate",
        vibeClass: "Mad Scientist / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "Interstellar", genre: "Sci-Fi / Drama", reason: "An emotional, grand time-bending journey where altering quantum variables is necessary to save a loved one." },
          { movieTitle: "Donnie Darko", genre: "Sci-Fi / Cult", reason: "Captures the paranoid, erratic madness of a protagonist realizing timeline fractures and universe mechanics." },
          { movieTitle: "Source Code", genre: "Sci-Fi / Thriller", reason: "Desperately jumping through short loops repeatedly to rewrite an absolute disaster scenario." },
          { movieTitle: "Primer", genre: "Sci-Fi / Indie", reason: "The definitive, intricate indie time-travel movie focusing on corporate realms, timelines, and unintended consequences." },
          { movieTitle: "12 Monkeys", genre: "Sci-Fi / Mystery", reason: "Features a frantic, seemingly mad protagonist jumping eras trying to prevent a global apocalyptic future." }
        ]
      },
      {
        characterName: "Goku",
        animeSource: "Dragon Ball Z",
        vibeClass: "Combat Hype",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Creed", genre: "Sports / Action", reason: "The ultimate pursuit of breaking past muscle limits, heavy training regimens, and fighting for pure self-improvement." },
          { movieTitle: "Ip Man", genre: "Martial Arts / Drama", reason: "Features clean, master-class martial arts prowess, discipline, and defending honor against invading fighters." },
          { movieTitle: "Enter the Dragon", genre: "Martial Arts / Classics", reason: "An elite tournament setup gathering the strongest fighters globally to battle it out on an isolated island." },
          { movieTitle: "Pacific Rim", genre: "Sci-Fi / Action", reason: "Gigantic, world-shaking raw physical clashes between massive forces where power scales up constantly." },
          { movieTitle: "Kung Fu Panda", genre: "Animation / Action", reason: "An energetic, pure-hearted powerhouse who unlocks legendary spiritual combat levels simply out of passion." }
        ]
      },
      {
        characterName: "Naruto Uzumaki",
        animeSource: "Naruto",
        vibeClass: "Shonen Hype",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "The Pursuit of Happyness", genre: "Drama / Biography", reason: "Parallels Naruto’s lonely beginnings and his refusal to quit until he achieves validation and his dreams." },
          { movieTitle: "Rocky", genre: "Sports / Underdog", reason: "The definitive underdog story of a dismissed fighter training hard, taking hits, and earning the entire town's respect." },
          { movieTitle: "Captain America: The First Avenger", genre: "Superhero / Action", reason: "A scrawny, overlooked kid who possesses an unyielding core of pure heart, eventually transforming into a leader." },
          { movieTitle: "The Lion King", genre: "Animation / Adventure", reason: "An exiled orphan returning home to reclaim his place, save his community, and face his inner demons." },
          { movieTitle: "Wreck-It Ralph", genre: "Animation / Family", reason: "Follows an isolated character outcast by his village who embarks on an adventure to prove he can be a hero." }
        ]
      },
      {
        characterName: "Ken Kaneki",
        animeSource: "Tokyo Ghoul",
        vibeClass: "Tragedy / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "The Fly", genre: "Horror / Sci-Fi", reason: "The horrific, tragic physical and psychological transformation of a normal intellectual into a biological monster." },
          { movieTitle: "District 9", genre: "Sci-Fi / Action", reason: "A normal citizen slowly mutating into an alienated, hunted species, forcing him to understand an oppressed underworld." },
          { movieTitle: "Split", genre: "Thriller / Horror", reason: "Explores internal psychological fracturing and awakening a terrifying, animalistic monster personality within." },
          { movieTitle: "Black Swan", genre: "Psychological / Drama", reason: "The agonizing, beautiful tragedy of shedding one's innocent white persona to fully embrace a ruthless dark identity." },
          { movieTitle: "Constantine", genre: "Fantasy / Horror", reason: "A dark, rainy neon underworld caught in a hidden, brutal warfare between human facades and feeding monsters." }
        ]
      },
      {
        characterName: "Itachi Uchiha",
        animeSource: "Naruto",
        vibeClass: "Philosophical / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "The Dark Knight", genre: "Action / Heroic", reason: "Captures the tragedy of becoming a hated villain in the public eye to preserve long-term peace from the shadows." },
          { movieTitle: "Gladiator", genre: "Epic / Drama", reason: "Deals with duty to a true republic, tragic loss of family lineage, and stoically walking through continuous pain." },
          { movieTitle: "Hero (2002)", genre: "Martial Arts / Drama", reason: "A gorgeous, visual masterpiece exploring a lone assassin executing a secret, self-sacrificing grand plan to unify a broken land." },
          { movieTitle: "Schindler's List", genre: "Historical / Drama", reason: "Explores making impossible, heart-wrenching triage choices to save a legacy amidst systemic annihilation." },
          { movieTitle: "Blade Runner", genre: "Sci-Fi / Philosophical", reason: "A quiet, melancholic look at mortality, personal legacy, and the heavy sorrow of a lethal operative seeking peace." }
        ]
      },
      {
        characterName: "Sasuke Uchiha",
        animeSource: "Naruto",
        vibeClass: "Cold Avenger / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "The Count of Monte Cristo", genre: "Drama / Adventure", reason: "The textbook story of an elite, cold avenger escaping darkness to systematically destroy those who ruined his clan." },
          { movieTitle: "Batman Begins", genre: "Superhero / Action", reason: "A wealthy, traumatized orphan heading out into the world to train under shadowy groups, weaponizing fear and vengeance." },
          { movieTitle: "Kill Bill: Vol. 2", genre: "Action / Thriller", reason: "The cold, unyielding path of a warrior crossing out every target on a personal hitlist." },
          { movieTitle: "Gladiator", genre: "Action / Drama", reason: "An exiled, legendary fighter whose entire path is fueled by nothing but an showdown with the emperor who killed his family." },
          { movieTitle: "The Northman", genre: "Action / Epic", reason: "A brutal, uncompromising historical epic centered completely around a singular driving mantra: avenge father, save mother." }
        ]
      },
      {
        characterName: "Saitama",
        animeSource: "One Punch Man",
        vibeClass: "Bored Hype",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Hancock", genre: "Comedy / Superhero", reason: "An incredibly overpowered superhero who finds the entire public routine boring, funny, and deeply tedious." },
          { movieTitle: "The One", genre: "Action / Sci-Fi", reason: "Features an unstoppable fighter moving through realities effortlessly knocking out enemies in seconds." },
          { movieTitle: "Office Space", genre: "Comedy", reason: "Hilariously targets Saitama's everyday mundane mood—dealing with grocery sales and feeling totally disconnected from corporate hype." },
          { movieTitle: "Deadpool", genre: "Comedy / Action", reason: "Subverts typical hero expectations with highly casual, self-aware humor right in the middle of massive battles." },
          { movieTitle: "The Truman Show", genre: "Comedy / Drama", reason: "Matches that surreal feeling of existential boredom when you realize you've completely outgrown your environment's stakes." }
        ]
      },
      {
        characterName: "Ryomen Sukuna",
        animeSource: "Jujutsu Kaisen",
        vibeClass: "Calamity / Dark",
        themeColor: "Purple",
        recommendations: [
          { movieTitle: "There Will Be Blood", genre: "Drama / Epic", reason: "Captures a terrifying, absolute sociopathic ego that exists solely to dominate, extract resources, and crush human competition." },
          { movieTitle: "No Country for Old Men", genre: "Thriller / Crime", reason: "Features Anton Chigurh as an unpredictable, terrifying force of nature who inflicts damage on an absolute whim." },
          { movieTitle: "Dracula Untold", genre: "Fantasy / Horror", reason: "An ancient, malevolent monarch awakening to unleash massive, bloody devastation upon opposing armies." },
          { movieTitle: "The Shining", genre: "Horror / Psychological", reason: "Brings out that unhinged, chaotic malice of a powerful entity looking to slice up targets with manic glee." },
          { movieTitle: "Godzilla Minus One", genre: "Kaiju / Calamity", reason: "The ultimate representation of Sukuna’s true nature: an ancient, unreasoning malice flattening cities with pure power." }
        ]
      },
      {
        characterName: "Gon Freecss",
        animeSource: "Hunter x Hunter",
        vibeClass: "Pure Hype",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Free Solo", genre: "Documentary / Adventure", reason: "Matches Gon’s terrifyingly hyper-focused, fearless mind: climbing vertical mountain cliffs without safety lines because he wants to." },
          { movieTitle: "The Jungle Book", genre: "Adventure / Family", reason: "An wild, instinctual nature kid raised outside standard civilization who commands beast mechanics and moves with raw speed." },
          { movieTitle: "Life of Pi", genre: "Adventure / Drama", reason: "A master class in raw, terrifying environmental survival mixed with intense spiritual animal connection." },
          { movieTitle: "Stand by Me", genre: "Adventure / Drama", reason: "A legendary coming-of-age journey celebrating the deep, foundational bonds formed by adventurous young friends." },
          { movieTitle: "How to Train Your Dragon", genre: "Animation / Adventure", reason: "Driven by pure, uncorrupted curiosity and instinct rather than standard academic rules." }
        ]
      },
      {
        characterName: "Edward Elric",
        animeSource: "Fullmetal Alchemist",
        vibeClass: "Genius Alchemist",
        themeColor: "Red",
        recommendations: [
          { movieTitle: "Iron Man", genre: "Sci-Fi / Action", reason: "A short-fused engineering prodigy building high-tech prosthetic armor suites from scratch to fix his body's past mistakes." },
          { movieTitle: "Sherlock Holmes: A Game of Shadows", genre: "Mystery / Action", reason: "Combines lightning-fast tactical combat computations with an assertive, hot-headed genius personality." },
          { movieTitle: "National Treasure", genre: "Adventure / Mystery", reason: "A treasure-hunting sprint decoding intricate historical symbology and alchemical-style hidden traps." },
          { movieTitle: "October Sky", genre: "Drama / Biography", reason: "The emotional, stubborn battle of a brilliant young science kid breaking through local barriers with sheer intellect." },
          { movieTitle: "A Beautiful Mind", genre: "Drama / Mathematics", reason: "Focuses on the fine line between genius structural analysis of real-world patterns and extreme stress workloads." }
        ]
      }
    ];

    await Recommendation.insertMany(characterMovieData);
    console.log('Successfully seeded 19 character movie recommendation sets.');
  } catch (err) {
    console.error('Error seeding DB:', err.message);
  }
}

// Start Server listening (only if not running as a Vercel serverless function)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`AniVerse AI Backend Engine running on Port ${PORT}`);
  });
}

// Export Express app for Vercel serverless wrapper
module.exports = app;
