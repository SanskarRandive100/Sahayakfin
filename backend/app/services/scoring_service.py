"""Glue between stored transactions and Rajat's pure scoring functions."""
from sqlalchemy.orm import Session

from app import scoring
from app.errors import AppError
from app.models import ScoreRun, User, aware
from app.services import clock
from app.services.txn_store import load_txns


def _jsonable(obj):
    """ScoreResult must be JSON-safe for the JSON column (dates → ISO strings)."""
    if isinstance(obj, dict):
        return {str(k): _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_jsonable(v) for v in obj]
    if hasattr(obj, "isoformat"):
        return obj.isoformat()
    if hasattr(obj, "item"):  # numpy scalars
        return obj.item()
    return obj


def run_out(run: ScoreRun) -> dict:
    return {**run.result, "id": run.id, "created_at": aware(run.created_at).isoformat()}


def rescore(db: Session, user: User) -> dict:
    txns = load_txns(db, user.id)
    if not txns:
        raise AppError("NO_SCORE")
    result = _jsonable(scoring.compute_score(txns))
    run = ScoreRun(user_id=user.id, score=result.get("score"), band=result.get("band"),
                   confidence=result.get("confidence", "NONE"), result=result,
                   engine_version=str(result.get("engine_version", "")), created_at=clock.now())
    db.add(run)
    db.flush()
    return run_out(run)


def latest_run(db: Session, user_id: str) -> ScoreRun | None:
    return (db.query(ScoreRun).filter(ScoreRun.user_id == user_id)
            .order_by(ScoreRun.created_at.desc()).first())


def require_latest(db: Session, user_id: str) -> ScoreRun:
    run = latest_run(db, user_id)
    if run is None:
        raise AppError("NO_SCORE", 404)
    return run
