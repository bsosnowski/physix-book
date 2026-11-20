# Content Roadmap — curriculum expansion (PL school physics)

> **STATUS: IMPLEMENTED** — all 11 chapters (7–17) shipped EN+PL with
> 10 new sims (charges, capacitor, circuit, joule-heating, magnet-field,
> motor, pulse, sound, spectrum, mirror, lens, eye — 12 total), the
> waves-chapter pulse extension, draggable-object framework support and
> the opt-in WebAudio Tone component. 176 unit + 41 E2E tests green.

Mapping the requested syllabus onto the existing book. Principle: **never
duplicate** — extend existing chapters where the topic overlaps, add new
chapters only for genuinely new physics. All new chapters ship EN + PL
with sims, guided experiments and exercises, per the authoring guides.

## Already covered (no new chapters needed)

| Syllabus topic            | Where it lives                          | Gap / action |
|---------------------------|-----------------------------------------|--------------|
| Drgania i fale → Drgania  | Ch. 4 *Oscillations / Drgania* (pendulum, spring, damping, phase portraits) | none — maybe add resonance teaser when waves chapter grows |
| Drgania i fale → Fale mechaniczne | Ch. 5 *Waves / Fale* (superposition, standing waves, interference) | extend with **traveling pulse** section + sim (see below) |

## Proposed new chapters

Order continues from 6. Suggested sequence groups the school blocks while
keeping mechanics → E&M → optics flow.

### Block A — Elektrostatyka (Electrostatics)

**Ch. 7 — Electric Charge & Field / Elektrostatyka: ładunek i pole**
Covers: *Elektryzowanie ciał*, *Przewodniki i izolatory*.
- Prose: charge conservation, triboelectric charging, induction vs
  conduction, conductors/insulators, polarization, Coulomb's law, field
  lines, field of point charges.
- **Sim `charges`** (new): 2–4 draggable point charges (+/−, magnitude
  slider); field-line/vector-grid rendering; a test charge you can release
  and watch accelerate along the field; equipotential toggle.
  Reuses the interference field-cache technique.
- Experiments: like charges repel; field at midpoint of a dipole;
  why field lines never cross; conductor interior E = 0 (prose + figure).

**Ch. 8 — Voltage & Capacitance / Napięcie elektryczne**
Covers: *Napięcie elektryczne*.
- Prose: potential as energy per charge, V = W/q, uniform field V = Ed,
  equipotentials ⊥ field lines, electronvolt, capacitors (C = Q/V).
- **Sim `capacitor`** (new): parallel plates with battery voltage slider,
  plate separation, dielectric toggle; field strength readout, stored
  energy, test-charge energy bookkeeping; optional RC charge/discharge
  curve (bridge to next chapter).
- Experiments: double d at fixed V → E halves; energy vs V²; why a
  bird on a wire is safe (same potential).

### Block B — Prąd elektryczny stały (DC circuits)

**Ch. 9 — Current, Resistance & Ohm's Law / Prąd elektryczny i prawo Ohma**
Covers: *Prąd elektryczny*, *Opór elektryczny, prawo Ohma*.
- Prose: I = ΔQ/Δt, drift velocity, R = ρL/A, Ohm's law, series/parallel,
  Kirchhoff's laws (intuition first).
- **Sim `circuit`** (new): battery + up to 3 resistors, series/parallel
  toggle; animated charge carriers (speed ∝ I), live I/V/R readouts per
  element, V–I characteristic plot; wire resistivity/length/area sliders
  feeding R = ρL/A.
- Experiments: series doubles R, parallel halves it; plot V–I for ohmic
  vs (fixed-curve) filament lamp; short circuit → carrier speed explodes.

**Ch. 10 — Work & Power of Current / Praca i moc prądu**
Covers: *Praca i moc prądu*.
- Prose: W = VIt, P = VI = I²R = V²/R, Joule heating, kWh and the
  electricity bill, efficiency.
- **Sim `joule-heating`** (new): resistor immersed in water; V/R sliders,
  animated thermometer + temperature-time plot, energy counter in J and
  kWh, cost readout (locale currency).
- Experiments: doubling V quadruples heating; compute the cost of
  boiling 1 L of water; why transmission lines use high voltage.

### Block C — Magnetyzm (Magnetism)

**Ch. 11 — Magnets & Magnetic Fields / Magnesy i pole magnetyczne**
Covers: *Magnesy*.
- Prose: poles, field of a bar magnet, Earth's field, compasses,
  ferromagnetism domains, field of a straight current-carrying wire
  (Oersted), right-hand rule.
- **Sim `magnet-field`** (new): draggable bar magnet + grid of compass
  needles aligning to the field; toggle a straight wire (current slider,
  direction switch) to see circular field lines; iron-filing texture mode.
- Experiments: compass map around a dipole; reverse current → needles
  flip; double current → same pattern, stronger field (needle stiffness).

**Ch. 12 — Electromagnets & the Electric Motor / Elektromagnesy i silnik elektryczny**
Covers: *Elektromagnesy*, *Silnik elektryczny*.
- Prose: solenoid field B ∝ nI, core amplification, force on a current
  in a field (F = BIL), Lorentz force intuition, commutator, motor anatomy.
- **Sim `motor`** (new): cross-section of a DC motor — coil in a magnet
  gap; sliders: voltage, B, turns N; animated rotation with commutator
  switching, torque arrow, rpm + back-EMF readouts, ω(t) plot.
  Second mode: electromagnet lifting paperclips (count ∝ nI).
- Experiments: reverse polarity → reverse spin; why the commutator is
  needed (disable it → coil oscillates and stalls); torque vs N.

### Block D — Drgania i fale (extensions, not duplicates)

**Ch. 5 extension — traveling pulses** (edit existing *Waves/Fale*)
- New section + **sim `pulse`**: Gaussian pulse on a string, reflection
  at fixed/free end (inverted vs upright), transmission into a heavier
  string; speed sliders per segment. 1D wave-equation solver (FDTD),
  unit-tested against d'Alembert.

**Ch. 13 — Sound / Dźwięk**
Covers: *Dźwięk*.
- Prose: longitudinal waves, pressure vs displacement, speed in media,
  frequency ↔ pitch, amplitude ↔ loudness, dB scale, beats, Doppler.
- **Sim `sound`** (new): speaker + air-particle density animation
  (longitudinal!), f/A sliders, **optional WebAudio tone** (mute by
  default, user-gesture gated); second source for **beats** (Δf slider,
  envelope plot); moving-source **Doppler** mode with wavefront bunching.
- Experiments: beat frequency = |f₁−f₂| (hear it!); approaching source →
  compressed fronts; why sound is faster in steel than air (table).

**Ch. 14 — The EM Spectrum / Przegląd fal elektromagnetycznych**
Covers: *Przegląd fal elektromagnetycznych*.
- Prose: light as EM wave, c = λf, one spectrum from radio to gamma,
  photon energy E = hf, ionizing vs non-ionizing, everyday uses.
- **Sim `spectrum`** (new): interactive logarithmic spectrum bar — drag
  a marker across 20 decades; live λ/f/E readouts, animated transverse
  E/B wave whose drawn wavelength scales, info cards per band (uses,
  dangers); "zoom into visible" rainbow sub-band.
- Experiments: find f of your Wi-Fi (2.4 GHz); which bands fit a
  human-sized antenna; why UV burns but radio doesn't (E per photon).

### Block E — Optyka (Optics)

**Ch. 15 — Reflection & Mirrors / Odbicie światła i zwierciadła**
Covers: *Odbicie światła*, *Zwierciadła kuliste*.
- Prose: law of reflection, specular vs diffuse, plane-mirror images,
  concave/convex mirrors, focal point f = R/2, mirror equation,
  magnification, real vs virtual images.
- **Sim `mirrors`** (new): optical bench — draggable object arrow,
  mirror-type toggle (plane/concave/convex), f slider; live principal-ray
  construction (3 rays), image arrow + readouts (dᵢ, m, real/virtual),
  "screen" you can place to catch a real image.
- Experiments: object inside f → virtual upright image; at f → no image
  (rays parallel); convex always shrinks (car side mirror).

**Ch. 16 — Refraction & Lenses / Załamanie światła i soczewki**
Covers: *Załamanie światła*, *Soczewki*.
- Prose: Snell's law, index of refraction, total internal reflection &
  critical angle, fiber optics, thin-lens equation, lens power (diopters),
  converging/diverging lenses.
- **Sim `refraction`** (new): two media with n₁/n₂ sliders, draggable
  incident ray; live angles, refracted + partial reflected ray, TIR
  beyond critical angle with angle readout.
- **Sim `lenses`** (new): same optical-bench framework as `mirrors`
  (shared view code), lens toggle ±f, ray construction, image readouts.
- Experiments: find the critical angle of water (≈48.8°); diamond
  sparkle (n = 2.42); cover half the lens — does half the image vanish?
  (no — it dims).

**Ch. 17 — The Eye & Vision / Widzenie**
Covers: *Widzenie*.
- Prose: eye as a lens system, accommodation, retina, myopia/hyperopia
  and their correction, glasses in diopters, blind spot, persistence of
  vision.
- **Sim `eye`** (new): eyeball cross-section — object distance slider,
  lens power slider (accommodation), focus point vs retina indicator;
  myopia/hyperopia presets + corrective-lens slider that re-focuses the
  image onto the retina; blur circle visualization.
- Experiments: near point recedes with age (preset); prescribe the right
  diopters for a −2 cm eyeball mismatch; why squinting helps (aperture).

## Summary

- **11 new chapters** (7–17), **2 extensions** (waves pulse; oscillations
  resonance teaser), **0 duplicates** — Drgania and Fale mechaniczne stay
  in ch. 4–5.
- **12 new sims**: charges, capacitor, circuit, joule-heating,
  magnet-field, motor, pulse, sound, spectrum, mirrors, refraction+eye
  (lenses shares the mirrors bench framework → ~10 distinct codebases).
- Framework needs (small, all backwards-compatible):
  1. **Draggable canvas objects** (charges, rays, magnets) — pointer-event
     layer in the widget mapping screen→world coords into model state.
  2. **WebAudio hook** for the sound sim (opt-in, user-gesture gated).
  3. Shared **optical-bench view** for mirrors/lenses/eye.
- Suggested build order (value/effort): `circuit` + Ohm (ch. 9) →
  `refraction`/`lenses` (ch. 16) → `charges` (ch. 7) → `sound` (ch. 13) →
  `mirrors` (ch. 15) → `motor` (ch. 12) → remaining.
- Every chapter follows the existing contract: EN source + PL translation
  with sourceHash, sims with unit-tested models, presets, i18n keys,
  guided experiments, ≥1 exercise with solution, E2E smoke coverage.
