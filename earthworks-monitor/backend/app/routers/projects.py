from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.deps import AnalystUser, CurrentUser, DbSession, ProjectDep, visible_projects
from app.models import Project, User
from app.schemas import MembersIn, ProjectCreate, ProjectOut, ProjectUpdate, UserOut

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(user: CurrentUser, db: DbSession):
    projects = db.scalars(visible_projects(user).order_by(Project.name)).all()
    return [ProjectOut.from_model(p) for p in projects]


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: ProjectCreate, user: AnalystUser, db: DbSession):
    project = Project(**body.model_dump(), created_by=user.id)
    db.add(project)
    db.commit()
    return ProjectOut.from_model(project)


@router.get("/{project_id}", response_model=ProjectOut)
def read_project(project: ProjectDep):
    return ProjectOut.from_model(project)


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(body: ProjectUpdate, project: ProjectDep, _: AnalystUser, db: DbSession):
    for field, value in body.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(project, field, value)
    db.commit()
    return ProjectOut.from_model(project)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(project: ProjectDep, _: AnalystUser, db: DbSession):
    db.delete(project)
    db.commit()


@router.get("/{project_id}/members", response_model=list[UserOut])
def list_members(project: ProjectDep, _: AnalystUser):
    return project.members


@router.put("/{project_id}/members", response_model=list[UserOut])
def set_members(body: MembersIn, project: ProjectDep, _: AnalystUser, db: DbSession):
    """Replace the list of users who may view this project (analysts always can)."""
    ids = set(body.user_ids)
    users = db.scalars(select(User).where(User.id.in_(ids))).all() if ids else []
    if len(users) != len(ids):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "One or more users do not exist")
    project.members = list(users)
    db.commit()
    return project.members
