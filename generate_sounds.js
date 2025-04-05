// This script generates simple sound files for the Stick Hero game
const fs = require('fs');
const path = require('path');

// Create sounds directory if it doesn't exist
const soundsDir = path.join(__dirname, 'sounds');
if (!fs.existsSync(soundsDir)) {
    fs.mkdirSync(soundsDir);
}

// Function to create a simple WAV file
function createWavFile(filename, frequency, duration, volume = 0.5) {
    const sampleRate = 44100;
    const numSamples = Math.floor(sampleRate * duration);
    const data = new Float32Array(numSamples);
    
    // Generate a simple sine wave
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        data[i] = volume * Math.sin(2 * Math.PI * frequency * t);
        
        // Apply a simple envelope
        if (i < sampleRate * 0.1) {
            data[i] *= i / (sampleRate * 0.1); // Fade in
        } else if (i > numSamples - sampleRate * 0.1) {
            data[i] *= (numSamples - i) / (sampleRate * 0.1); // Fade out
        }
    }
    
    // Convert to 16-bit PCM
    const buffer = Buffer.alloc(44 + data.length * 2);
    
    // WAV header
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + data.length * 2, 4);
    buffer.write('WAVE', 8);
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write('data', 36);
    buffer.writeUInt32LE(data.length * 2, 40);
    
    // Write audio data
    for (let i = 0; i < data.length; i++) {
        buffer.writeInt16LE(Math.floor(data[i] * 32767), 44 + i * 2);
    }
    
    // Write to file
    fs.writeFileSync(path.join(soundsDir, filename), buffer);
    console.log(`Created ${filename}`);
}

// Generate sound files
createWavFile('stretch.wav', 220, 0.3, 0.3); // A3 note
createWavFile('fall.wav', 110, 0.5, 0.4);   // A2 note
createWavFile('perfect.wav', 440, 0.4, 0.5); // A4 note
createWavFile('gameover.wav', 220, 0.7, 0.5); // A3 note
createWavFile('coin.wav', 880, 0.2, 0.4);    // A5 note

console.log('All sound files generated successfully!'); 