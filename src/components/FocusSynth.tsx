import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, Download, Volume2, Music, Sparkles, Smile, RefreshCw, Layers } from "lucide-react";

// WAV encoder helper for client-side physical download of the loopable chimes track
function bufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArr = new ArrayBuffer(length);
  const view = new DataView(bufferArr);
  const channels: Float32Array[] = [];
  let i;
  let sample;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  // write WAV header
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // chunk length
  setUint16(1); // PCM format
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample

  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // chunk length

  for (i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  const iterations = buffer.length;
  for (offset = 0; offset < iterations; offset++) {
    for (i = 0; i < numOfChan; i++) {
      sample = channels[i][offset];
      if (sample > 1) sample = 1;
      else if (sample < -1) sample = -1;
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(pos, intSample, true);
      pos += 2;
    }
  }

  return new Blob([bufferArr], { type: "audio/wav" });
}

export function FocusSynth() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(112); // standard cute tempo
  const [volume, setVolume] = useState(0.2); // safe low default
  const [isExporting, setIsExporting] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  // track volumes
  const [bellsEnabled, setBellsEnabled] = useState(true);
  const [xyloEnabled, setXyloEnabled] = useState(true);
  const [ pluckEnabled, setPluckEnabled] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timerIdRef = useRef<number | null>(null);
  const nextNoteTimeRef = useRef<number>(0.0);
  const stepRef = useRef<number>(0);

  // Sound generator presets
  // Cheerful pentatonic melody loops
  // Beat index determines eighth notes: 0, 1, 2, 3, 4, 5, 6, 7 (Total 8 steps of 1/8 note)
  const steps = [
    { pitch: 587.33, altPitch: 261.63, tag: "E5" },  // Step 0: C4 Pluck + E5 Bell
    { pitch: 783.99, altPitch: 0, tag: "G5" },       // Step 1: G5 Xylophone
    { pitch: 880.00, altPitch: 0, tag: "A5" },       // Step 2: A5 Bell
    { pitch: 1046.50, altPitch: 329.63, tag: "C6" }, // Step 3: E4 Pluck + C6 Xylophone
    { pitch: 783.99, altPitch: 0, tag: "G5" },       // Step 4: G5 Bell
    { pitch: 659.25, altPitch: 0, tag: "E5" },       // Step 5: E5 Xylophone
    { pitch: 587.33, altPitch: 392.00, tag: "D5" },  // Step 6: G4 Pluck + D5 Bell
    { pitch: 523.25, altPitch: 0, tag: "C5" },       // Step 7: C5 Xylophone
  ];

  // Instrument sounds synthesis
  const playBells = (ctx: AudioContext, time: number, freq: number, v: number) => {
    if (!freq || v <= 0) return;
    // Additive bell synthesis (Metallic & clear chimes)
    const ratioList = [1.0, 2.0, 3.0, 4.2, 5.4];
    const ampList = [0.6, 0.3, 0.15, 0.08, 0.04];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, time);
    masterGain.gain.linearRampToValueAtTime(v * 0.45, time + 0.005);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, time + 1.2);

    ratioList.forEach((ratio, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * ratio, time);
      gain.gain.setValueAtTime(ampList[index], time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.8 / ratio);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(time);
      osc.stop(time + 1.3);
    });

    masterGain.connect(ctx.destination);
  };

  const playXylophone = (ctx: AudioContext, time: number, freq: number, v: number) => {
    if (!freq || v <= 0) return;
    // Xylophone has extremely short wood-like attack and quick damped decay
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = "sine";
    subOsc.frequency.setValueAtTime(freq * 3.0, time); // wooden overtone

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(v * 0.5, time + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.2, time);
    subGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

    osc.connect(gain);
    subOsc.connect(subGain);
    subGain.connect(gain);

    gain.connect(ctx.destination);

    osc.start(time);
    subOsc.start(time);
    
    osc.stop(time + 0.3);
    subOsc.stop(time + 0.3);
  };

  const playUkulelePluck = (ctx: AudioContext, time: number, freq: number, v: number) => {
    if (!freq || v <= 0) return;
    // Cozy organic pluck using a feedback decay structure
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    // Slight pitch bend down to simulate soft string release
    osc.frequency.setValueAtTime(freq + 15, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(v * 0.45, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.65);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.7);
  };

  // Scheduler mechanism runs at eighth notes
  const scheduleNextNote = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    const secondsPerBeat = 60.0 / tempo;
    const secondsPerEighth = secondsPerBeat / 2.0;

    const step = stepRef.current;
    const noteData = steps[step];
    const time = nextNoteTimeRef.current;

    // Trigger audio based on toggles
    if (step % 2 === 0 && pluckEnabled) {
      playUkulelePluck(ctx, time, noteData.altPitch, volume);
    }

    if (step % 2 === 0 && bellsEnabled) {
      playBells(ctx, time, noteData.pitch, volume);
    } else if (step % 2 !== 0 && xyloEnabled) {
      playXylophone(ctx, time, noteData.pitch, volume);
    }

    // Schedule visual state change safely with Web Audio timeline
    const currentStepIndex = step;
    const diff = time - ctx.currentTime;
    setTimeout(() => {
      if (isPlaying) {
        setActiveStep(currentStepIndex);
      }
    }, Math.max(0, diff * 1000));

    // advance timeline
    nextNoteTimeRef.current += secondsPerEighth;
    stepRef.current = (step + 1) % 8;
  };

  const schedulerLoop = () => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    // schedule notes that fall within next 100ms
    while (nextNoteTimeRef.current < ctx.currentTime + 0.1) {
      scheduleNextNote();
    }
    timerIdRef.current = requestAnimationFrame(schedulerLoop);
  };

  const startLoop = () => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx();
    }
    
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    stepRef.current = 0;
    setIsPlaying(true);
    
    // Start RAF loop
    timerIdRef.current = requestAnimationFrame(schedulerLoop);
  };

  const stopLoop = () => {
    setIsPlaying(false);
    setActiveStep(null);
    if (timerIdRef.current) {
      cancelAnimationFrame(timerIdRef.current);
      timerIdRef.current = null;
    }
  };

  // Safe cleanup
  useEffect(() => {
    return () => {
      if (timerIdRef.current) {
        cancelAnimationFrame(timerIdRef.current);
      }
    };
  }, []);

  // Offline Audio Context renderer to physically compile a pristine downloadable loop WAV file
  const handleExportLoop = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      const sampleRate = 44100;
      const secondsPerBeat = 60.0 / tempo;
      const secondsPerEighth = secondsPerBeat / 2.0;
      const totalDuration = secondsPerBeat * 4; // exact clean 1-measure loop

      const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      const offlineCtx = new OfflineCtx(2, sampleRate * totalDuration, sampleRate);

      // Trigger identical sequencer notes into the Offline context
      for (let s = 0; s < 8; s++) {
        const time = s * secondsPerEighth;
        const noteData = steps[s];

        if (s % 2 === 0 && pluckEnabled) {
          playUkulelePluck(offlineCtx as any, time, noteData.altPitch, volume);
        }
        if (s % 2 === 0 && bellsEnabled) {
          playBells(offlineCtx as any, time, noteData.pitch, volume);
        } else if (s % 2 !== 0 && xyloEnabled) {
          playXylophone(offlineCtx as any, time, noteData.pitch, volume);
        }
      }

      const renderedBuffer = await offlineCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);

      // Create physical download link
      const url = URL.createObjectURL(wavBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `baby_chimes_background_loop_${tempo}bpm.wav`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950/80 border border-slate-800/80 p-6 rounded-2xl shadow-2xl relative overflow-hidden transition-all duration-300">
      
      {/* Background Decorative Sparkle Nodes */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-20 pointer-events-none">
        <Sparkles className="h-4 w-4 text-emerald-400 animate-pulse" />
        <Smile className="h-4 w-4 text-teal-400" />
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400 shadow-inner">
            <Music className="h-4 w-5" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
              Focus Chime Sequencer <span className="text-[10px] text-emerald-400 font-bold font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-400/20 lowercase">loop ready</span>
            </h4>
            <p className="text-[10.5px] text-slate-400">
              Cozy background vibe to boost productivity. Clean start/end, ideal for Three.js.
            </p>
          </div>
        </div>

        {/* Action button triggers list */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={isPlaying ? stopLoop : startLoop}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              isPlaying 
                ? "bg-red-500 hover:bg-red-600 text-white" 
                : "bg-teal-400 hover:bg-teal-500 text-slate-950"
            }`}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            <span>{isPlaying ? "Pause Beat" : "Play Sound Vibe"}</span>
          </button>

          <button
            onClick={handleExportLoop}
            disabled={isExporting}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white transition-all flex items-center justify-center disabled:opacity-40"
            title="Download loopable WAV audio file"
          >
            {isExporting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Sequencer step matrix timeline block */}
      <div className="grid grid-cols-8 gap-2 mb-4 p-3 bg-slate-950 rounded-xl border border-slate-850">
        {steps.map((step, idx) => {
          const isActive = idx === activeStep;
          const isBeating = isPlaying && isActive;
          
          return (
            <div
              key={idx}
              className={`py-3.5 rounded-lg text-center flex flex-col justify-between font-mono transition-all duration-100 ${
                isBeating 
                  ? "bg-gradient-to-t from-teal-500/30 to-emerald-500/35 border-teal-400 ring-2 ring-teal-400/30" 
                  : isActive
                    ? "bg-slate-800/80 border-slate-700 text-slate-300"
                    : "bg-slate-900/40 border border-slate-850 text-slate-500"
              }`}
            >
              <span className="text-[9px] font-bold text-slate-400 tracking-tight block">0:{idx + 1}</span>
              <div className="h-1.5 w-1.5 rounded-full mx-auto my-1 bg-teal-400 opacity-80" />
              <span className={`text-[9px] font-extrabold uppercase ${isBeating ? "text-teal-300" : "text-slate-500"}`}>
                {step.tag}
              </span>
            </div>
          );
        })}
      </div>

      {/* Sequencer mix controls panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-400 bg-slate-950/40 p-4 rounded-xl border border-slate-900">
        
        {/* Track enable channel sliders */}
        <div className="space-y-2.5">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sequence Track Channels</span>
          
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={bellsEnabled} 
                onChange={(e) => setBellsEnabled(e.target.checked)}
                className="rounded border-slate-800 accent-teal-400 text-teal-500"
              />
              <span>🛎️ Cute Bells (Steps 1,3,5,7)</span>
            </label>
            <span className={bellsEnabled ? "text-teal-400 text-[10px]" : "text-slate-600 text-[10px]"}>
              {bellsEnabled ? "active" : "muted"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={xyloEnabled} 
                onChange={(e) => setXyloEnabled(e.target.checked)}
                className="rounded border-slate-800 accent-teal-400 text-teal-500"
              />
              <span>🪵 Soft Wood Xylophone</span>
            </label>
            <span className={xyloEnabled ? "text-teal-400 text-[10px]" : "text-slate-600 text-[10px]"}>
              {xyloEnabled ? "active" : "muted"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input 
                type="checkbox" 
                checked={pluckEnabled} 
                onChange={(e) => setPluckEnabled(e.target.checked)}
                className="rounded border-slate-800 accent-teal-400 text-teal-500"
              />
              <span>🪕 Ukulele Chord Pluck</span>
            </label>
            <span className={pluckEnabled ? "text-teal-400 text-[10px]" : "text-slate-600 text-[10px]"}>
              {pluckEnabled ? "active" : "muted"}
            </span>
          </div>

        </div>

        {/* Master parameters settings */}
        <div className="space-y-4">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Master Controller</span>
          
          {/* master volume meter slider */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
              <label className="flex items-center gap-1.5">
                <Volume2 className="h-3 w-3 text-slate-400" />
                <span>Gain Volume:</span>
              </label>
              <span className="font-bold text-white">{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.5"
              step="0.02"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>

          {/* tempo speed slider */}
          <div>
            <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1.5">
              <span>Sequencer Tempo speed:</span>
              <span className="font-bold text-teal-400">{tempo} BPM</span>
            </div>
            <input
              type="range"
              min="85"
              max="140"
              value={tempo}
              onChange={(e) => setTempo(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-teal-400"
            />
          </div>

        </div>

      </div>

    </div>
  );
}
