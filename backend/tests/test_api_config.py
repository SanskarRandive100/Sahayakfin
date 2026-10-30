"""Configuration regression checks; subprocesses never connect to an application database."""
import os
import subprocess
import sys

import pytest


@pytest.mark.parametrize("url", [
    "postgresql+psycopg://unused:unused@127.0.0.1/sahayakfin",
    "sqlite:///shared_test.db",
])
def test_rejects_non_disposable_test_database(url):
    env = {**os.environ, "TEST_DATABASE_URL": url}
    result = subprocess.run([sys.executable, "-c", "import runpy; runpy.run_path('tests/conftest.py')"],
                            env=env, capture_output=True, text=True, timeout=20)
    assert result.returncode != 0
    assert "explicitly disposable PostgreSQL test database" in result.stderr
    assert "unused:unused" not in result.stderr


def test_application_database_url_is_not_used_for_tests():
    env = {**os.environ, "DATABASE_URL": "postgresql+psycopg://unused:unused@127.0.0.1/production"}
    env.pop("TEST_DATABASE_URL", None)
    script = ("import runpy, os; runpy.run_path('tests/conftest.py'); "
              "assert os.environ['DATABASE_URL'].startswith('sqlite:///'); print('isolated')")
    result = subprocess.run([sys.executable, "-c", script], env=env,
                            capture_output=True, text=True, timeout=30)
    assert result.returncode == 0, result.stderr
    assert "isolated" in result.stdout
