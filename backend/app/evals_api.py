import json

from evals import RESULTS_DIR


def latest_results() -> dict[str, dict]:
    """Latest result file per prompt version, keyed by version."""
    latest: dict[str, dict] = {}
    for path in sorted(RESULTS_DIR.glob("*.json")):  # timestamp prefix sorts chronologically
        data = json.loads(path.read_text())
        latest[data["prompt_version"]] = data
    return latest
