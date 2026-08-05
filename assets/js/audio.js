/**
 * Modul Audio untuk GARNETA STORE
 * Diambil dari Micro-POS-Master untuk sensasi kasir fisik
 */
let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  return audioCtx;
}

window.playBeep = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    // Frekuensi beep kasir yang renyah (High pitch)
    osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.05); // Meluncur ke A6
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch(e) {
    console.warn('Audio BEEP failed', e);
  }
}

window.playChaChing = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const playNote = (freq, startTime, duration, vol = 0.05) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square'; // Karakter suara 8-bit / digital keras
      
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(vol, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = ctx.currentTime;
    
    // Arpeggio cepat yang berkesan "sukses" / koin jatuh
    playNote(523.25, now, 0.15, 0.05);        // C5
    playNote(659.25, now + 0.05, 0.15, 0.05); // E5
    playNote(783.99, now + 0.1, 0.2, 0.05);   // G5
    playNote(1046.50, now + 0.15, 0.4, 0.07); // C6 (agak keras)
    
  } catch(e) {
    console.warn('Audio CHA-CHING failed', e);
  }
}
