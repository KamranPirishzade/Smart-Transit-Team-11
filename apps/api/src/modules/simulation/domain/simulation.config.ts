/** Tunables of the mock vehicle simulation. Values are calibrated on the AYNA/BakuBus data. */
export interface SimulationConfig {
  /** Local (Baku) peak windows, minutes of day [start, end). */
  peakWindows: readonly (readonly [number, number])[];
  /** Headway multiplier during peaks (< 1 → more frequent). */
  peakHeadwayFactor: number;
  /** Speed multiplier during peaks (traffic). */
  peakSpeedFactor: number;
  /** Headway when a route has no BakuBus demand data. */
  defaultHeadwayMin: number;
  minHeadwayMin: number;
  maxHeadwayMin: number;
  /** Average passengers carried per run, used to turn daily demand into runs. */
  passengersPerRun: number;
  /** Hours of service per day over which runs are spread. */
  serviceHours: number;
  /** Fallback when durationMin is unusable. */
  defaultSpeedKmh: number;
  minSpeedKmh: number;
  maxSpeedKmh: number;
}

const hm = (h: number, m: number): number => h * 60 + m;

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  peakWindows: [
    [hm(7, 30), hm(9, 30)],
    [hm(17, 30), hm(19, 30)],
  ],
  peakHeadwayFactor: 0.7,
  peakSpeedFactor: 0.7,
  defaultHeadwayMin: 15,
  minHeadwayMin: 4,
  maxHeadwayMin: 20,
  passengersPerRun: 50,
  serviceHours: 17,
  defaultSpeedKmh: 18,
  minSpeedKmh: 10,
  maxSpeedKmh: 30,
};
