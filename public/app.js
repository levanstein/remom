// REM-MOM Client App
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let audioBlob = null;
let voiceId = null;

// DOM elements
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const recordingIndicator = document.getElementById('recording-indicator');
const recTimer = document.getElementById('rec-timer');
const fileUpload = document.getElementById('file-upload');
const audioPreview = document.getElementById('audio-preview');
const previewPlayer = document.getElementById('preview-player');
const btnClone = document.getElementById('btn-clone');
const cloneLoading = document.getElementById('clone-loading');
const cloneSuccess = document.getElementById('clone-success');
const stepMessage = document.getElementById('step-message');
const scenarioBtns = document.querySelectorAll('.scenario-btn');
const messageInput = document.getElementById('message-input');
const btnGenerate = document.getElementById('btn-generate');
const generateLoading = document.getElementById('generate-loading');
const resultAudio = document.getElementById('result-audio');
const resultPlayer = document.getElementById('result-player');
const btnTryAnother = document.getElementById('btn-try-another');

// ── Recording ──

btnRecord.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      showPreview(audioBlob);
    };

    mediaRecorder.start();
    btnRecord.style.display = 'none';
    recordingIndicator.classList.add('active');
    recordingSeconds = 0;
    recTimer.textContent = '0:00';
    recordingTimer = setInterval(() => {
      recordingSeconds++;
      const m = Math.floor(recordingSeconds / 60);
      const s = recordingSeconds % 60;
      recTimer.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  } catch (err) {
    alert('Microphone access denied. Please use the file upload option instead.');
  }
});

btnStop.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    clearInterval(recordingTimer);
    recordingIndicator.classList.remove('active');
    btnRecord.style.display = 'flex';
  }
});

// ── File Upload ──

fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    audioBlob = file;
    showPreview(file);
  }
});

function showPreview(blob) {
  const url = URL.createObjectURL(blob);
  previewPlayer.src = url;
  audioPreview.style.display = 'flex';
}

// ── Voice Cloning ──

btnClone.addEventListener('click', async () => {
  if (!audioBlob) return;

  audioPreview.style.display = 'none';
  cloneLoading.style.display = 'flex';

  const formData = new FormData();
  formData.append('audio', audioBlob, 'voice.webm');
  formData.append('name', 'REM-MOM Voice');

  try {
    const res = await fetch('/api/clone-voice', { method: 'POST', body: formData });
    const data = await res.json();

    if (data.voice_id) {
      voiceId = data.voice_id;
      cloneLoading.style.display = 'none';
      cloneSuccess.style.display = 'flex';

      // Show step 2 after a brief moment
      setTimeout(() => {
        stepMessage.style.display = 'block';
        stepMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 800);
    } else {
      throw new Error(data.error || 'Clone failed');
    }
  } catch (err) {
    cloneLoading.style.display = 'none';
    audioPreview.style.display = 'flex';
    alert('Voice cloning failed: ' + err.message + '. Try uploading a longer audio sample.');
  }
});

// ── Scenario Selection ──

scenarioBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    scenarioBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const text = btn.dataset.text;
    if (text) {
      messageInput.value = text;
    } else {
      messageInput.value = '';
      messageInput.focus();
    }
  });
});

// ── Speech Generation ──

btnGenerate.addEventListener('click', async () => {
  const text = messageInput.value.trim();
  if (!text || !voiceId) return;

  btnGenerate.disabled = true;
  generateLoading.style.display = 'flex';
  resultAudio.style.display = 'none';

  try {
    const res = await fetch('/api/generate-speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voice_id: voiceId, text }),
    });

    if (!res.ok) throw new Error('Speech generation failed');

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    resultPlayer.src = url;
    resultPlayer.play();

    generateLoading.style.display = 'none';
    resultAudio.style.display = 'block';
  } catch (err) {
    generateLoading.style.display = 'none';
    alert('Speech generation failed: ' + err.message);
  } finally {
    btnGenerate.disabled = false;
  }
});

btnTryAnother.addEventListener('click', () => {
  resultAudio.style.display = 'none';
  messageInput.value = '';
  messageInput.focus();
  scenarioBtns.forEach(b => b.classList.remove('active'));
});

// ── Smooth scroll for CTA ──
document.querySelector('.cta-btn').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('demo').scrollIntoView({ behavior: 'smooth' });
});
