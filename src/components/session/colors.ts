// Active Session screen design tokens (UX-DR6, UX-DR7). Fixed dark palette,
// independent of the app's light/dark theme system — the mockup at
// _bmad-output/planning-artifacts/ux-design-directions.html is the source
// of these exact values. Amber (alert) is reserved exclusively for
// target-raise feedback (Story 2.3+), not used in Story 2.1.
export const SessionColors = {
  background: '#121212',
  correct: '#2ecc71',
  correctIcon: '#0a2c14',
  incorrect: '#e74c3c',
  incorrectPulse: '#f08a7c', // brightened tint for the mild-tier pulse (Story 2.3)
  incorrectIcon: '#3a0d08',
  alert: '#f1c40f',
  textStrong: '#e8e8e8',
  textNeutral: '#b0b0b0',
  restartBackground: '#2a2a2a',
  restartText: '#a0a0a0', // 5.5:1 against restartBackground — was #8a8a8a at ~4.2:1, below AA's 4.5:1 floor
} as const;
