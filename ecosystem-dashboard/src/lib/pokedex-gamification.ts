/**
 * Pokedex Gamification Service
 *
 * Manages per-child Pokemon learning data in Postgres (ecosystem_unified):
 * - Pokedex completion tracking (seen/caught/favorite)
 * - Quiz results & scoring
 * - Type matchup trainer progress
 * - Daily Pokemon
 * - TCG card collection
 * - Flashcard progress (Leitner system)
 * - Aggregate stats
 */

import { Pool } from 'pg';

export interface PokedexEntry {
  pokemon_id: number;
  pokemon_name: string;
  pokedex_number: number;
  status: 'seen' | 'caught' | 'favorite';
  favorite: boolean;
  caught_at: string | null;
  notes?: string;
}

export interface QuizResult {
  id: string;
  quiz_type: string;
  question: string;
  correct_answer: string;
  user_answer: string | null;
  is_correct: boolean;
  pokemon_id?: number;
  difficulty: string;
  points_earned: number;
  answered_at: string;
}

export interface PokedexCompletion {
  seen_count: number;
  caught_count: number;
  favorite_count: number;
  total_pokemon: number;
  completion_pct: number;
}

export interface PokemonStats {
  total_seen: number;
  total_caught: number;
  total_favorites: number;
  total_quiz_correct: number;
  total_quiz_attempts: number;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
}

export interface FlashcardProgress {
  card_type: string;
  card_key: string;
  times_shown: number;
  times_correct: number;
  box_number: number;
  next_review_at: string;
}

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString =
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL ||
      'postgresql://postgres:postgres@localhost:5432/ecosystem_unified';
    pool = new Pool({ connectionString });
  }
  return pool;
}

export const pokedexGamificationService = {
  // ─── Pokedex Tracking ─────────────────────────────────────────────────────

  async markSeen(childUserId: string, pokemonId: number, pokemonName: string, pokedexNumber: number): Promise<void> {
    await getPool().query(
      `INSERT INTO child_pokedex_entries (child_user_id, pokemon_id, pokemon_name, pokedex_number, status)
       VALUES ($1, $2, $3, $4, 'seen')
       ON CONFLICT (child_user_id, pokemon_id)
       DO UPDATE SET updated_at = NOW()`,
      [childUserId, pokemonId, pokemonName, pokedexNumber]
    );
    await this.updateStats(childUserId);
  },

  async markCaught(childUserId: string, pokemonId: number, pokemonName: string, pokedexNumber: number): Promise<void> {
    await getPool().query(
      `INSERT INTO child_pokedex_entries (child_user_id, pokemon_id, pokemon_name, pokedex_number, status, caught_at)
       VALUES ($1, $2, $3, $4, 'caught', NOW())
       ON CONFLICT (child_user_id, pokemon_id)
       DO UPDATE SET status = 'caught', caught_at = COALESCE(child_pokedex_entries.caught_at, NOW()), updated_at = NOW()`,
      [childUserId, pokemonId, pokemonName, pokedexNumber]
    );
    await this.updateStats(childUserId);
  },

  async toggleFavorite(childUserId: string, pokemonId: number): Promise<boolean> {
    const result = await getPool().query(
      `UPDATE child_pokedex_entries
       SET favorite = NOT favorite, updated_at = NOW()
       WHERE child_user_id = $1 AND pokemon_id = $2
       RETURNING favorite`,
      [childUserId, pokemonId]
    );
    await this.updateStats(childUserId);
    return result.rows[0]?.favorite ?? false;
  },

  async getPokedexEntries(childUserId: string, status?: string, limit = 100, offset = 0): Promise<PokedexEntry[]> {
    const params: unknown[] = [childUserId];
    let where = 'WHERE child_user_id = $1';
    if (status) {
      params.push(status);
      where += ` AND status = $${params.length}`;
    }
    params.push(limit, offset);
    const result = await getPool().query(
      `SELECT pokemon_id, pokemon_name, pokedex_number, status, favorite, caught_at, notes
       FROM child_pokedex_entries
       ${where}
       ORDER BY pokedex_number
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    return result.rows;
  },

  async getPokedexCompletion(childUserId: string): Promise<PokedexCompletion> {
    const result = await getPool().query(
      'SELECT * FROM v_child_pokedex_completion WHERE child_user_id = $1',
      [childUserId]
    );
    if (result.rows[0]) {
      return {
        seen_count: Number(result.rows[0].seen_count),
        caught_count: Number(result.rows[0].caught_count),
        favorite_count: Number(result.rows[0].favorite_count),
        total_pokemon: 1025,
        completion_pct: Number(result.rows[0].completion_pct),
      };
    }
    return { seen_count: 0, caught_count: 0, favorite_count: 0, total_pokemon: 1025, completion_pct: 0 };
  },

  // ─── Quiz Results ──────────────────────────────────────────────────────────

  async recordQuiz(
    childUserId: string,
    quizType: string,
    question: string,
    correctAnswer: string,
    userAnswer: string | null,
    isCorrect: boolean,
    pokemonId?: number,
    difficulty = 'easy',
    pointsEarned = 0
  ): Promise<void> {
    await getPool().query(
      `INSERT INTO child_quiz_results
       (child_user_id, quiz_type, question, correct_answer, user_answer, is_correct, pokemon_id, difficulty, points_earned)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [childUserId, quizType, question, correctAnswer, userAnswer, isCorrect, pokemonId, difficulty, pointsEarned]
    );
    await this.updateStats(childUserId);
  },

  async getQuizHistory(childUserId: string, quizType?: string, limit = 50): Promise<QuizResult[]> {
    const params: unknown[] = [childUserId];
    let where = 'WHERE child_user_id = $1';
    if (quizType) {
      params.push(quizType);
      where += ` AND quiz_type = $${params.length}`;
    }
    params.push(limit);
    const result = await getPool().query(
      `SELECT * FROM child_quiz_results ${where} ORDER BY answered_at DESC LIMIT $${params.length}`,
      params
    );
    return result.rows;
  },

  async getQuizAccuracy(childUserId: string): Promise<Record<string, { accuracy: number; total: number; points: number }>> {
    const result = await getPool().query(
      'SELECT * FROM v_child_quiz_accuracy WHERE child_user_id = $1',
      [childUserId]
    );
    const map: Record<string, { accuracy: number; total: number; points: number }> = {};
    for (const row of result.rows) {
      map[row.quiz_type] = {
        accuracy: Number(row.accuracy_pct) || 0,
        total: Number(row.total_attempts),
        points: Number(row.total_points),
      };
    }
    return map;
  },

  // ─── Type Trainer ──────────────────────────────────────────────────────────

  async recordTypeTrainer(
    childUserId: string,
    attackingType: string,
    defendingType: string,
    isCorrect: boolean
  ): Promise<void> {
    await getPool().query(
      `INSERT INTO child_type_trainer_progress (child_user_id, attacking_type, defending_type, correct_count, incorrect_count, last_practiced_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (child_user_id, attacking_type, defending_type)
       DO UPDATE SET
         correct_count = child_type_trainer_progress.correct_count + $4,
         incorrect_count = child_type_trainer_progress.incorrect_count + $5,
         mastery_level = LEAST(5, child_type_trainer_progress.mastery_level + CASE WHEN $4 > 0 THEN 1 ELSE 0 END),
         last_practiced_at = NOW()`,
      [childUserId, attackingType, defendingType, isCorrect ? 1 : 0, isCorrect ? 0 : 1]
    );
  },

  async getTypeTrainerProgress(childUserId: string): Promise<Record<string, { correct: number; incorrect: number; mastery: number }>> {
    const result = await getPool().query(
      'SELECT attacking_type, defending_type, correct_count, incorrect_count, mastery_level FROM child_type_trainer_progress WHERE child_user_id = $1',
      [childUserId]
    );
    const map: Record<string, { correct: number; incorrect: number; mastery: number }> = {};
    for (const row of result.rows) {
      const key = `${row.attacking_type}_vs_${row.defending_type}`;
      map[key] = {
        correct: Number(row.correct_count),
        incorrect: Number(row.incorrect_count),
        mastery: Number(row.mastery_level),
      };
    }
    return map;
  },

  // ─── Daily Pokemon ─────────────────────────────────────────────────────────

  async recordDailyView(childUserId: string, pokemonId: number, pokemonName: string, pokedexNumber: number): Promise<void> {
    await getPool().query(
      `INSERT INTO child_daily_pokemon (child_user_id, pokemon_id, pokemon_name, pokedex_number, viewed_at)
       VALUES ($1, $2, $3, $4, CURRENT_DATE)
       ON CONFLICT (child_user_id, viewed_at) DO NOTHING`,
      [childUserId, pokemonId, pokemonName, pokedexNumber]
    );
  },

  async recordDailyQuiz(childUserId: string, score: number): Promise<void> {
    await getPool().query(
      `UPDATE child_daily_pokemon SET quiz_completed = true, quiz_score = $2
       WHERE child_user_id = $1 AND viewed_at = CURRENT_DATE`,
      [childUserId, score]
    );
  },

  // ─── TCG Collection ────────────────────────────────────────────────────────

  async addCard(childUserId: string, cardId: string, cardName: string, cardImage: string, cardRarity: string, setName: string): Promise<void> {
    await getPool().query(
      `INSERT INTO child_tcg_collection (child_user_id, card_id, card_name, card_image, card_rarity, set_name, quantity)
       VALUES ($1, $2, $3, $4, $5, $6, 1)
       ON CONFLICT (child_user_id, card_id)
       DO UPDATE SET quantity = child_tcg_collection.quantity + 1`,
      [childUserId, cardId, cardName, cardImage, cardRarity, setName]
    );
  },

  async removeCard(childUserId: string, cardId: string): Promise<void> {
    await getPool().query(
      'DELETE FROM child_tcg_collection WHERE child_user_id = $1 AND card_id = $2',
      [childUserId, cardId]
    );
  },

  async getCardCollection(childUserId: string, limit = 100, offset = 0): Promise<unknown[]> {
    const result = await getPool().query(
      'SELECT * FROM child_tcg_collection WHERE child_user_id = $1 ORDER BY acquired_at DESC LIMIT $2 OFFSET $3',
      [childUserId, limit, offset]
    );
    return result.rows;
  },

  // ─── Flashcards (Leitner System) ───────────────────────────────────────────

  async recordFlashcard(
    childUserId: string,
    cardType: string,
    cardKey: string,
    isCorrect: boolean
  ): Promise<void> {
    // Leitner system: correct moves up a box, incorrect resets to box 1
    // Box N reviews after 2^N days
    const boxDelta = isCorrect ? 1 : -999; // reset to 1 if wrong
    const intervalDays = isCorrect ? Math.pow(2, Math.min(5, 1)) : 1;
    await getPool().query(
      `INSERT INTO child_flashcard_progress (child_user_id, card_type, card_key, times_shown, times_correct, box_number, next_review_at)
       VALUES ($1, $2, $3, 1, $4, $5, NOW() + INTERVAL '${intervalDays} days')
       ON CONFLICT (child_user_id, card_type, card_key)
       DO UPDATE SET
         times_shown = child_flashcard_progress.times_shown + 1,
         times_correct = child_flashcard_progress.times_correct + $4,
         box_number = GREATEST(1, LEAST(5, child_flashcard_progress.box_number + $5)),
         next_review_at = NOW() + (INTERVAL '1 day' * (CASE
           WHEN GREATEST(1, LEAST(5, child_flashcard_progress.box_number + $5)) = 1 THEN 1
           WHEN GREATEST(1, LEAST(5, child_flashcard_progress.box_number + $5)) = 2 THEN 2
           WHEN GREATEST(1, LEAST(5, child_flashcard_progress.box_number + $5)) = 3 THEN 4
           WHEN GREATEST(1, LEAST(5, child_flashcard_progress.box_number + $5)) = 4 THEN 8
           ELSE 16
         END)),
         last_shown_at = NOW()`,
      [childUserId, cardType, cardKey, isCorrect ? 1 : 0, boxDelta]
    );
  },

  async getDueFlashcards(childUserId: string, limit = 20): Promise<FlashcardProgress[]> {
    const result = await getPool().query(
      `SELECT card_type, card_key, times_shown, times_correct, box_number, next_review_at
       FROM child_flashcard_progress
       WHERE child_user_id = $1 AND next_review_at <= NOW()
       ORDER BY next_review_at ASC
       LIMIT $2`,
      [childUserId, limit]
    );
    return result.rows;
  },

  // ─── Aggregate Stats ───────────────────────────────────────────────────────

  async getStats(childUserId: string): Promise<PokemonStats> {
    const result = await getPool().query(
      'SELECT * FROM child_pokemon_stats WHERE child_user_id = $1',
      [childUserId]
    );
    if (result.rows[0]) {
      const r = result.rows[0];
      return {
        total_seen: Number(r.total_seen),
        total_caught: Number(r.total_caught),
        total_favorites: Number(r.total_favorites),
        total_quiz_correct: Number(r.total_quiz_correct),
        total_quiz_attempts: Number(r.total_quiz_attempts),
        total_points: Number(r.total_points),
        current_streak: Number(r.current_streak),
        longest_streak: Number(r.longest_streak),
        last_activity_date: r.last_activity_date,
      };
    }
    return {
      total_seen: 0, total_caught: 0, total_favorites: 0,
      total_quiz_correct: 0, total_quiz_attempts: 0, total_points: 0,
      current_streak: 0, longest_streak: 0, last_activity_date: null,
    };
  },

  async updateStats(childUserId: string): Promise<void> {
    await getPool().query(
      `INSERT INTO child_pokemon_stats (child_user_id, total_seen, total_caught, total_favorites, total_quiz_correct, total_quiz_attempts, total_points, last_activity_date, updated_at)
       SELECT
         $1,
         COUNT(*) FILTER (WHERE e.status IN ('seen', 'caught')),
         COUNT(*) FILTER (WHERE e.status = 'caught'),
         COUNT(*) FILTER (WHERE e.favorite = true),
         COUNT(*) FILTER (WHERE q.is_correct),
         COUNT(*),
         COALESCE(SUM(q.points_earned), 0),
         CURRENT_DATE,
         NOW()
       FROM child_pokedex_entries e
       FULL OUTER JOIN child_quiz_results q ON q.child_user_id = e.child_user_id
       WHERE COALESCE(e.child_user_id, q.child_user_id) = $1
       ON CONFLICT (child_user_id) DO UPDATE SET
         total_seen = EXCLUDED.total_seen,
         total_caught = EXCLUDED.total_caught,
         total_favorites = EXCLUDED.total_favorites,
         total_quiz_correct = EXCLUDED.total_quiz_correct,
         total_quiz_attempts = EXCLUDED.total_quiz_attempts,
         total_points = EXCLUDED.total_points,
         last_activity_date = EXCLUDED.last_activity_date,
         updated_at = NOW()`,
      [childUserId]
    );
  },
};
