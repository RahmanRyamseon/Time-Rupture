from tests.conftest import ANALYST, VIEWER


def test_login_sets_httponly_cookie_and_me_works(anon):
    response = anon.post("/api/auth/login", json={"email": ANALYST[0], "password": ANALYST[1]})
    assert response.status_code == 200
    assert "HttpOnly" in response.headers["set-cookie"]
    assert "SameSite=strict" in response.headers["set-cookie"]
    assert anon.get("/api/auth/me").json()["role"] == "analyst"


def test_bearer_token_is_accepted(anon):
    token = anon.post(
        "/api/auth/login", json={"email": VIEWER[0].upper(), "password": VIEWER[1]}
    ).json()["access_token"]
    anon.cookies.clear()
    response = anon.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.json()["email"] == VIEWER[0]


def test_wrong_password_and_unknown_user_look_the_same(anon):
    bad = anon.post("/api/auth/login", json={"email": ANALYST[0], "password": "nope-nope-nope"})
    unknown = anon.post("/api/auth/login", json={"email": "x@test.example", "password": "nope-nope-nope"})
    assert bad.status_code == unknown.status_code == 401
    assert bad.json() == unknown.json()


def test_login_is_rate_limited_after_repeated_failures(anon):
    for _ in range(3):
        anon.post("/api/auth/login", json={"email": ANALYST[0], "password": "wrong-password"})
    response = anon.post("/api/auth/login", json={"email": ANALYST[0], "password": ANALYST[1]})
    assert response.status_code == 429


def test_unauthenticated_requests_are_rejected(anon):
    assert anon.get("/api/projects").status_code == 401
    assert anon.get("/api/auth/me", headers={"Authorization": "Bearer garbage"}).status_code == 401


def test_logout_clears_session(analyst):
    analyst.post("/api/auth/logout")
    assert analyst.get("/api/auth/me").status_code == 401


def test_deactivated_user_loses_access(analyst, viewer):
    viewer_id = viewer.get("/api/auth/me").json()["id"]
    assert analyst.patch(f"/api/users/{viewer_id}", json={"is_active": False}).status_code == 200
    assert viewer.get("/api/auth/me").status_code == 401


def test_user_management_is_analyst_only(analyst, viewer):
    new = {"email": "new@test.example", "role": "viewer", "password": "long-enough-pw"}
    assert viewer.post("/api/users", json=new).status_code == 403
    assert viewer.get("/api/users").status_code == 403
    assert analyst.post("/api/users", json=new).status_code == 201
    assert analyst.post("/api/users", json=new).status_code == 409
    assert analyst.post("/api/users", json={**new, "email": "b@test.example", "password": "short"}).status_code == 422


def test_analyst_cannot_demote_or_deactivate_self(analyst):
    me = analyst.get("/api/auth/me").json()["id"]
    assert analyst.patch(f"/api/users/{me}", json={"role": "viewer"}).status_code == 400
    assert analyst.patch(f"/api/users/{me}", json={"is_active": False}).status_code == 400
    assert analyst.patch(f"/api/users/{me}", json={"full_name": "A"}).status_code == 200
