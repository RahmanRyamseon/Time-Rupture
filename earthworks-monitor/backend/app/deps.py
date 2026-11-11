import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import ROLE_ANALYST, Project, Site, User, Zone, project_members
from app.security import decode_access_token

SESSION_COOKIE = "em_session"

DbSession = Annotated[Session, Depends(get_db)]


def get_current_user(request: Request, db: DbSession) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        token = header[7:]
    user_id = decode_access_token(token) if token else None
    user = db.get(User, user_id) if user_id else None
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_analyst(user: CurrentUser) -> User:
    if user.role != ROLE_ANALYST:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "This action requires the analyst role")
    return user


AnalystUser = Annotated[User, Depends(require_analyst)]


def visible_projects(user: User):
    """Analysts see every project; viewers only projects they are a member of."""
    query = select(Project)
    if user.role != ROLE_ANALYST:
        query = query.join(project_members).where(project_members.c.user_id == user.id)
    return query


# Inaccessible objects answer 404 (not 403) so their existence is not disclosed.
def _not_found(what: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, f"{what} not found")


def get_project(project_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Project:
    project = db.scalar(visible_projects(user).where(Project.id == project_id))
    if project is None:
        raise _not_found("Project")
    return project


def get_site(site_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Site:
    site = db.get(Site, site_id)
    if site is None:
        raise _not_found("Site")
    get_project(site.project_id, user, db)
    return site


def get_zone(zone_id: uuid.UUID, user: CurrentUser, db: DbSession) -> Zone:
    zone = db.get(Zone, zone_id)
    if zone is None:
        raise _not_found("Zone")
    get_site(zone.site_id, user, db)
    return zone


ProjectDep = Annotated[Project, Depends(get_project)]
SiteDep = Annotated[Site, Depends(get_site)]
ZoneDep = Annotated[Zone, Depends(get_zone)]
