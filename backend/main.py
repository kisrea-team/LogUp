from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from models import Project, ProjectCreate, Version, VersionCreate
from database import db

app = FastAPI(title="Project Updates API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    if not db.connect():
        print("Failed to connect to database on startup")
    else:
        print("Database connected successfully on startup")

@app.on_event("shutdown")
async def shutdown_event():
    db.disconnect()

@app.get("/")
async def root():
    return {"message": "Project Updates API"}

@app.get("/projects", response_model=List[Project])
async def get_projects():
    """获取所有项目列表"""
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            return []
        
        # Get all projects (include unpublished for now)
        projects_query = """
        SELECT id, icon, name, latest_version, latest_update_time 
        FROM projects 
        ORDER BY latest_update_time DESC
        """
        projects_data = local_db.execute_query(projects_query)
        
        if not projects_data:
            return []
        
        projects = []
        for project_data in projects_data:
            # Get versions for each project (include unpublished for now)
            versions_query = """
            SELECT id, project_id, version, update_time, content, download_url 
            FROM versions 
            WHERE project_id = %s 
            ORDER BY update_time DESC
            """
            versions_data = local_db.execute_query(versions_query, (project_data['id'],))
            
            versions = [Version(**version) for version in versions_data] if versions_data else []
            
            project = Project(
                **project_data,
                versions=versions
            )
            projects.append(project)
        
        return projects
    except Exception as e:
        print(f"Error in get_projects: {e}")
        return []
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

@app.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: int):
    """获取单个项目详情"""
    try:
        # Get project (include unpublished for now)
        project_query = """
        SELECT id, icon, name, latest_version, latest_update_time 
        FROM projects 
        WHERE id = %s
        """
        project_data = db.execute_query(project_query, (project_id,))
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Get versions (include unpublished for now)
        versions_query = """
        SELECT id, project_id, version, update_time, content, download_url 
        FROM versions 
        WHERE project_id = %s 
        ORDER BY update_time DESC
        """
        versions_data = db.execute_query(versions_query, (project_id,))
        
        versions = [Version(**version) for version in versions_data] if versions_data else []
        
        project = Project(
            **project_data[0],
            versions=versions
        )
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching project: {str(e)}")

@app.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    """创建新项目"""
    try:
        insert_query = """
        INSERT INTO projects (icon, name, latest_version, latest_update_time) 
        VALUES (%s, %s, %s, %s)
        """
        project_id = db.execute_query(
            insert_query, 
            (project.icon, project.name, project.latest_version, project.latest_update_time)
        )
        
        if project_id:
            return await get_project(project_id)
        else:
            raise HTTPException(status_code=500, detail="Failed to create project")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")

@app.post("/versions", response_model=Version)
async def create_version(version: VersionCreate):
    """为项目创建新版本"""
    try:
        # Check if project exists
        project_check = db.execute_query("SELECT id FROM projects WHERE id = %s", (version.project_id,))
        if not project_check:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Insert version
        insert_query = """
        INSERT INTO versions (project_id, version, update_time, content, download_url) 
        VALUES (%s, %s, %s, %s, %s)
        """
        version_id = db.execute_query(
            insert_query,
            (version.project_id, version.version, version.update_time, version.content, version.download_url)
        )
        
        if version_id:
            # Update project's latest version if this is newer
            update_project_query = """
            UPDATE projects 
            SET latest_version = %s, latest_update_time = %s 
            WHERE id = %s AND latest_update_time < %s
            """
            db.execute_query(
                update_project_query,
                (version.version, version.update_time, version.project_id, version.update_time)
            )
            
            # Get the created version
            version_query = """
            SELECT id, project_id, version, update_time, content, download_url 
            FROM versions 
            WHERE id = %s
            """
            version_data = db.execute_query(version_query, (version_id,))
            
            return Version(**version_data[0])
        else:
            raise HTTPException(status_code=500, detail="Failed to create version")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating version: {str(e)}")

@app.put("/versions/{version_id}", response_model=Version)
async def update_version(version_id: int, version: VersionCreate):
    """更新版本信息"""
    try:
        # Check if version exists
        version_check = db.execute_query("SELECT id FROM versions WHERE id = %s", (version_id,))
        if not version_check:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Update version
        update_query = """
        UPDATE versions 
        SET version = %s, update_time = %s, content = %s, download_url = %s 
        WHERE id = %s
        """
        db.execute_query(
            update_query,
            (version.version, version.update_time, version.content, version.download_url, version_id)
        )
        
        # Update project's latest version if this is newer
        update_project_query = """
        UPDATE projects 
        SET latest_version = %s, latest_update_time = %s 
        WHERE id = %s AND latest_update_time < %s
        """
        db.execute_query(
            update_project_query,
            (version.version, version.update_time, version.project_id, version.update_time)
        )
        
        # Get the updated version
        version_query = """
        SELECT id, project_id, version, update_time, content, download_url 
        FROM versions 
        WHERE id = %s
        """
        version_data = db.execute_query(version_query, (version_id,))
        
        return Version(**version_data[0])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating version: {str(e)}")

@app.delete("/versions/{version_id}")
async def delete_version(version_id: int):
    """删除版本"""
    try:
        # Check if version exists
        version_check = db.execute_query("SELECT id FROM versions WHERE id = %s", (version_id,))
        if not version_check:
            raise HTTPException(status_code=404, detail="Version not found")
        
        # Delete version
        delete_query = "DELETE FROM versions WHERE id = %s"
        db.execute_query(delete_query, (version_id,))
        
        return {"message": "Version deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting version: {str(e)}")

@app.delete("/projects/{project_id}")
async def delete_project(project_id: int):
    """删除项目"""
    try:
        # Check if project exists
        project_check = db.execute_query("SELECT id FROM projects WHERE id = %s", (project_id,))
        if not project_check:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Delete project (versions will be deleted automatically due to foreign key constraint)
        delete_query = "DELETE FROM projects WHERE id = %s"
        db.execute_query(delete_query, (project_id,))
        
        return {"message": "Project deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting project: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)