from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from models import Project, ProjectCreate, Version, VersionCreate
from database import db
from datetime import date
from pydantic import BaseModel

class PaginatedResponse(BaseModel):
    data: List[Project]
    total: int
    page: int
    per_page: int
    total_pages: int

app = FastAPI(title="Project Updates API", version="1.0.0")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js default port
        "https://log-up-wine.vercel.app"
    ],
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

@app.get("/projects", response_model=PaginatedResponse)
async def get_projects(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page")
):
    """获取项目列表（支持分页）"""
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            print("Failed to connect to database")
            return PaginatedResponse(data=[], total=0, page=page, per_page=per_page, total_pages=0)
        
        print("Database connected successfully")
        
        # Calculate offset for pagination
        # Using offset-based pagination which works well for moderate datasets
        # For very large datasets, consider cursor-based pagination
        offset = (page - 1) * per_page
        
        # Get total count of projects for pagination metadata
        # Note: For better performance with very large datasets, 
        # consider caching this count or using approximate counts
        count_query = "SELECT COUNT(*) as total FROM projects"
        count_result = local_db.execute_query(count_query)
        total = count_result[0]['total'] if count_result else 0
        total_pages = (total + per_page - 1) // per_page  # Ceiling division
        
        # Validate page number to prevent empty pages
        if page > total_pages and total_pages > 0:
            page = total_pages
        elif page < 1:
            page = 1
        
        # Get paginated projects using LIMIT and OFFSET for efficient querying
        # The ORDER BY ensures consistent pagination across requests
        projects_query = """
        SELECT id, icon, name, slug, latest_version, latest_update_time, `describe`, summar, author, type 
        FROM projects 
        ORDER BY latest_update_time DESC
        LIMIT %s OFFSET %s
        """
        projects_data = local_db.execute_query(projects_query, (per_page, offset))
        print(f"Number of projects found: {len(projects_data) if projects_data else 0}")
        
        if projects_data:
            print(f"First project ID: {projects_data[0]['id']}, Name: {projects_data[0]['name']}")
        
        if not projects_data:
            print("No projects data found")
            return PaginatedResponse(data=[], total=total, page=page, per_page=per_page, total_pages=total_pages)
        
        projects = []
        for project_data in projects_data:
            # 不预加载版本数据，只返回项目基本信息
            project = Project(
                **project_data,
                versions=[]  # 返回空数组，版本数据通过单独API获取
            )
            projects.append(project)
        
        print(f"Returning {len(projects)} projects (page {page} of {total_pages})")
        return PaginatedResponse(
            data=projects,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
    except Exception as e:
        print(f"Error in get_projects: {e}")
        import traceback
        traceback.print_exc()
        return PaginatedResponse(data=[], total=0, page=page, per_page=per_page, total_pages=0)
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

@app.get("/projects/{project_id_or_slug}", response_model=Project)
async def get_project(project_id_or_slug: str):
    """获取单个项目详情 - 支持ID或slug"""
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to database")
        
        # Try to parse as integer first (ID)
        try:
            project_id = int(project_id_or_slug)
            where_condition = "id = %s"
            where_param = project_id
        except ValueError:
            # If not integer, treat as slug
            where_condition = "slug = %s"
            where_param = project_id_or_slug
        
        # Get project (include unpublished for now)
        project_query = f"""
        SELECT id, icon, name, slug, latest_version, latest_update_time, `describe`, summar, author, type 
        FROM projects 
        WHERE {where_condition}
        """
        project_data = local_db.execute_query(project_query, (where_param,))
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found")
        
        project_id = project_data[0]['id']
        
        # Get versions (include unpublished for now)
        versions_query = """
        SELECT id, project_id, version, update_time, content, download_url 
        FROM versions 
        WHERE project_id = %s 
        ORDER BY update_time DESC
        """
        versions_data = local_db.execute_query(versions_query, (project_id,))
        
        versions = [Version(**version) for version in versions_data] if versions_data else []
        
        project = Project(
            **project_data[0],
            versions=versions
        )
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching project: {str(e)}")
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

@app.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    """创建新项目"""
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to database")
        
        # Generate slug if not provided
        import re
        if not project.slug:
            # Convert name to slug: lowercase, replace spaces with hyphens, remove special chars
            slug = re.sub(r'[^a-zA-Z0-9\u4e00-\u9fa5\s-]', '', project.name)
            slug = re.sub(r'[\s]+', '-', slug)
            slug = slug.lower()
            
            # Check if slug already exists
            existing = local_db.execute_query("SELECT id FROM projects WHERE slug = %s", (slug,))
            if existing:
                # Append random string if slug exists
                import random
                import string
                random_suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
                slug = f"{slug}-{random_suffix}"
        else:
            slug = project.slug
            # Check if provided slug already exists
            existing = local_db.execute_query("SELECT id FROM projects WHERE slug = %s", (slug,))
            if existing:
                raise HTTPException(status_code=400, detail="Slug already exists")
        
        insert_query = """
        INSERT INTO projects (icon, name, slug, latest_version, latest_update_time, `describe`, summar, author, type) 
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        project_id = local_db.execute_query(
            insert_query, 
            (project.icon, project.name, slug, project.latest_version, project.latest_update_time, project.describe, project.summar, project.author, project.type)
        )
        
        # Check if insertion was successful
        if project_id is not None:
            # For MySQL, lastrowid might be 0, so we need to fetch the actual ID
            # Let's get the last inserted ID explicitly
            last_id_query = "SELECT LAST_INSERT_ID() as id"
            last_id_result = local_db.execute_query(last_id_query)
            actual_project_id = last_id_result[0]['id'] if last_id_result else project_id
            
            # Get the created project
            project_query = """
            SELECT id, icon, name, slug, latest_version, latest_update_time, `describe`, summar, author, type 
            FROM projects 
            WHERE id = %s
            """
            project_data = local_db.execute_query(project_query, (actual_project_id,))
            
            if not project_data:
                raise HTTPException(status_code=500, detail="Failed to retrieve created project")
            
            return Project(**project_data[0], versions=[])
        else:
            raise HTTPException(status_code=500, detail="Failed to create project")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in create_project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error creating project: {str(e)}")
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

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
        
        # Check if insertion was successful
        if version_id is not None:
            # For MySQL, lastrowid might be 0, so we need to fetch the actual ID
            # Let's get the last inserted ID explicitly
            last_id_query = "SELECT LAST_INSERT_ID() as id"
            last_id_result = db.execute_query(last_id_query)
            actual_version_id = last_id_result[0]['id'] if last_id_result else version_id
            
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
            version_data = db.execute_query(version_query, (actual_version_id,))
            
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

@app.post("/projects/{project_id}/update", response_model=Project)
async def update_project(project_id: int, project: ProjectCreate):
    """更新项目信息"""
    print(f"Received update request for project_id: {project_id}")
    print(f"Project data: {project}")
    
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to database")
        
        # Check if project exists
        print(f"Checking if project {project_id} exists...")
        project_check = local_db.execute_query("SELECT id FROM projects WHERE id = %s", (project_id,))
        print(f"Project check result: {project_check}")
        
        if not project_check:
            print(f"Project {project_id} not found in database")
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Update project
        update_query = """
        UPDATE projects 
        SET icon = %s, name = %s, latest_version = %s, latest_update_time = %s, 
            `describe` = %s, summar = %s, author = %s, type = %s 
        WHERE id = %s
        """
        local_db.execute_query(
            update_query,
            (project.icon, project.name, project.latest_version, project.latest_update_time,
             project.describe, project.summar, project.author, project.type, project_id)
        )
        
        # Get the updated project
        project_query = """
        SELECT id, icon, name, latest_version, latest_update_time, `describe`, summar, author, type 
        FROM projects 
        WHERE id = %s
        """
        project_data = local_db.execute_query(project_query, (project_id,))
        
        if not project_data:
            raise HTTPException(status_code=404, detail="Project not found after update")
        
        # Get versions
        versions_query = """
        SELECT id, project_id, version, update_time, content, download_url 
        FROM versions 
        WHERE project_id = %s 
        ORDER BY update_time DESC
        """
        versions_data = local_db.execute_query(versions_query, (project_id,))
        
        versions = [Version(**version) for version in versions_data] if versions_data else []
        
        return Project(
            **project_data[0],
            versions=versions
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in update_project: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error updating project: {str(e)}")
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

@app.get("/projects/{project_id}/versions", response_model=List[Version])
async def get_project_versions(project_id: int):
    """获取特定项目的版本列表"""
    local_db = None
    try:
        # Create new database connection for this request
        local_db = db.__class__()
        if not local_db.connect():
            raise HTTPException(status_code=500, detail="Failed to connect to database")

        # Check if project exists
        project_check = local_db.execute_query("SELECT id FROM projects WHERE id = %s", (project_id,))
        if not project_check:
            raise HTTPException(status_code=404, detail="Project not found")

        # Get versions for the project
        versions_query = """
        SELECT id, project_id, version, update_time, content, download_url
        FROM versions
        WHERE project_id = %s
        ORDER BY update_time DESC
        """
        versions_data = local_db.execute_query(versions_query, (project_id,))

        versions = [Version(**version) for version in versions_data] if versions_data else []

        return versions
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in get_project_versions: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error getting project versions: {str(e)}")
    finally:
        # Ensure database connection is closed
        if local_db:
            local_db.disconnect()

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