import os
import subprocess
import sys
import shutil
import platform
import argparse

def run_command(command, cwd=None, shell=True, env=None):
    print(f"Running: {command} in {cwd or '.'}")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell, env=env)
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {command}")
        sys.exit(1)

def build_frontend():
    print("--- Building Frontend ---")
    frontend_dir = os.path.join(os.getcwd(), 'frontend')
    
    # Check if node_modules exists, if not install
    if not os.path.exists(os.path.join(frontend_dir, 'node_modules')):
        run_command('npm install', cwd=frontend_dir)
    
    run_command('npm run build', cwd=frontend_dir)

def build_backend(mode='desktop'):
    print(f"--- Building Backend ({mode}) ---")
    # Install backend dependencies if needed (assuming they are installed in environment)
    # But for safety in CI/clean env, we might want to install them.
    # Here we assume the environment is already set up with requirements.
    
    env = os.environ.copy()
    env['BUILD_MODE'] = mode
    
    run_command(f'{sys.executable} -m PyInstaller build.spec --clean --noconfirm', env=env)

def get_version():
    try:
        with open(os.path.join('backend', 'pyproject.toml'), 'r') as f:
            for line in f:
                if line.strip().startswith('version ='):
                    return line.split('=')[1].strip().strip('"').strip("'")
    except Exception:
        return "0.0.0"
    return "0.0.0"

def zip_artifact(mode='desktop'):
    print(f"--- Zipping Artifact ({mode}) ---")
    dist_dir = os.path.join(os.getcwd(), 'dist', 'WaveGauge' if mode == 'desktop' else 'WaveGauge-Server')
    version = get_version()
    suffix = "-Server" if mode == 'server' else ""
    output_filename = f"WaveGauge{suffix}-{version}-{platform.system()}-{platform.machine()}"
    
    # shutil.make_archive defaults to zip
    # root_dir is the directory that will be the root of the archive
    # base_dir is the directory inside root_dir that we want to archive
    base_dir = 'WaveGauge' if mode == 'desktop' else 'WaveGauge-Server'
    shutil.make_archive(os.path.join('dist', output_filename), 'zip', root_dir='dist', base_dir=base_dir)
    print(f"Created dist/{output_filename}.zip")

def package_source():
    version = get_version()
    print(f"--- Packaging Source (Version: {version}) ---")
    
    output_name = f"WaveGauge-{version}-Source"
    dist_dir = os.path.join(os.getcwd(), 'dist')
    package_dir = os.path.join(dist_dir, output_name)
    
    if os.path.exists(package_dir):
        shutil.rmtree(package_dir)
    os.makedirs(package_dir)
    
    # Copy Backend
    print("Copying backend...")
    shutil.copytree('backend', os.path.join(package_dir, 'backend'), 
                    ignore=shutil.ignore_patterns('__pycache__', '.venv', '.pytest_cache', '*.pyc', 'build', 'dist', '*.egg-info'))
    
    # Copy Frontend build artifacts
    print("Copying frontend...")
    frontend_dest = os.path.join(package_dir, 'frontend')
    os.makedirs(frontend_dest)
    if os.path.exists(os.path.join('frontend', 'dist')):
        shutil.copytree(os.path.join('frontend', 'dist'), os.path.join(frontend_dest, 'dist'))
    if os.path.exists(os.path.join('frontend', 'package.json')):
        shutil.copy2(os.path.join('frontend', 'package.json'), frontend_dest)
    
    # Copy root files
    for file in ['README.md', 'LICENSE', 'Makefile']:
        if os.path.exists(file):
            shutil.copy2(file, package_dir)

    # Copy scripts
    if os.path.exists('scripts'):
        print("Copying scripts...")
        shutil.copytree('scripts', os.path.join(package_dir, 'scripts'), 
                        ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    
    # Copy data (if exists)
    if os.path.exists('data'):
        print("Copying data...")
        shutil.copytree('data', os.path.join(package_dir, 'data'))
            
    # Zip
    print("Zipping Source Package...")
    shutil.make_archive(os.path.join('dist', output_name), 'zip', root_dir='dist', base_dir=output_name)
    print(f"Created dist/{output_name}.zip")

def main():
    parser = argparse.ArgumentParser(description='Build WaveGauge')
    parser.add_argument('--type', choices=['exe', 'source', 'all'], default='exe', help='Build type: exe (default), source, or all')
    parser.add_argument('--mode', choices=['desktop', 'server'], default='desktop', help='Build mode: desktop (default) or server (no GUI)')
    parser.add_argument('--skip-frontend', action='store_true', help='Skip frontend build (use existing dist)')
    args = parser.parse_args()
    
    if not args.skip_frontend:
        build_frontend()
    
    if args.type in ['exe', 'all']:
        build_backend(mode=args.mode)
        zip_artifact(mode=args.mode)
        
    if args.type in ['source', 'all']:
        package_source()

if __name__ == '__main__':
    main()
