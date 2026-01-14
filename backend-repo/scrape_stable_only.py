#!/usr/bin/env python3
"""
Efficient GitHub releases scraper for stable versions only
"""

import requests
import json
import os
import time
from datetime import datetime
from database import db
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
from dotenv import load_dotenv

# Load environment variables
backend_dir = os.path.dirname(__file__)
os.chdir(backend_dir)
load_dotenv()

def translate_text(text):
    """Simple translation function with fallback"""
    if not text or len(text.strip()) == 0:
        return text
    
    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        if not secret_id or not secret_key:
            return text
        
        # Skip if too long
        if len(text) > 5000:
            return text[:2000] + "\n\n[内容过长，已截断]"
        
        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile(endpoint="tmt.tencentcloudapi.com")
        client_profile = ClientProfile(httpProfile=http_profile)
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        resp = client.TextTranslate(req)
        return resp.TargetText if resp.TargetText else text
    except:
        return text

def get_all_releases(owner, repo):
    """Get all releases with pagination"""
    all_releases = []
    page = 1
    per_page = 100
    
    while True:
        url = f"https://api.github.com/repos/{owner}/{repo}/releases?page={page}&per_page={per_page}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Release-Scraper"
        }
        
        try:
            response = requests.get(url, headers=headers, timeout=30)
            if response.status_code == 200:
                releases = response.json()
                if not releases:
                    break
                
                # Filter only stable releases
                stable_releases = [r for r in releases if not r.get('prerelease', False)]
                all_releases.extend(stable_releases)
                
                print(f"  Page {page}: {len(stable_releases)} stable releases")
                
                if len(releases) < per_page:
                    break
                
                page += 1
                time.sleep(0.5)  # Avoid rate limiting
            else:
                print(f"  Error fetching page {page}: {response.status_code}")
                break
        except Exception as e:
            print(f"  Error: {e}")
            break
    
    return all_releases

def scrape_stable_releases():
    """Scrape stable releases for all repositories"""
    repos = [
        ("vercel", "next.js"),
        ("facebook", "react")
    ]
    
    if not db.connect():
        print("Failed to connect to database")
        return False
    
    try:
        for owner, repo in repos:
            print(f"\n{'='*60}")
            print(f"Scraping {owner}/{repo}")
            print(f"{'='*60}")
            
            # Get or create project
            project_name = f"{owner}/{repo}"
            project = db.execute_query("SELECT id FROM projects WHERE name = %s", (project_name,))
            
            if project:
                project_id = project[0]['id']
                print(f"Found existing project: {project_name} (ID: {project_id})")
            else:
                # Create project
                icon = "JS"  # Default icon
                project_id = db.execute_query("INSERT INTO projects (icon, name) VALUES (%s, %s)", (icon, project_name))
                print(f"Created new project: {project_name} (ID: {project_id})")
            
            # Get existing versions
            existing_versions = set()
            versions_data = db.execute_query("SELECT version FROM versions WHERE project_id = %s", (project_id,))
            if versions_data:
                existing_versions = {v['version'] for v in versions_data}
            print(f"Existing versions: {len(existing_versions)}")
            
            # Fetch all releases
            print("Fetching all releases...")
            releases = get_all_releases(owner, repo)
            print(f"Total stable releases found: {len(releases)}")
            
            # Process releases (latest first)
            new_count = 0
            for release in releases[:50]:  # Limit to latest 50 for testing
                tag_name = release.get('tag_name', '')
                version = tag_name.lstrip('v')
                if not version.startswith('v'):
                    version = f"v{version}"
                
                # Skip if already exists
                if version in existing_versions:
                    continue
                
                print(f"\nProcessing: {version}")
                
                # Parse date
                published_at = release.get('published_at', '')
                if published_at:
                    update_date = datetime.strptime(published_at.split('T')[0], '%Y-%m-%d').date()
                else:
                    update_date = datetime.now().date()
                
                # Get content
                body = release.get('body', '')[:3000]  # Limit content
                
                # Translate
                print("  Translating...")
                content = translate_text(body)
                
                # Save to database
                download_url = release.get('zipball_url', f"https://github.com/{owner}/{repo}/archive/refs/tags/{tag_name}.zip")
                
                result = db.execute_query(
                    "INSERT INTO versions (project_id, version, update_time, content, download_url) VALUES (%s, %s, %s, %s, %s)",
                    (project_id, version, update_date, content, download_url)
                )
                
                if result:
                    print(f"  [OK] Saved: {version}")
                    new_count += 1
                    existing_versions.add(version)
                else:
                    print(f"  [ERROR] Failed to save: {version}")
                
                # Small delay
                time.sleep(1)
            
            # Update project latest version
            if releases:
                latest = releases[0]
                latest_tag = latest.get('tag_name', '')
                latest_version = latest_tag.lstrip('v')
                if not latest_version.startswith('v'):
                    latest_version = f"v{latest_version}"
                
                latest_date = datetime.strptime(latest.get('published_at', '').split('T')[0], '%Y-%m-%d').date()
                
                db.execute_query(
                    "UPDATE projects SET latest_version = %s, latest_update_time = %s WHERE id = %s",
                    (latest_version, latest_date, project_id)
                )
                print(f"\nUpdated project latest version: {latest_version}")
            
            print(f"\nAdded {new_count} new versions for {owner}/{repo}")
        
        print("\n" + "="*60)
        print("Scraping completed successfully!")
        return True
        
    except Exception as e:
        print(f"Error: {e}")
        return False
    finally:
        db.disconnect()

if __name__ == "__main__":
    scrape_stable_releases()