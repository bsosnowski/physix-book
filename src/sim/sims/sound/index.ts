import type { SimModule } from "../../framework/types";
import type { SimAudio } from "../../framework/audio";
import { soundModel, LISTENER_X, type SoundParams, type SoundState } from "./model";
import { soundView } from "./view";

/**
 * Audible layer: real frequencies (the animation is slowed, ears are not).
 * - one/two voices → pure tone / audible beats at |f1−f2|
 * - Doppler mode → single voice at the frequency the listener actually
 *   hears: f₀/(1 ∓ β) while the source approaches/recedes.
 */
const audio: SimAudio<SoundState> = {
  voices(s: SoundState) {
    if (s.doppler > 0) {
      const approaching = s.srcX < LISTENER_X;
      const heard = approaching ? s.f1 / (1 - s.doppler) : s.f1 / (1 + s.doppler);
      return [{ freq: heard, gain: s.A }];
    }
    const voices = [{ freq: s.f1, gain: s.A * 0.7 }];
    if (s.f2 > 0) voices.push({ freq: s.f2, gain: s.A * 0.7 });
    return voices;
  },
};

const sound: SimModule<SoundParams, SoundState> = {
  id: "sound",
  titleKey: "sound.title",
  model: soundModel,
  view: soundView,
  audio,
};

export default sound;
