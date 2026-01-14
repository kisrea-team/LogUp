#!/usr/bin/env python3
"""
Update GitHub releases content with proper formatting
"""

import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor
from database import db
from models import Project, Version
from tencentcloud.common import credential
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile
from tencentcloud.tmt.v20180321 import tmt_client, models
from dotenv import load_dotenv
import os
import markdownify
import re
from bs4 import BeautifulSoup

# Load environment variables
backend_dir = os.path.dirname(__file__)
os.chdir(backend_dir)
load_dotenv()

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

def translate_to_chinese_sync(text):
    """Translate text to Chinese using Tencent Translate API (synchronous version)"""
    if not text or not isinstance(text, str) or not any(c.isalpha() for c in text):
        return text

    try:
        secret_id = os.getenv('TENCENT_SECRET_ID')
        secret_key = os.getenv('TENCENT_SECRET_KEY')
        region = os.getenv('TENCENT_REGION', 'ap-beijing')
        
        if not secret_id or not secret_key:
            raise ValueError("Tencent translation credentials not found")

        cred = credential.Credential(secret_id, secret_key)
        http_profile = HttpProfile(endpoint="tmt.tencentcloudapi.com")
        client_profile = ClientProfile(httpProfile=http_profile)
        client = tmt_client.TmtClient(cred, region, client_profile)
        
        # If text is too long, split it into chunks
        max_length = 5000  # Leave some buffer for API limit
        if len(text) > max_length:
            print(f"    Text is too long ({len(text)} chars), splitting into chunks...")
            return translate_long_text(text, client)
        
        req = models.TextTranslateRequest()
        req.SourceText = text
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        resp = client.TextTranslate(req)
        
        if resp.TargetText and any('\u4e00' <= char <= '\u9fff' for char in resp.TargetText):
            return resp.TargetText
        else:
            raise ValueError(f"Translation result did not contain Chinese characters. API response: {resp.TargetText}")

    except Exception as e:
        print(f"Translation error occurred: {e}")
        raise

def translate_long_text(text, client):
    """Translate long text by splitting into chunks"""
    max_length = 5000
    chunks = []
    
    # Split by paragraphs first to preserve structure
    paragraphs = text.split('\n\n')
    current_chunk = ""
    
    for para in paragraphs:
        # If adding this paragraph would exceed the limit, save current chunk and start new one
        if len(current_chunk) + len(para) + 2 > max_length and current_chunk:
            chunks.append(current_chunk)
            current_chunk = para
        else:
            if current_chunk:
                current_chunk += '\n\n' + para
            else:
                current_chunk = para
    
    # Add the last chunk
    if current_chunk:
        chunks.append(current_chunk)
    
    print(f"    Split into {len(chunks)} chunks")
    
    # Translate each chunk
    translated_chunks = []
    for i, chunk in enumerate(chunks):
        print(f"    Translating chunk {i+1}/{len(chunks)} ({len(chunk)} chars)...")
        req = models.TextTranslateRequest()
        req.SourceText = chunk
        req.Source = "en"
        req.Target = "zh"
        req.ProjectId = 0
        
        resp = client.TextTranslate(req)
        if resp.TargetText:
            translated_chunks.append(resp.TargetText)
            # Small delay to avoid rate limiting
            time.sleep(0.1)
        else:
            # If translation fails, keep original chunk
            translated_chunks.append(chunk)
    
    # Combine translated chunks
    return '\n\n'.join(translated_chunks)

async def translate_to_chinese(text):
    """Translate text to Chinese using Tencent Translate API (asynchronous version)"""
    loop = asyncio.get_event_loop()
    with ThreadPoolExecutor() as executor:
        return await loop.run_in_executor(executor, translate_to_chinese_sync, text)

async def fetch_github_release(owner, repo, tag, session):
    """Fetch a specific GitHub release"""
    release_url = f"https://api.github.com/repos/{owner}/{repo}/releases/tags/{tag}"
    try:
        async with session.get(release_url, headers={
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "GitHub-Release-Scraper",
            "Authorization": f"token {os.getenv('GITHUB_TOKEN')}"
        }) as response:
            response.raise_for_status()
            return await response.json()
    except Exception as e:
        print(f"Error fetching release {tag}: {e}")
        return None

async def update_existing_versions():
    """Update existing versions with proper formatting"""
    try:
        if not db.connect():
            print("Failed to connect to database")
            return False

        # Get all GitHub project versions
        query = """
            SELECT v.id, v.version, v.content, p.name as project_name
            FROM versions v
            JOIN projects p ON v.project_id = p.id
            WHERE p.name LIKE '%github.com%' OR p.name LIKE '%/%'
            ORDER BY p.id, v.update_time DESC
        """
        versions = db.execute_query(query)
        
        if not versions:
            print("No GitHub versions found to update")
            return True
        
        print(f"Found {len(versions)} versions to update")
        
        # Group by project
        projects = {}
        for v in versions:
            project_name = v['project_name']
            if project_name not in projects:
                projects[project_name] = []
            projects[project_name].append(v)
        
        async with aiohttp.ClientSession() as session:
            for project_name, project_versions in projects.items():
                print(f"\n{'='*50}")
                print(f"Updating project: {project_name}")
                print(f"{'='*50}")
                
                # Parse owner and repo from project name
                if '/' in project_name:
                    owner, repo = project_name.split('/', 1)
                else:
                    continue
                
                for version_data in project_versions:  # Update all versions
                    version = version_data['version']
                    version_id = version_data['id']
                    
                    print(f"\nProcessing version: {version}")
                    
                    # Fetch fresh release data
                    release = await fetch_github_release(owner, repo, version, session)
                    if not release:
                        print(f"  Could not fetch release data for {version}")
                        continue
                    
                    # Get and clean content
                    content = release.get('body', '')
                    if not content:
                        print(f"  No content found for {version}")
                        continue
                    
                    # Clean with markdownify
                    clean_content = clean_html_content(content)
                    
                    # Translate to Chinese
                    try:
                        print(f"  Translating content...")
                        translated_content = await translate_to_chinese(clean_content)
                        print(f"  Translation successful")
                    except Exception as e:
                        print(f"  Translation failed: {e}")
                        print(f"  Using cleaned content without translation")
                        translated_content = clean_content
                    
                    # Update database
                    update_query = """
                        UPDATE versions 
                        SET content = %s 
                        WHERE id = %s
                    """
                    db.execute_query(update_query, (translated_content, version_id))
                    print(f"  Updated version {version}")
                    
                    # Small delay
                    await asyncio.sleep(1)

        print("\nUpdate completed successfully!")
        return True
    except Exception as e:
        print(f"Error updating versions: {e}")
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
    
    asyncio.run(update_existing_versions())