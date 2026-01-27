# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all
import sys
import os

block_cipher = None

# Collect dynamic imports for uvicorn
hidden_imports = [
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'engine',
    'backend.app',
    'backend.engine',
]

# Collect wavekit
wk_datas, wk_binaries, wk_hiddenimports = collect_all('wavekit')
hidden_imports += wk_hiddenimports

# Collect pywebview
pw_datas, pw_binaries, pw_hiddenimports = collect_all('webview')
hidden_imports += pw_hiddenimports

# Collect PyGObject (Linux)
if sys.platform.startswith('linux'):
    try:
        from PyInstaller.utils.hooks import collect_submodules
        hidden_imports += collect_submodules('gi')
    except Exception:
        pass

# Add frontend dist
# Ensure frontend/dist exists before running this, or PyInstaller might complain if it checks existence eagerly.
# We assume the build script guarantees this.
added_files = [
    ('frontend/dist', 'frontend/dist'),
]
added_files += wk_datas
added_files += pw_datas

a = Analysis(
    ['backend/main.py'],
    pathex=[],
    binaries=wk_binaries + pw_binaries,
    datas=added_files,
    hiddenimports=hidden_imports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)
pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='WaveGauge',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False, # Windowed mode for desktop app
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='WaveGauge',
)
