export interface FoleyAssetPool {
  pool_selection: "stochastic_random_no_repeat" | "sequential_round_robin";
  choke_group: number;
  volumeRangeDb: [number, number];
  pitchRandomCents: [number, number];
  assets: string[];
}

export interface FoleySystemConfig {
  global: {
    crossfadeMs: number;
    maxPolyphony: number;
  };
  stochastic_parameters: {
    humanization_variance: {
      pitch_drift_cents_max: number;
      gain_drift_db_max: number;
      sample_start_offset_ms_max: number;
    };
  };
  foley_matrix: Record<string, FoleyAssetPool>;
  idle_presence_engine: {
    enabled: boolean;
    minimum_interval_seconds: number;
    maximum_interval_seconds: number;
    presence_pool: string[];
  };
}

export const VOXPACK_FOLEY_CONFIG: FoleySystemConfig = {
  global: {
    crossfadeMs: 15,
    maxPolyphony: 6,
  },
  stochastic_parameters: {
    humanization_variance: {
      pitch_drift_cents_max: 35,
      gain_drift_db_max: 2.0,
      sample_start_offset_ms_max: 12
    }
  },
  foley_matrix: {
    "<saliva-click>": {
      pool_selection: "stochastic_random_no_repeat",
      choke_group: 1,
      volumeRangeDb: [-3.0, -0.5],
      pitchRandomCents: [-40, 40],
      assets: [
        "audio/actors/foley/mouth_clicks/wet_close_click_01.wav",
        "audio/actors/foley/mouth_clicks/wet_close_click_02.wav",
        "audio/actors/foley/mouth_clicks/wet_close_click_03.wav",
        "audio/actors/foley/mouth_clicks/wet_close_click_04.wav"
      ]
    },
    "<gasp-choke>": {
      pool_selection: "sequential_round_robin",
      choke_group: 2,
      volumeRangeDb: [-1.0, 0.0],
      pitchRandomCents: [-35, 35],
      assets: [
        "audio/actors/foley/throat_shocks/choke_intake_heavy_01.wav",
        "audio/actors/foley/throat_shocks/choke_intake_heavy_02.wav"
      ]
    },
    "<pant-shallow>": {
      pool_selection: "stochastic_random_no_repeat",
      choke_group: 3,
      volumeRangeDb: [-2.5, -0.5],
      pitchRandomCents: [-35, 35],
      assets: [
        "audio/actors/foley/breath_loops/intimate_pant_loop_01.wav",
        "audio/actors/foley/breath_loops/intimate_pant_loop_02.wav",
        "audio/actors/foley/breath_loops/intimate_pant_loop_03.wav"
      ]
    }
  },
  idle_presence_engine: {
    enabled: true,
    minimum_interval_seconds: 4.5,
    maximum_interval_seconds: 12.0,
    presence_pool: [
      "audio/actors/foley/ambient/clothing_rustle_lean_forward.wav",
      "audio/actors/foley/ambient/clothing_rustle_shift_weight.wav",
      "audio/actors/foley/ambient/subtle_nose_exhale_quiet.wav"
    ]
  }
};
