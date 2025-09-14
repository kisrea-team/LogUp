import requests
import json
import time

# 测试项目列表API
def test_projects_api():
    print("Testing /projects API...")

    # 记录开始时间
    start_time = time.time()

    try:
        # 调用项目列表API
        response = requests.get("http://localhost:8000/projects?page=1&per_page=5")

        # 记录结束时间
        end_time = time.time()

        print(f"API call took: {end_time - start_time:.2f} seconds")
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Total projects: {data['total']}")
            print(f"Page: {data['page']} of {data['total_pages']}")
            print(f"Projects returned: {len(data['data'])}")

            # 检查第一个项目的版本数据
            if data['data']:
                first_project = data['data'][0]
                print(f"\nFirst project: {first_project['name']}")
                print(f"Versions count: {len(first_project['versions'])}")
                if first_project['versions']:
                    print("WARNING: Version data is still being loaded!")
                    print(f"First version: {first_project['versions'][0]['version']}")
                else:
                    print("✓ No version data loaded (good for performance)")
        else:
            print(f"Error: {response.text}")

    except Exception as e:
        print(f"Error calling API: {e}")

if __name__ == "__main__":
    test_projects_api()