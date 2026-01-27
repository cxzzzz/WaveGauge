import os
import subprocess
import sys
import shutil
import platform

def run_command(command, cwd=None, shell=True):
    print(f"Running: {command} in {cwd or '.'}")
    try:
        subprocess.check_call(command, cwd=cwd, shell=shell)
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

def build_backend():
    print("--- Building Backend ---")
    # Install backend dependencies if needed (assuming they are installed in environment)
    # But for safety in CI/clean env, we might want to install them.
    # Here we assume the environment is already set up with requirements.
    
    run_command(f'{sys.executable} -m PyInstaller build.spec --clean --noconfirm')

def zip_artifact():
    print("--- Zipping Artifact ---")
    dist_dir = os.path.join(os.getcwd(), 'dist', 'WaveGauge')
    output_filename = f"WaveGauge-{platform.system()}-{platform.machine()}"
    
    shutil.make_archive(output_filename, 'zip', root_dir='dist', base_dir='WaveGauge')
    print(f"Created {output_filename}.zip")

def main():
    build_frontend()
    build_backend()
    zip_artifact()

if __name__ == '__main__':
    main()
