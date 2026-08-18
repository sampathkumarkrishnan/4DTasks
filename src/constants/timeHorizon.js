export const TIME_HORIZONS = {
  strategic: 'strategic',
  tactical: 'tactical',
  adhoc: 'adhoc',
  exploration: 'exploration',
};

export const DEFAULT_TIME_HORIZON = TIME_HORIZONS.adhoc;

export const TIME_HORIZON_ORDER = [
  TIME_HORIZONS.strategic,
  TIME_HORIZONS.tactical,
  TIME_HORIZONS.adhoc,
  TIME_HORIZONS.exploration,
];

export const TIME_HORIZON_CONFIG = {
  strategic: {
    id: 'strategic',
    title: 'Strategic',
    subtitle: 'Weeks / Months',
    color: '#5268C4',
  },
  tactical: {
    id: 'tactical',
    title: 'Tactical',
    subtitle: 'Days / Weeks',
    color: '#2D9172',
  },
  adhoc: {
    id: 'adhoc',
    title: 'Ad-Hoc',
    subtitle: 'Hours / Today',
    color: '#B8842A',
  },
  exploration: {
    id: 'exploration',
    title: 'Exploration',
    subtitle: 'Continuous',
    color: '#B85A68',
  },
};
