from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel
from typing import List
from app.security import get_current_user
import io
import zipfile
import os
from datetime import datetime

router = APIRouter()

UPLOADS_PATH = os.getenv("UPLOADS_PATH", "/app/uploads")

class DownloadRequest(BaseModel):
    path: str

class DownloadZipRequest(BaseModel):
    paths: List[str]
    zipName: str = "archivos"


@router.post("/archivos/download")
async def download_single_file(
    request: DownloadRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        base_dir = os.path.abspath(UPLOADS_PATH)
        requested = os.path.abspath(os.path.join(base_dir, request.path))

        if not requested.startswith(base_dir + os.sep) and requested != base_dir:
            raise HTTPException(status_code=403, detail="Acceso denegado")

        if not os.path.exists(requested):
            raise HTTPException(status_code=404, detail=f"Archivo no encontrado: {request.path}")

        if not os.path.isfile(requested):
            raise HTTPException(status_code=400, detail="La ruta no corresponde a un archivo")

        filename = os.path.basename(requested)
        ext = os.path.splitext(filename)[1].lower()
        content_type_map = {
            '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
            '.png': 'image/png', '.gif': 'image/gif', '.webp': 'image/webp',
            '.pdf': 'application/pdf', '.zip': 'application/zip',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }
        content_type = content_type_map.get(ext, 'application/octet-stream')

        return FileResponse(
            path=requested,
            media_type=content_type,
            filename=filename,
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            }
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error al descargar el archivo")


@router.post("/archivos/download-zip")
async def download_multiple_files_as_zip(
    request: DownloadZipRequest,
    current_user: dict = Depends(get_current_user)
):
    try:
        base_dir = os.path.abspath(UPLOADS_PATH)
        zip_buffer = io.BytesIO()
        files_added = 0
        files_failed = 0
        failed_files = []

        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for file_path in request.paths:
                try:
                    full_path = os.path.abspath(os.path.join(base_dir, file_path))

                    if not full_path.startswith(base_dir + os.sep) and full_path != base_dir:
                        files_failed += 1
                        failed_files.append(file_path)
                        continue

                    if not os.path.exists(full_path) or not os.path.isfile(full_path):
                        files_failed += 1
                        failed_files.append(file_path)
                        continue

                    with open(full_path, 'rb') as f:
                        zip_file.writestr(file_path, f.read())
                    files_added += 1

                except Exception:
                    files_failed += 1
                    failed_files.append(file_path)
                    continue

        if files_added == 0:
            raise HTTPException(status_code=404, detail="No se pudo descargar ningún archivo")

        zip_buffer.seek(0)
        timestamp = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        zip_filename = f"{request.zipName}_{timestamp}.zip"

        return StreamingResponse(
            zip_buffer,
            media_type='application/zip',
            headers={
                'Content-Disposition': f'attachment; filename="{zip_filename}"',
                'Access-Control-Expose-Headers': 'Content-Disposition'
            }
        )

    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Error al descargar los archivos")