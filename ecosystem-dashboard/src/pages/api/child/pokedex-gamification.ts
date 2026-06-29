/**
 * Pokedex Gamification API
 *
 * Per-child Pokemon learning endpoints:
 *   GET  /api/child/pokedex-gamification              — Get stats + completion
 *   POST /api/child/pokedex-gamification              — Mark seen/caught/favorite
 *   GET  /api/child/pokedex-gamification/entries      — List pokedex entries
 *   POST /api/child/pokedex-gamification/quiz         — Record quiz result
 *   GET  /api/child/pokedex-gamification/quiz/history  — Get quiz history
 *   POST /api/child/pokedex-gamification/type-trainer — Record type trainer answer
 *   GET  /api/child/pokedex-gamification/flashcards   — Get due flashcards
 *   POST /api/child/pokedex-gamification/flashcards   — Record flashcard result
 *   POST /api/child/pokedex-gamification/daily        — Record daily pokemon view
 *   GET  /api/child/pokedex-gamification/tcg          — Get TCG collection
 *   POST /api/child/pokedex-gamification/tcg          — Add card to collection
 *   DELETE /api/child/pokedex-gamification/tcg         — Remove card
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { pokedexGamificationService } from '@/lib/pokedex-gamification';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = session.user as { id?: string; accountType?: string };
  if (user.accountType !== 'child' && user.accountType !== 'admin') {
    return res.status(403).json({ error: 'Only child or admin accounts' });
  }

  const childUserId = user.id!;
  const { action } = req.query;

  try {
    // GET /api/child/pokedex-gamification — stats + completion
    if (req.method === 'GET' && !action) {
      const [stats, completion, quizAccuracy] = await Promise.all([
        pokedexGamificationService.getStats(childUserId),
        pokedexGamificationService.getPokedexCompletion(childUserId),
        pokedexGamificationService.getQuizAccuracy(childUserId),
      ]);
      return res.status(200).json({ stats, completion, quizAccuracy });
    }

    // POST /api/child/pokedex-gamification — mark seen/caught/favorite
    if (req.method === 'POST' && !action) {
      const { type, pokemonId, pokemonName, pokedexNumber } = req.body;
      if (type === 'seen') {
        await pokedexGamificationService.markSeen(childUserId, pokemonId, pokemonName, pokedexNumber);
      } else if (type === 'caught') {
        await pokedexGamificationService.markCaught(childUserId, pokemonId, pokemonName, pokedexNumber);
      } else if (type === 'favorite') {
        const fav = await pokedexGamificationService.toggleFavorite(childUserId, pokemonId);
        return res.status(200).json({ favorite: fav });
      } else {
        return res.status(400).json({ error: 'Invalid type' });
      }
      return res.status(200).json({ ok: true });
    }

    // GET /api/child/pokedex-gamification/entries
    if (req.method === 'GET' && action === 'entries') {
      const status = req.query.status as string | undefined;
      const entries = await pokedexGamificationService.getPokedexEntries(childUserId, status);
      return res.status(200).json(entries);
    }

    // POST /api/child/pokedex-gamification/quiz
    if (req.method === 'POST' && action === 'quiz') {
      const { quizType, question, correctAnswer, userAnswer, isCorrect, pokemonId, difficulty, pointsEarned } = req.body;
      await pokedexGamificationService.recordQuiz(
        childUserId, quizType, question, correctAnswer, userAnswer, isCorrect,
        pokemonId, difficulty, pointsEarned
      );
      return res.status(200).json({ ok: true });
    }

    // GET /api/child/pokedex-gamification/quiz/history
    if (req.method === 'GET' && action === 'quiz/history') {
      const quizType = req.query.quizType as string | undefined;
      const history = await pokedexGamificationService.getQuizHistory(childUserId, quizType);
      return res.status(200).json(history);
    }

    // POST /api/child/pokedex-gamification/type-trainer
    if (req.method === 'POST' && action === 'type-trainer') {
      const { attackingType, defendingType, isCorrect } = req.body;
      await pokedexGamificationService.recordTypeTrainer(childUserId, attackingType, defendingType, isCorrect);
      return res.status(200).json({ ok: true });
    }

    // GET /api/child/pokedex-gamification/flashcards
    if (req.method === 'GET' && action === 'flashcards') {
      const cards = await pokedexGamificationService.getDueFlashcards(childUserId);
      return res.status(200).json(cards);
    }

    // POST /api/child/pokedex-gamification/flashcards
    if (req.method === 'POST' && action === 'flashcards') {
      const { cardType, cardKey, isCorrect } = req.body;
      await pokedexGamificationService.recordFlashcard(childUserId, cardType, cardKey, isCorrect);
      return res.status(200).json({ ok: true });
    }

    // POST /api/child/pokedex-gamification/daily
    if (req.method === 'POST' && action === 'daily') {
      const { pokemonId, pokemonName, pokedexNumber, quizScore } = req.body;
      if (quizScore !== undefined) {
        await pokedexGamificationService.recordDailyQuiz(childUserId, quizScore);
      } else {
        await pokedexGamificationService.recordDailyView(childUserId, pokemonId, pokemonName, pokedexNumber);
      }
      return res.status(200).json({ ok: true });
    }

    // GET /api/child/pokedex-gamification/tcg
    if (req.method === 'GET' && action === 'tcg') {
      const cards = await pokedexGamificationService.getCardCollection(childUserId);
      return res.status(200).json(cards);
    }

    // POST /api/child/pokedex-gamification/tcg
    if (req.method === 'POST' && action === 'tcg') {
      const { cardId, cardName, cardImage, cardRarity, setName } = req.body;
      await pokedexGamificationService.addCard(childUserId, cardId, cardName, cardImage, cardRarity, setName);
      return res.status(200).json({ ok: true });
    }

    // DELETE /api/child/pokedex-gamification/tcg
    if (req.method === 'DELETE' && action === 'tcg') {
      const { cardId } = req.body;
      await pokedexGamificationService.removeCard(childUserId, cardId);
      return res.status(200).json({ ok: true });
    }

    return res.status(404).json({ error: 'Unknown action' });
  } catch (err: any) {
    console.error('Pokedex gamification error:', err);
    return res.status(500).json({ error: err.message });
  }
}
