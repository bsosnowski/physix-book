import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

/**
 * Opt-in audible tones (WebAudio). Created only on user click — never
 * autoplays. Two oscillators make beats actually audible.
 */
export function Tone({ f1 = 300, f2 = 0 }: { f1?: number; f2?: number }) {
  const { t } = useTranslation();
  const [on, setOn] = useState(false);
  const [freq1, setFreq1] = useState(f1);
  const [freq2, setFreq2] = useState(f2);
  const ctxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode[]>([]);
  const gainRef = useRef<GainNode | null>(null);

  const stop = () => {
    oscRef.current.forEach((o) => {
      try { o.stop(); } catch { /* already stopped */ }
    });
    oscRef.current = [];
    void ctxRef.current?.close();
    ctxRef.current = null;
    setOn(false);
  };

  const start = () => {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.06; // gentle
    gain.connect(ctx.destination);
    const oscs = [freq1, ...(freq2 > 0 ? [freq2] : [])].map((f) => {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      o.connect(gain);
      o.start();
      return o;
    });
    ctxRef.current = ctx;
    gainRef.current = gain;
    oscRef.current = oscs;
    setOn(true);
  };

  // live frequency updates
  useEffect(() => {
    if (oscRef.current[0]) oscRef.current[0].frequency.value = freq1;
    if (oscRef.current[1] && freq2 > 0) oscRef.current[1].frequency.value = freq2;
  }, [freq1, freq2]);

  // cleanup on unmount
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="my-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 p-3 font-sans text-sm dark:border-zinc-800">
      <button
        onClick={on ? stop : start}
        className="rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-500"
      >
        {on ? `🔇 ${t("tone.stop")}` : `🔊 ${t("tone.play")}`}
      </button>
      <label className="flex items-center gap-2">
        f₁
        <input
          type="range" min={100} max={800} step={5} value={freq1}
          onChange={(e) => setFreq1(Number(e.target.value))}
          className="accent-emerald-600"
        />
        <span className="w-14 font-mono text-xs tabular-nums">{freq1} Hz</span>
      </label>
      <label className="flex items-center gap-2">
        f₂
        <input
          type="range" min={0} max={800} step={5} value={freq2}
          onChange={(e) => setFreq2(Number(e.target.value))}
          className="accent-emerald-600"
        />
        <span className="w-14 font-mono text-xs tabular-nums">
          {freq2 > 0 ? `${freq2} Hz` : "off"}
        </span>
      </label>
      <span className="text-xs text-zinc-400">{t("tone.hint")}</span>
    </div>
  );
}
