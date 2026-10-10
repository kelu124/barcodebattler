// Human-readable names for card fields. Special descriptions are our own
// wording of the effects the engine implements (see bb-game-rules).

export const RACE_SHORT = ['MECH', 'ANIMAL', 'AQUA', 'BIRD', 'HUMAN', 'WEAPON*', 'WEAPON', 'ARMOUR*', 'ARMOUR', 'POWER-UP'];
const JOB_TARGET = ['job 0', 'job 1', 'job 2', 'job 3', 'job 4', 'job 5', 'job 6', 'job 7', 'job 8', 'job 9'];
const RACE_TARGET = ['Mechanical', 'Animal', 'Aquatic', 'Bird', 'Human'];

export function jobLabel(card) {
  if (card.kind === 'powerup') return POWERUP[card.job] ?? '';
  if (card.kind !== 'fighter') return '';
  return card.job > 6 ? `Wizard ${card.job}` : `Warrior ${card.job}`;
}

const POWERUP = ['HP up', 'HP up', 'HP up', 'HP up', 'HP up', 'Info card', 'Info card', 'Herbs up', 'MP up', 'MP up'];

export function specialLabel(s) {
  if (!s) return 'None';
  if (s >= 1 && s <= 10) return `×3 damage vs ${JOB_TARGET[s % 10]}`;
  if (s >= 11 && s <= 15) return `×3 damage vs ${RACE_TARGET[s % 5]}`;
  return SPECIALS[s] ?? `Special ${s}`;
}

const SPECIALS = {
  16: 'Half damage', 17: '×1.5 damage', 18: '×2 damage (hero)',
  20: 'Takes 90% damage', 21: 'Takes 70% damage', 22: 'Takes 50% damage',
  23: 'Enemy ST -30%', 24: 'Enemy ST -50%', 25: 'Enemy DF -30%', 26: 'Enemy DF -50%', 27: 'Enemy DF -80%',
  28: 'Enemy HP -30%', 29: 'Enemy HP -50%',
  30: 'Unstable HP item', 31: 'Unstable weapon', 32: 'Unstable armour',
  37: 'Always strikes first', 38: 'Accuracy up', 39: 'Accuracy down', 40: 'Enemy accuracy up', 41: 'Enemy accuracy down',
  43: 'Halves enemy healing', 44: 'Doubles own healing', 45: 'Cancels enemy specials',
  50: 'Hero',
};

export const ERRORS = {
  digits: 'Digits only, please.',
  length: 'Barcodes have 13 or 8 digits.',
  checksum: 'Check digit wrong — mistyped?',
  'item-first': 'First card must be a fighter.',
  'not-hero': 'This mode needs a hero card.',
  'hero-too-strong': 'Hero cards over 6000/2000/2000 are refused.',
  'same-card': 'Same card twice — cannot combine.',
  'info-card': 'Info cards only work in story mode.',
  'warrior-mp': 'Warriors cannot use MP-up cards.',
  'wizard-equipment': 'Wizards cannot use weapons or armour.',
  'need-warrior': 'A warrior is needed here.',
  'need-magician': 'A wizard is needed here.',
  'herbs-blocked': 'Herbs are sealed!',
  'no-herbs': 'No herbs left.',
  'not-wizard': 'Only wizards cast magic.',
  'not-enough-mp': 'Not enough MP.',
};
