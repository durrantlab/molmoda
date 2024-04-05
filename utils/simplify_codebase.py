import os
import argparse
import glob
import re

def preprocess_file(file_path, src):
    with open(file_path, 'r') as file:
        contents = file.read()

    # Remove comments
    contents = re.sub(r'//.*', '', contents)
    contents = re.sub(r'/\*.*?\*/', '', contents, flags=re.DOTALL)
    contents = re.sub(r'<!--.*?-->', '', contents, flags=re.DOTALL)

    # Replace tab with space
    contents = contents.replace('\t', ' ')

    # Replace multiple spaces with single space
    contents = contents.replace("    ", " ")

    # remove trailing whitespace on each line
    contents = '\n'.join([line.rstrip() for line in contents.split('\n')])

    # Remove blank lines
    contents = re.sub(r'\n\s*\n', '\n', contents)

    # get file_path relative to src directory
    file_path = os.path.relpath(file_path, src)

    return "\n" + (f"================== {file_path} ==================\n{contents}".strip()) + "\n"

def main():
    parser = argparse.ArgumentParser(description='Prepare files for LLM evaluation')
    parser.add_argument('--include', action='append', default=[], help='Glob pattern to include files')
    parser.add_argument('--exclude', action='append', default=[], help='Glob pattern to exclude files')
    parser.add_argument('src', help='Source directory to search for files')

    args = parser.parse_args()

    include_patterns = args.include or ['*']
    exclude_patterns = args.exclude or []

    combined_contents = ''

    # Make a single includes list
    includes = []
    for pattern in include_patterns:
        includes.extend(glob.glob(os.path.join(args.src, '**', pattern), recursive=True))
    
    # Make a single excludes list
    excludes = []
    for exclude in exclude_patterns:
        excludes.extend(glob.glob(os.path.join(args.src, '**', exclude), recursive=True))

    # Filter out excludes from includes
    includes = [include for include in includes if include not in excludes]

    # print includes
    for include in includes:
        print(include)

    # wait
    input("Press Enter to continue...")
    
    for filename in includes:
        combined_contents += preprocess_file(filename, args.src)

    # Write to file
    with open('codebase.txt', 'w') as file:
        file.write(combined_contents)
    print(combined_contents)
    os.system('cat codebase.txt | pbcopy')

if __name__ == '__main__':
    main()