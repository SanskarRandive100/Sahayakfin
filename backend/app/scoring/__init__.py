"""Financial Trust Score engine, affordability, wellness and fairness (pure functions)."""
from app.scoring.afford import affordability, stress_test
from app.scoring.engine import compute_score, score_from_weekly
from app.scoring.fairness import fairness_report, what_if
from app.scoring.wellness import nudges, weekly_breakdown

__all__ = ["compute_score", "score_from_weekly", "what_if", "affordability", "stress_test",
           "weekly_breakdown", "nudges", "fairness_report"]
