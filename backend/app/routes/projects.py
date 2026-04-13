from fastapi import APIRouter, Depends, HTTPException
from typing import List
from app.security import get_current_user
from app.schemas import ProjectResponse, ProjectDetail, ProjectStats
from app.db import get_all_projects, get_project_by_code, get_project_data_sources, get_project_stats
from app.logger import get_logger, log_error

logger = get_logger("projects")

router = APIRouter(
    prefix="/api/projects",
    tags=["Projects"],
    responses={
        401: {"description": "No autenticado"},
        403: {"description": "Sin permisos suficientes"},
        404: {"description": "Proyecto no encontrado"}
    }
)


@router.get("", response_model=List[ProjectResponse], summary="Listar todos los proyectos")
def list_projects(user: dict = Depends(get_current_user)):
    try:
        return get_all_projects(active_only=True)
    except HTTPException:
        raise
    except Exception as e:
        log_error(logger, "Error al obtener proyectos", exc=e, username=user.get("username", ""))
        raise HTTPException(status_code=500, detail="Error al obtener los proyectos")


@router.get("/{project_code}", response_model=ProjectDetail, summary="Detalle de un proyecto")
def get_project_detail(project_code: str, user: dict = Depends(get_current_user)):
    try:
        project = get_project_by_code(project_code)
        data_sources = get_project_data_sources(project["project_id"])
        return {**project, "data_sources": data_sources}
    except HTTPException:
        raise
    except Exception as e:
        log_error(logger, "Error al obtener detalle del proyecto", exc=e, username=user.get("username", ""))
        raise HTTPException(status_code=500, detail="Error al obtener el detalle del proyecto")


@router.get("/{project_code}/stats", response_model=ProjectStats, summary="Estadísticas de un proyecto")
def get_project_statistics(project_code: str, user: dict = Depends(get_current_user)):
    try:
        get_project_by_code(project_code)
        return get_project_stats(project_code)
    except HTTPException:
        raise
    except Exception as e:
        log_error(logger, "Error al obtener estadísticas del proyecto", exc=e, username=user.get("username", ""))
        raise HTTPException(status_code=500, detail="Error al obtener las estadísticas del proyecto")