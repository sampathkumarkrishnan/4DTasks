import { describe, it, expect } from 'vitest';
import { resolveTimeHorizon, resolveTimeHorizonColor } from './resolveTimeHorizon';
import { TIME_HORIZON_CONFIG, DEFAULT_TIME_HORIZON } from '../constants/timeHorizon';

describe('resolveTimeHorizonColor', () => {
  it('returns Strategic color for enriched Task metadata', () => {
    const task = { metadata: { timeHorizon: 'strategic' } };
    expect(resolveTimeHorizonColor(task)).toBe(TIME_HORIZON_CONFIG.strategic.color);
  });

  it('returns Tactical color for explicit timeHorizon on payload', () => {
    const payload = { timeHorizon: 'tactical', title: 'Review PR' };
    expect(resolveTimeHorizonColor(payload)).toBe(TIME_HORIZON_CONFIG.tactical.color);
  });

  it('returns Exploration color parsed from notes metadata block', () => {
    const payload = {
      notes: 'Some notes\n---EISENHOWER_META---\n{"timeHorizon":"exploration"}',
    };
    expect(resolveTimeHorizonColor(payload)).toBe(TIME_HORIZON_CONFIG.exploration.color);
  });

  it('defaults to Ad-Hoc when horizon is missing everywhere', () => {
    expect(resolveTimeHorizonColor({})).toBe(TIME_HORIZON_CONFIG[DEFAULT_TIME_HORIZON].color);
    expect(resolveTimeHorizonColor(null)).toBe(TIME_HORIZON_CONFIG[DEFAULT_TIME_HORIZON].color);
  });

  it('prefers explicit timeHorizon field over notes metadata', () => {
    const payload = {
      timeHorizon: 'strategic',
      notes: '---EISENHOWER_META---\n{"timeHorizon":"tactical"}',
    };
    expect(resolveTimeHorizonColor(payload)).toBe(TIME_HORIZON_CONFIG.strategic.color);
  });
});

describe('resolveTimeHorizon', () => {
  it('returns tooltip label from TIME_HORIZON_CONFIG', () => {
    const result = resolveTimeHorizon({ timeHorizon: 'exploration' });
    expect(result.tooltipLabel).toBe('Exploration — Continuous');
  });
});
