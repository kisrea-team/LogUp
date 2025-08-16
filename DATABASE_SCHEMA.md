# Database Schema

## Projects Table

```sql
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    icon VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    latest_version VARCHAR(50),
    latest_update_time DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Versions Table

```sql
CREATE TABLE versions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    version VARCHAR(50) NOT NULL,
    update_time DATE NOT NULL,
    content TEXT,
    download_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);
```

## Indexes

```sql
CREATE INDEX idx_projects_name ON projects(name);
CREATE INDEX idx_versions_project_id ON versions(project_id);
CREATE INDEX idx_versions_update_time ON versions(update_time);
```