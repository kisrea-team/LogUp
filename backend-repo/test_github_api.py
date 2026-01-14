#!/usr/bin/env python3
"""
Test GitHub API without authentication
"""

import requests
import json
import time

def test_github_api():
    # Test without authentication first
    repos = [
        "https://github.com/vercel/next.js",
        "https://github.com/facebook/react"
    ]
    
    for repo_url in repos:
        print(f"\n{'='*50}")
        print(f"Testing {repo_url}")
        print(f"{'='*50}")
        
        # Parse repo URL
        if "github.com/" in repo_url:
            parts = repo_url.split("github.com/")[1].split("/")
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1]
                
                # Try without auth first
                url = f"https://api.github.com/repos/{owner}/{repo}/releases"
                headers = {
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "GitHub-Release-Scraper"
                }
                
                try:
                    print("Trying without authentication...")
                    response = requests.get(url, headers=headers, timeout=10)
                    print(f"Status: {response.status_code}")
                    
                    if response.status_code == 200:
                        releases = response.json()
                        print(f"Success! Found {len(releases)} releases")
                        if releases:
                            print(f"Latest: {releases[0].get('name', 'No name')} - {releases[0].get('published_at', 'No date')}")
                    elif response.status_code == 403:
                        print("Rate limited. Checking rate limit info...")
                        remaining = response.headers.get('X-RateLimit-Remaining', 'unknown')
                        reset = response.headers.get('X-RateLimit-Reset', 'unknown')
                        print(f"Remaining requests: {remaining}")
                        print(f"Reset time: {time.ctime(int(reset)) if reset != 'unknown' else 'unknown'}")
                    else:
                        print(f"Error: {response.text[:200]}")
                        
                except Exception as e:
                    print(f"Error: {e}")

if __name__ == "__main__":
    test_github_api()