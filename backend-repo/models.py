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

from datetime import date as date_type

class Project(BaseModel):
    id: Optional[int] = None
    icon: str
    name: str
    slug: Optional[str] = None
    latest_version: str
    latest_update_time: date_type
    describe: Optional[str] = None
    summar: Optional[str] = None
    author: Optional[str] = None
    type: Optional[str] = None
    versions: Optional[List[Version]] = []

class ProjectCreate(BaseModel):
    icon: str
    name: str
    slug: Optional[str] = None
    latest_version: str
    latest_update_time: date_type
    describe: Optional[str] = None
    summar: Optional[str] = None
    author: Optional[str] = None
    type: Optional[str] = None

class VersionCreate(BaseModel):
    project_id: int
    version: str
    update_time: date
    content: str
    download_url: str