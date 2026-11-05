import type { Kind } from './store';

export type InteractableEffect = 'look' | 'touch' | 'sit' | 'hop' | 'use-for-a-while';
export type InteractableActivity = 'Sleep' | 'Read' | 'Plant' | 'Sit' | 'Light' | 'Admire' | 'Look' | 'Touch' | 'Hop' | 'Use';

export type Interactable = {
  id: string;
  label: string;
  roomId: string;
  standSpot: [number, number];
  standCandidates: [number, number][];
  facingPoint: [number, number, number];
  effectKind: InteractableEffect;
  activity: InteractableActivity;
  source: 'furniture' | 'prop';
  furnitureKind?: Kind;
};
