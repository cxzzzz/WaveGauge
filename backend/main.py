import sys
import threading
import socket
import time
import os

try:
    import uvicorn
    # Optional GUI dependency
    try:
        import webview
    except ImportError:
        webview = None
except ImportError as e:
    print(f"Error importing required packages: {e}")
    print("Please install dependencies: pip install -e .[dev] or pip install uvicorn")
    sys.exit(1)

try:
    from backend.app import app
except ImportError:
    # Fallback if run directly or in flattened environment
    try:
        from app import app
    except ImportError:
        import sys
        from pathlib import Path
        sys.path.append(str(Path(__file__).parent))
        from app import app

def get_free_port():
    """Find a free port on localhost"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        return s.getsockname()[1]

def start_server(host, port):
    """Run uvicorn server"""
    # log_level="error" to keep console clean for desktop app
    uvicorn.run(app, host=host, port=port, log_level="error")

def start_desktop():
    """Start in desktop mode"""
    port = get_free_port()
    host = "127.0.0.1"
    
    print(f"Starting WaveGauge Desktop on http://{host}:{port}")
    
    # Start server in background thread
    t = threading.Thread(target=start_server, args=(host, port))
    t.daemon = True
    t.start()
    
    # Wait for server to be ready
    server_ready = False
    for i in range(20): # Wait up to 10 seconds
        try:
            with socket.create_connection((host, port), timeout=1):
                server_ready = True
                break
        except (OSError, ConnectionRefusedError):
            time.sleep(0.5)
    
    if not server_ready:
        print("Failed to start server in time.")
        sys.exit(1)

    webview.create_window("WaveGauge", f"http://{host}:{port}", width=1200, height=800)
    webview.start()

def start_web_server():
    """Start in standard server mode"""
    # Allow port configuration via env vars or args in future
    # Default to 8000 as in app.py
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    print(f"Starting WaveGauge Server at http://{host}:{port}")
    uvicorn.run(app, host=host, port=port)

if __name__ == "__main__":
    # If packaged (frozen), default to desktop unless "server" arg is given
    if getattr(sys, 'frozen', False):
        if len(sys.argv) > 1 and sys.argv[1] == "server":
            start_web_server()
        else:
            start_desktop()
    # Dev mode
    elif len(sys.argv) > 1 and sys.argv[1] == "desktop":
        start_desktop()
    else:
        start_web_server()
