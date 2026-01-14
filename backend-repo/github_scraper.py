#!/usr/bin/env python3
"""
GitHub Releases Scraper
Scrapes GitHub releases from specified repositories and inserts data into the database.
"""

import requests
import re
import json
import os
import asyncio
import aiohttp
from datetime import datetime
from database import db
import markdownify
import time
from dotenv import load_dotenv

# Load environment variables from backend directory
backend_dir = os.path.dirname(__file__)
os.chdir(backend_dir)
load_dotenv()

# GitHub repositories to scrape
GITHUB_REPOS = [
    "https://github.com/vercel/next.js",
    "https://github.com/facebook/react"
]

# GitHub API headers
GITHUB_HEADERS = {
    "Accept": "application/vnd.github.v3+json",
    "User-Agent": "GitHub-Release-Scraper"
}

# Add GitHub token if available
github_token = os.getenv('GITHUB_TOKEN')
if github_token:
    GITHUB_HEADERS["Authorization"] = f"token {github_token}"

def parse_github_repo_url(url):
    """Parse GitHub repository URL to get owner and repo name"""
    match = re.match(r'https://github\.com/([^/]+)/([^/]+)', url)
    if match:
        return match.group(1), match.group(2)
    return None, None

def extract_version_from_tag(tag):
    """Extract version number from GitHub tag"""
    # Remove 'v' prefix if present
    version = tag.lstrip('v')
    # Ensure it starts with 'v' as per project convention
    return f"v{version}"

def clean_html_content(content):
    """Convert HTML content to Markdown format and remove HTML tags"""
    if not content:
        return ""
    try:
        if isinstance(content, bytes):
            content = content.decode('utf-8')
        
        # Use markdownify to convert HTML to Markdown with better formatting
        md_content = markdownify.markdownify(content, heading_style="ATX")
        # Clean up extra whitespace and newlines
        md_content = re.sub(r'\n\s*\n', '\n\n', md_content)
        md_content = re.sub(r'\n{3,}', '\n\n', md_content)  # Limit consecutive newlines to 2
        md_content = md_content.strip()
        return md_content
    except Exception as e:
        print(f"Error cleaning HTML content: {e}")
        # Fallback to simple tag removal
        clean = re.compile('<.*?>')
        cleaned_content = re.sub(clean, '', content).strip()
        return cleaned_content

async def fetch_github_releases(owner, repo, session):
    """Fetch releases from GitHub API"""
    all_releases = []
    page = 1
    per_page = 100  # Maximum per page
    
    while True:
        releases_url = f"https://api.github.com/repos/{owner}/{repo}/releases?page={page}&per_page={per_page}"
        try:
            async with session.get(releases_url, headers=GITHUB_HEADERS) as response:
                response.raise_for_status()
                releases = await response.json()
                
                if not releases:
                    break
                    
                all_releases.extend(releases)
                print(f"    Fetched page {page}: {len(releases)} releases")
                
                # If we got less than per_page, we're done
                if len(releases) < per_page:
                    break
                    
                page += 1
                
                # Small delay to avoid rate limiting
                await asyncio.sleep(0.5)
                
        except Exception as e:
            print(f"Error fetching releases for {owner}/{repo}: {e}")
            break
    
    print(f"    Total releases fetched: {len(all_releases)}")
    return all_releases

async def process_release(release, project_id, existing_versions, owner, repo):
    """Process a single GitHub release"""
    try:
        # Skip pre-releases
        if release.get('prerelease', False):
            print(f"\nSkipping pre-release: {release['name'] or release['tag_name']}")
            return None
        
        print(f"\nProcessing release: {release['name'] or release['tag_name']}")
        start_time = time.time()
        
        # Extract version from tag
        version = extract_version_from_tag(release['tag_name'])
        
        # Parse release date
        release_date = datetime.strptime(release['published_at'], '%Y-%m-%dT%H:%M:%SZ').date()
        
        # Get release content
        content = release['body'] or f"Release {release['tag_name']}"
        
        # Clean HTML content
        clean_content = clean_html_content(content)
        
        # Get download URL (use zipball URL)
        download_url = release.get('zipball_url', f"https://github.com/{owner}/{repo}/archive/refs/tags/{release['tag_name']}.zip")
        
        print(f"Finished processing release: {release['name'] or release['tag_name']}. Took {time.time() - start_time:.2f} seconds.")
        
        return {
            'version': version,
            'update_date': release_date,
            'content': clean_content,
            'download_url': download_url,
            'project_id': project_id,
            'is_new': version not in existing_versions
        }
    except Exception as e:
        print(f"  Error processing release '{release.get('name', 'Unknown')}': {e}")
        return None

def save_versions_to_db(versions_data):
    """Save all version data to database in batches"""
    try:
        # Separate new and existing versions
        new_versions = [v for v in versions_data if v['is_new']]
        existing_versions = [v for v in versions_data if not v['is_new']]
        
        # Batch insert new versions
        if new_versions:
            print(f"\nAdding {len(new_versions)} new versions...")
            start_time = time.time()
            insert_query = "INSERT INTO versions (project_id, version, update_time, content, download_url) VALUES (%s, %s, %s, %s, %s)"
            # Prepare data for batch insert
            insert_data = [
                (v['project_id'], v['version'], v['update_date'], v['content'], v['download_url'])
                for v in new_versions
            ]
            # Execute batch insert
            for data in insert_data:
                db.execute_query(insert_query, data)
            print(f"Added {len(new_versions)} new versions. Took {time.time() - start_time:.2f} seconds.")
        
        # Batch update existing versions
        if existing_versions:
            print(f"\nUpdating {len(existing_versions)} existing versions...")
            start_time = time.time()
            update_query = "UPDATE versions SET update_time = %s, content = %s, download_url = %s WHERE project_id = %s AND version = %s"
            # Prepare data for batch update
            update_data = [
                (v['update_date'], v['content'], v['download_url'], v['project_id'], v['version'])
                for v in existing_versions
            ]
            # Execute batch update
            for data in update_data:
                db.execute_query(update_query, data)
            print(f"Updated {len(existing_versions)} existing versions. Took {time.time() - start_time:.2f} seconds.")
        
        return True
    except Exception as e:
        print(f"Error saving versions to database: {e}")
        return False

async def scrape_github_releases():
    """Scrape GitHub releases from all configured repositories"""
    try:
        if not db.connect():
            print("Failed to connect to database")
            return False

        async with aiohttp.ClientSession() as session:
            all_processed_data = []
            
            for repo_url in GITHUB_REPOS:
                owner, repo = parse_github_repo_url(repo_url)
                if not owner or not repo:
                    print(f"Invalid repository URL: {repo_url}")
                    continue
                
                print(f"\n{'='*50}")
                print(f"Processing repository: {owner}/{repo}")
                print(f"{'='*50}")
                
                # Get or create the project
                project_name = f"{owner}/{repo}"
                project_query = "SELECT id FROM projects WHERE name = %s LIMIT 1"
                existing_project = db.execute_query(project_query, (project_name,))
                project_id = None
                
                if existing_project:
                    project_id = existing_project[0]['id']
                    print(f"Found existing project '{project_name}' with ID: {project_id}")
                else:
                    print(f"Creating new project '{project_name}'...")
                    # Try to get repository info for icon
                    icon = 'PKG'
                    repo_info_url = f"https://api.github.com/repos/{owner}/{repo}"
                    try:
                        async with session.get(repo_info_url, headers=GITHUB_HEADERS) as response:
                            if response.status == 200:
                                repo_info = await response.json()
                                # Use language as icon or default to 📦
                                icon = repo_info.get('language', 'PKG')
                                if icon == 'JavaScript':
                                    icon = 'JS'
                                elif icon == 'TypeScript':
                                    icon = 'TS'
                                elif icon == 'Python':
                                    icon = 'PY'
                                elif icon == 'Java':
                                    icon = 'JV'
                                elif icon == 'Go':
                                    icon = 'GO'
                                elif icon == 'Rust':
                                    icon = 'RS'
                                else:
                                    icon = 'PKG'
                    except:
                        pass
                    
                    insert_query = "INSERT INTO projects (icon, name) VALUES (%s, %s)"
                    project_id = db.execute_query(insert_query, (icon, project_name))
                    if project_id:
                        print(f"Created new project '{project_name}' with ID: {project_id}")
                    else:
                        print(f"Failed to create project '{project_name}'")
                        continue
                
                # Fetch existing versions for this project
                print(f"Fetching existing versions for {project_name}...")
                versions_query = "SELECT version FROM versions WHERE project_id = %s"
                results = db.execute_query(versions_query, (project_id,))
                existing_versions = {row['version'] for row in results} if results else set()
                print(f"Found {len(existing_versions)} existing versions")
                
                # Fetch releases from GitHub
                print(f"Fetching releases from GitHub API...")
                releases = await fetch_github_releases(owner, repo, session)
                if not releases:
                    print(f"No releases found for {owner}/{repo}")
                    continue
                
                print(f"Found {len(releases)} releases")
                
                # Process releases in batches
                batch_size = 3
                repo_processed_data = []
                
                for i in range(0, len(releases), batch_size):
                    batch = releases[i:i+batch_size]
                    print(f"\nProcessing batch {i//batch_size + 1} ({len(batch)} releases)...")
                    
                    # Create tasks for processing releases in this batch
                    tasks = [process_release(release, project_id, existing_versions, owner, repo) for release in batch]
                    
                    # Wait for all tasks in this batch to complete
                    batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    # Collect results
                    for result in batch_results:
                        if result and not isinstance(result, Exception):
                            repo_processed_data.append(result)
                    
                    # Small delay between batches
                    if i + batch_size < len(releases):
                        print("Waiting 2 seconds before next batch...")
                        await asyncio.sleep(2)
                
                # Add processed data to overall collection
                all_processed_data.extend(repo_processed_data)
                
                # Update project's latest version info
                if releases:
                    latest_release = releases[0]
                    latest_version = extract_version_from_tag(latest_release['tag_name'])
                    latest_date = datetime.strptime(latest_release['published_at'], '%Y-%m-%dT%H:%M:%SZ').date()
                    print(f"\nUpdating project's latest version info...")
                    update_project_query = "UPDATE projects SET latest_version = %s, latest_update_time = %s WHERE id = %s"
                    db.execute_query(update_project_query, (latest_version, latest_date, project_id))
                    print(f"Updated project to latest version: {latest_version}")
            
            # Save all collected data to database
            if all_processed_data:
                print(f"\n{'='*50}")
                print(f"Saving {len(all_processed_data)} processed releases to database...")
                print(f"{'='*50}")
                save_versions_to_db(all_processed_data)

        print("\nGitHub releases scraping completed successfully!")
        return True
    except Exception as e:
        print(f"Error scraping GitHub releases: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    # Run the async function
    import asyncio
    import sys
    
    # Set a longer timeout for the entire script on Windows
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(scrape_github_releases())
