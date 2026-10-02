// scripts/generate-audio.js
// Generates 9 clean, retro, lightweight 16-bit PCM WAV sound effects for College Navigator.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const audioDir = path.join(projectRoot, 'assets', 'audio');

if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const SAMPLE_RATE = 22050; // Standard retro game sample rate (lightweight, pristine)

/**
 * Creates a standard 44-byte WAV Buffer from Float32Array samples (-1.0 to 1.0).
 */
function createWavBuffer(samples, sampleRate = SAMPLE_RATE) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20);  // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // "data" subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    // Clamp sample between -1 and 1
    const s = Math.max(-1, Math.min(1, samples[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7FFF;
    buffer.writeInt16LE(Math.round(intSample), offset);
    offset += 2;
  }

  return buffer;
}

// 1. UI BUTTON CLICK: very short pixel click (~30ms)
function generateUiClick() {
  const duration = 0.030;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const freq = 1200 - progress * 800; // pitch drops 1200Hz -> 400Hz
    const env = Math.pow(1 - progress, 2.5); // snappy exponential decay
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.7 + (Math.sin(2 * Math.PI * freq * 2 * t) * 0.3);
    samples[i] = wave * env * 0.65;
  }
  return samples;
}

// 2. CHARACTER SELECT: short two-note confirmation (~130ms)
function generateCharacterSelect() {
  const duration = 0.130;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  const note1End = Math.floor(SAMPLE_RATE * 0.055);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let freq = 523.25; // C5
    let env = 0;
    if (i < note1End) {
      const p = i / note1End;
      env = (1 - p * 0.5) * Math.min(1, i / (SAMPLE_RATE * 0.005));
    } else {
      freq = 783.99; // G5
      const p = (i - note1End) / (totalSamples - note1End);
      env = (1 - p) * Math.min(1, (i - note1End) / (SAMPLE_RATE * 0.005));
    }
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.8 + Math.sin(2 * Math.PI * freq * 3 * t) * 0.2;
    samples[i] = wave * env * 0.6;
  }
  return samples;
}

// 3. MAP ENTER: brief soft transition/chime (~280ms)
function generateMapEnter() {
  const duration = 0.280;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  const notes = [
    { freq: 659.25, start: 0.000, end: 0.080 }, // E5
    { freq: 830.61, start: 0.080, end: 0.160 }, // G#5
    { freq: 987.77, start: 0.160, end: 0.280 }  // B5
  ];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    for (const note of notes) {
      if (t >= note.start) {
        const noteT = t - note.start;
        const noteDur = duration - note.start;
        const p = noteT / noteDur;
        if (p < 1) {
          const env = Math.pow(1 - p, 1.8) * Math.min(1, noteT / 0.006);
          val += (Math.sin(2 * Math.PI * note.freq * noteT) * 0.7 + Math.sin(2 * Math.PI * note.freq * 2 * noteT) * 0.3) * env * 0.45;
        }
      }
    }
    samples[i] = val;
  }
  return samples;
}

// 4. BACK: short lower-pitched UI click (~40ms)
function generateBack() {
  const duration = 0.040;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const freq = 420 - progress * 240; // 420Hz -> 180Hz
    const env = Math.pow(1 - progress, 2.0);
    const wave = Math.sin(2 * Math.PI * freq * t);
    samples[i] = wave * env * 0.7;
  }
  return samples;
}

// 5. TALK: soft retro chime (~220ms)
function generateTalk() {
  const duration = 0.220;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const env = Math.pow(1 - progress, 1.6) * Math.min(1, t / 0.008);
    // Harmonious dual bell: 587.33 (D5) + 880 (A5)
    const wave = Math.sin(2 * Math.PI * 587.33 * t) * 0.6 + Math.sin(2 * Math.PI * 880 * t) * 0.4;
    samples[i] = wave * env * 0.55;
  }
  return samples;
}

// 6. DIALOGUE ADVANCE: tiny text/UI blip (~25ms)
function generateDialogue() {
  const duration = 0.025;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const env = Math.pow(1 - progress, 2.0);
    const wave = Math.sin(2 * Math.PI * 940 * t);
    samples[i] = wave * env * 0.45;
  }
  return samples;
}

// 7. DESTINATION SELECTED: clear confirmation beep (~90ms)
function generateDestinationSelected() {
  const duration = 0.090;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const env = Math.pow(1 - progress, 1.4) * Math.min(1, t / 0.005);
    const freq = 659.25; // E5
    const wave = Math.sin(2 * Math.PI * freq * t) * 0.8 + Math.sin(2 * Math.PI * freq * 2 * t) * 0.2;
    samples[i] = wave * env * 0.6;
  }
  return samples;
}

// 8. DESTINATION REACHED: short positive completion jingle (~550ms)
function generateDestinationReached() {
  const duration = 0.550;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  const notes = [
    { freq: 523.25, start: 0.000, len: 0.090 }, // C5
    { freq: 659.25, start: 0.090, len: 0.090 }, // E5
    { freq: 783.99, start: 0.180, len: 0.090 }, // G5
    { freq: 1046.50, start: 0.270, len: 0.280 } // C6
  ];
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    let val = 0;
    for (const note of notes) {
      if (t >= note.start) {
        const noteT = t - note.start;
        if (noteT < note.len) {
          const p = noteT / note.len;
          const env = Math.pow(1 - p, 1.5) * Math.min(1, noteT / 0.006);
          val += (Math.sin(2 * Math.PI * note.freq * noteT) * 0.75 + Math.sin(2 * Math.PI * note.freq * 2 * noteT) * 0.25) * env * 0.6;
        }
      }
    }
    samples[i] = val;
  }
  return samples;
}

// 9. TOGGLE: small mechanical/pixel click (~35ms)
function generateToggle() {
  const duration = 0.035;
  const totalSamples = Math.floor(SAMPLE_RATE * duration);
  const samples = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
    const t = i / SAMPLE_RATE;
    const progress = i / totalSamples;
    const env = Math.pow(1 - progress, 2.0);
    // Two quick micro pulses at t=0 and t=0.014s
    const pulse1 = Math.sin(2 * Math.PI * 720 * t) * Math.exp(-t * 200);
    const pulse2 = t > 0.014 ? Math.sin(2 * Math.PI * 920 * (t - 0.014)) * Math.exp(-(t - 0.014) * 200) : 0;
    samples[i] = (pulse1 + pulse2) * env * 0.65;
  }
  return samples;
}

const SFX_CONFIG = [
  { name: 'ui-click.wav', generator: generateUiClick },
  { name: 'character-select.wav', generator: generateCharacterSelect },
  { name: 'map-enter.wav', generator: generateMapEnter },
  { name: 'back.wav', generator: generateBack },
  { name: 'talk.wav', generator: generateTalk },
  { name: 'dialogue.wav', generator: generateDialogue },
  { name: 'destination-selected.wav', generator: generateDestinationSelected },
  { name: 'destination-reached.wav', generator: generateDestinationReached },
  { name: 'toggle.wav', generator: generateToggle },
];

console.log('Generating retro sound effect assets...');
for (const item of SFX_CONFIG) {
  const samples = item.generator();
  const buffer = createWavBuffer(samples);
  const filePath = path.join(audioDir, item.name);
  fs.writeFileSync(filePath, buffer);
  const kb = (buffer.length / 1024).toFixed(2);
  console.log(`✓ Created ${item.name} (${buffer.length} bytes, ~${kb} KB)`);
}

console.log('\nAll 9 audio assets successfully generated in assets/audio/ !');
