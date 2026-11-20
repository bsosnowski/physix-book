import { describe, expect, it } from "vitest";
import { BANDS, bandAt, photonEnergy, spectrumModel, visibleColor, wavelength, type SpectrumParams } from "./model";
import { defaultParams } from "../../framework/types";

function params(over: Partial<SpectrumParams> = {}): SpectrumParams {
  return { ...defaultParams(spectrumModel), ...over } as SpectrumParams;
}

describe("spectrumModel", () => {
  it("c = λf: FM 100 MHz → 3 m", () => {
    expect(wavelength(8)).toBeCloseTo(3, 6);
  });

  it("Wi-Fi 2.4 GHz → 12.5 cm", () => {
    expect(wavelength(Math.log10(2.4e9))).toBeCloseTo(0.125, 3);
  });

  it("green light ~550 nm, photon ~2.25 eV", () => {
    const lg = Math.log10(5.45e14);
    expect(wavelength(lg) * 1e9).toBeCloseTo(550, 0);
    expect(photonEnergy(lg)).toBeCloseTo(2.26, 1);
  });

  it("X-rays are ionizing (>10 eV), radio is not", () => {
    const p = params({ logf: 18 });
    expect(spectrumModel.readout(spectrumModel.init(p), p).ionizing).toBe(1);
    const r = params({ logf: 8 });
    expect(spectrumModel.readout(spectrumModel.init(r), r).ionizing).toBe(0);
  });

  it("bands tile the range without gaps", () => {
    for (let i = 1; i < BANDS.length; i++) {
      expect(BANDS[i].minLog).toBe(BANDS[i - 1].maxLog);
    }
    expect(bandAt(8).id).toBe("radio");
    expect(bandAt(14.48).id).toBe("visible");
    expect(bandAt(20).id).toBe("gamma");
  });

  it("visibleColor only inside the visible band", () => {
    expect(visibleColor(14.48)).not.toBeNull();
    expect(visibleColor(8)).toBeNull();
    expect(visibleColor(18)).toBeNull();
  });

  it("dragging maps x∈[0,1] onto the log range", () => {
    let s = spectrumModel.init(params());
    s = spectrumModel.pointer!(s, 0.5, -1, "down");
    expect(s.logf).toBeCloseTo((3 + 22) / 2, 6);
    s = spectrumModel.pointer!(s, 2, -1, "move"); // clamps
    expect(s.logf).toBe(22);
    s = spectrumModel.pointer!(s, 2, -1, "up");
    expect(s.dragging).toBe(false);
  });
});
