import os
import filecmp

workspace_root = "/Users/kurr/Documents/secret_projects/rerendet_website"
clean_root = "/Users/kurr/Documents/secret_projects/rerendet_website/tmp/rerendet_temp.nosync"

ignored_dirs = {".git", "node_modules", "tmp", "..bfg-report", "client/node_modules", "client/node_modules 2"}
ignored_files = {".DS_Store"}

# Only check code and text configuration files
allowed_extensions = {".js", ".jsx", ".css", ".json", ".html", ".sh", ".env", ".yml", ".yaml", ".py"}

modified_files = []
added_files = []

for root, dirs, files in os.walk(workspace_root):
    # prune ignored directories in-place
    dirs[:] = [d for d in dirs if d not in ignored_dirs]
    
    for file in files:
        if file in ignored_files:
            continue
            
        ext = os.path.splitext(file)[1].lower()
        # also handle exact filenames like .env
        if ext not in allowed_extensions and file not in allowed_extensions:
            continue
            
        full_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_path, workspace_root)
        
        clean_path = os.path.join(clean_root, rel_path)
        
        if not os.path.exists(clean_path):
            added_files.append(rel_path)
        else:
            if not filecmp.cmp(full_path, clean_path, shallow=False):
                modified_files.append(rel_path)

print("=== MODIFIED CODE FILES ===")
for f in sorted(modified_files):
    print(f)

print("\n=== ADDED CODE FILES ===")
for f in sorted(added_files):
    print(f)
