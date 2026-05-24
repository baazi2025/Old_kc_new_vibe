import { useCallback, useRef, useState } from "react";

export type RecordingState = "idle" | "recording" | "stopping";

export function useVoiceRecorder() {
  const [state, setState] = useState<RecordingState>("idle");
  const [level, setLevel] = useState(0); // 0..1 live mic level
  const [elapsedMs, setElapsedMs] = useState(0);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const startedAtRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => {});
    }
    audioCtxRef.current = null;
    analyserRef.current = null;
    setLevel(0);
  }, []);

  const start = useCallback(async () => {
    if (state !== "idle") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start(100);
      mediaRef.current = rec;
      startedAtRef.current = Date.now();
      setElapsedMs(0);
      setState("recording");

      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      audioCtxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      src.connect(analyser);
      analyserRef.current = analyser;
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        setLevel(Math.min(1, Math.sqrt(sum / buf.length) * 2.5));
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();

      tickRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startedAtRef.current);
      }, 100);

      if (navigator.vibrate) navigator.vibrate(15);
    } catch (e) {
      cleanup();
      setState("idle");
      throw e;
    }
  }, [state, cleanup]);

  const stop = useCallback(async (): Promise<{ blob: Blob; durationMs: number } | null> => {
    const rec = mediaRef.current;
    if (!rec || state !== "recording") { cleanup(); setState("idle"); return null; }
    setState("stopping");
    const durationMs = Date.now() - startedAtRef.current;
    return new Promise((resolve) => {
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
        cleanup();
        mediaRef.current = null;
        setState("idle");
        setElapsedMs(0);
        resolve({ blob, durationMs });
      };
      rec.stop();
    });
  }, [state, cleanup]);

  const cancel = useCallback(() => {
    const rec = mediaRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      try { rec.stop(); } catch {}
    }
    cleanup();
    mediaRef.current = null;
    setState("idle");
    setElapsedMs(0);
  }, [cleanup]);

  return { state, level, elapsedMs, start, stop, cancel };
}
