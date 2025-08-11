from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class Version(BaseModel):
    id: Optional[int] = None
    project_id: Optional[int] = None
    version: str
    update_time: date
    content: str
    download_url: str

class Project(BaseModel):
    id: Optional[int] = None
    icon: str
    name: str
    latest_version: str
    latest_update_time: date
    versions: Optional[List[Version]] = []

class ProjectCreate(BaseModel):
    icon: str
    name: str
    latest_version: str
    latest_update_time: date

class VersionCreate(BaseModel):
    project_id: int
    version: str
    update_time: date
    content: str
    download_url: str