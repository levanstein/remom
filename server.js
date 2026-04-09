const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

const API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

// Clone a voice from uploaded audio
app.post('/api/clone-voice', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No audio file provided' });

    const form = new FormData();
    form.append('name', req.body.name || 'REM-MOM Voice');
    form.append('description', 'Voice clone for REM-MOM dementia care companion');
    form.append('files', new Blob([req.file.buffer], { type: req.file.mimetype }), req.file.originalname || 'voice.webm');

    const response = await fetch(`${API_BASE}/voices/add`, {
      method: 'POST',
      headers: { 'xi-api-key': API_KEY },
      body: form,
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs clone error:', err);
      return res.status(response.status).json({ error: 'Voice cloning failed', details: err });
    }

    const data = await response.json();
    res.json({ voice_id: data.voice_id });
  } catch (err) {
    console.error('Clone error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate speech with a cloned voice
app.post('/api/generate-speech', async (req, res) => {
  try {
    const { voice_id, text } = req.body;
    if (!voice_id || !text) return res.status(400).json({ error: 'voice_id and text required' });

    const response = await fetch(`${API_BASE}/text-to-speech/${voice_id}`, {
      method: 'POST',
      headers: {
        'xi-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('ElevenLabs TTS error:', err);
      return res.status(response.status).json({ error: 'Speech generation failed', details: err });
    }

    res.set('Content-Type', 'audio/mpeg');
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (err) {
    console.error('TTS error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Cleanup a cloned voice
app.delete('/api/voice/:voice_id', async (req, res) => {
  try {
    const response = await fetch(`${API_BASE}/voices/${req.params.voice_id}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': API_KEY },
    });
    res.json({ deleted: response.ok });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed' });
  }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`REM-MOM server running on port ${PORT}`);
});
