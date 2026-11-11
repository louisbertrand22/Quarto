/**
 * Classement Elo des parties en ligne.
 * Coefficient K plus fort pendant les premières parties pour placer vite un nouveau joueur.
 */

export const DEFAULT_ELO = 1200;
const PROVISIONAL_GAMES = 10;

const kFactor = (ratedGames: number) => (ratedGames < PROVISIONAL_GAMES ? 40 : 20);

/** Probabilité de victoire attendue de A contre B. */
export const expectedScore = (ratingA: number, ratingB: number) => 1 / (1 + 10 ** ((ratingB - ratingA) / 400));

/**
 * Variation de classement d'un joueur.
 * @param score 1 = victoire, 0.5 = nul, 0 = défaite
 */
export const eloDelta = (rating: number, opponentRating: number, score: number, ratedGames: number): number =>
  Math.round(kFactor(ratedGames) * (score - expectedScore(rating, opponentRating)));
