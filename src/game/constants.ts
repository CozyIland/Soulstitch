// Namen, die in den Daten vorkommen dürfen. Die Tests prüfen die JSON-Dateien dagegen.
export const ATTACK_NAMES = [
  'aimed', 'fan', 'ring', 'spiral', 'flower', 'accRing', 'charge', 'slam', 'tpRing',
  'beam', 'rain', 'wall', 'homing', 'mines', 'orbit', 'boom', 'split', 'bouncer',
] as const;
export type AttackName = (typeof ATTACK_NAMES)[number];

/** Bewegungsarten. walk/right/center = am Boden, die übrigen fliegen. */
export const MOVES = ['walk', 'right', 'center', 'air', 'orbit', 'strafe', 'bounce', 'hover', 'tele'] as const;
export type MoveName = (typeof MOVES)[number];
export const GROUND_MOVES: readonly MoveName[] = ['walk', 'right', 'center'];

export const SHAPE_NAMES = ['beast', 'skull', 'eye', 'knight', 'blob', 'flower', 'god'] as const;
export type ShapeName = (typeof SHAPE_NAMES)[number];
