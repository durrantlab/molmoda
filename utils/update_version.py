#!/usr/bin/env python3

import json
import os
from datetime import datetime

def update_version():
    # Get current date and create version string (year.month.day with no leading zeros)
    now = datetime.now()
    version = f"{now.year}.{now.month}.{now.day}"
    
    # Update last_updated.json
    last_updated_path = "../src/last_updated.json"
    
    # Check if the file exists
    if not os.path.exists(last_updated_path):
        print(f"Error: {last_updated_path} not found!")
        return
    
    # Read the existing JSON file
    try:
        with open(last_updated_path, 'r') as f:
            last_updated_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {last_updated_path}: {e}")
        return
    
    # Add version to the data
    last_updated_data["version"] = version
    
    # Write back to the file
    try:
        with open(last_updated_path, 'w') as f:
            json.dump(last_updated_data, f)
        print(f"Updated {last_updated_path} with version: {version}")
    except IOError as e:
        print(f"Error writing to {last_updated_path}: {e}")
        return
    
    # Update package.json
    package_path = "../package.json"
    
    # Check if package.json exists
    if not os.path.exists(package_path):
        print(f"Error: {package_path} not found!")
        return
    
    # Read the existing package.json file
    try:
        with open(package_path, 'r') as f:
            package_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {package_path}: {e}")
        return
    
    # Update version in package.json
    package_data["version"] = version
    
    # Write back to package.json with 4-space indentation
    try:
        with open(package_path, 'w') as f:
            json.dump(package_data, f, indent=4)
        print(f"Updated {package_path} with version: {version}")
    except IOError as e:
        print(f"Error writing to {package_path}: {e}")
        return
    
    # Update package-lock.json
    package_lock_path = "../package-lock.json"
    
    # Check if package-lock.json exists
    if not os.path.exists(package_lock_path):
        print(f"Error: {package_lock_path} not found!")
        return
    
    # Read the existing package-lock.json file
    try:
        with open(package_lock_path, 'r') as f:
            package_lock_data = json.load(f)
    except (json.JSONDecodeError, IOError) as e:
        print(f"Error reading {package_lock_path}: {e}")
        return
    
    # Update version in package-lock.json
    package_lock_data["version"] = version
    
    # Write back to package-lock.json with 4-space indentation
    try:
        with open(package_lock_path, 'w') as f:
            json.dump(package_lock_data, f, indent=4)
        print(f"Updated {package_lock_path} with version: {version}")
    except IOError as e:
        print(f"Error writing to {package_lock_path}: {e}")

if __name__ == "__main__":
    update_version()