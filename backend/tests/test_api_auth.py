import pytest

from app.db import SessionLocal
from app.errors import AppError
from app.models import Lender, Product, User
from app.seed import seed
from app.security.deps import require_role
from tests.conftest import login, new_phone

API = "/api/v1"


def test_health(client):
    assert client.get(f"{API}/health").json() == {"ok": True}


def test_login_ok_and_me(client):
    phone = new_phone()
    r = client.post(f"{API}/auth/otp/request", json={"phone": phone})
    assert r.status_code == 200 and r.json()["demo_otp"] == "123456"
    r = client.post(f"{API}/auth/otp/verify", json={"phone": phone, "otp": "123456"})
    assert r.status_code == 200
    body = r.json()
    assert body["user"]["role"] == "USER" and body["user"]["display_name"] == "Guest"
    assert body["user"]["phone_masked"] == "XXXXXX" + phone[-4:]
    h = {"Authorization": f"Bearer {body['access_token']}"}
    me = client.get(f"{API}/me", headers=h).json()
    assert me["has_active_consent"] is False and me["has_score"] is False and me["has_loan"] is False


def test_wrong_otp_is_401(client):
    r = client.post(f"{API}/auth/otp/verify", json={"phone": new_phone(), "otp": "000000"})
    assert r.status_code == 401
    assert r.json()["error"]["code"] == "OTP_INVALID"


def test_otp_rate_limit(client):
    phone = new_phone()
    for _ in range(5):
        assert client.post(f"{API}/auth/otp/request", json={"phone": phone}).status_code == 200
    r = client.post(f"{API}/auth/otp/request", json={"phone": phone})
    assert r.status_code == 429
    assert r.json()["error"]["code"] == "TOO_MANY_REQUESTS"
    # Another phone is not affected.
    assert client.post(f"{API}/auth/otp/request", json={"phone": new_phone()}).status_code == 200


def test_no_token_is_401(client):
    r = client.get(f"{API}/me")
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHENTICATED"


def test_patch_me_language(client):
    h = login(client)
    r = client.patch(f"{API}/me", json={"language": "hi"}, headers=h)
    assert r.status_code == 200 and r.json()["language"] == "hi"
    r = client.patch(f"{API}/me", json={"language": "fr"}, headers=h)
    assert r.status_code == 422 and r.json()["error"]["code"] == "VALIDATION_ERROR"


def test_require_role_forbids_user():
    user = User(id="x", phone_hash="h", phone_last4="0000", role="USER")
    with pytest.raises(AppError) as e:
        require_role("LENDER")(user)
    assert e.value.status == 403 and e.value.code == "FORBIDDEN"


def test_user_token_on_lender_route_is_403(client):
    h = login(client)
    r = client.get(f"{API}/lender/applicants", headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "FORBIDDEN"


def test_seed_is_idempotent(client):
    seed()
    seed()
    with SessionLocal() as db:
        assert db.query(Lender).count() == 3
        assert db.query(Product).filter(Product.kind == "LOAN").count() == 3
        assert db.query(Product).filter(Product.kind == "INSURANCE").count() == 3
        assert db.query(User).filter(User.role == "LENDER").count() == 3
        assert db.query(User).filter(User.persona_slug.isnot(None)).count() == 4


def test_persona_and_lender_logins(client):
    r = client.post(f"{API}/auth/otp/verify", json={"phone": "9000000001", "otp": "123456"})
    assert r.json()["user"]["display_name"] == "Ravi Shinde"
    r = client.post(f"{API}/auth/otp/verify", json={"phone": "9999999991", "otp": "123456"})
    assert r.json()["user"]["role"] == "LENDER" and r.json()["user"]["display_name"] == "MFI Alpha"
