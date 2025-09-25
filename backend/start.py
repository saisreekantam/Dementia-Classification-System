#!/usr/bin/env python3
"""
Startup script for Dementia Detection API
"""

import subprocess
import sys
import os
from pathlib import Path

def check_python_version():
    """Check if Python version is 3.8+"""
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)

def check_models_exist():
    """Check if required ML model files exist"""
    required_files = [
        "model_control.pkl",
        "model_alz.pkl", 
        "vectorizer.pkl"
    ]
    
    missing_files = []
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print("Error: Missing required model files:")
        for file in missing_files:
            print(f"  - {file}")
        print("\nPlease ensure all ML model files are present in the backend directory.")
        return False
    
    return True

def install_dependencies():
    """Install required Python packages"""
    print("Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], 
                      check=True)
        print("Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError:
        print("Error: Failed to install dependencies")
        return False

def download_spacy_model():
    """Download required spaCy model"""
    print("Downloading spaCy English model...")
    try:
        subprocess.run([sys.executable, "-m", "spacy", "download", "en_core_web_sm"], 
                      check=True)
        print("spaCy model downloaded successfully!")
        return True
    except subprocess.CalledProcessError:
        print("Error: Failed to download spaCy model")
        return False

def setup_environment():
    """Setup environment file"""
    if not Path(".env").exists():
        if Path(".env.template").exists():
            print("Creating .env file from template...")
            subprocess.run(["cp", ".env.template", ".env"])
            print("Environment file created! Please review and update .env as needed.")
        else:
            print("Warning: No .env.template found. Please create a .env file manually.")

def initialize_database():
    """Initialize database with demo data"""
    print("Initializing database...")
    try:
        subprocess.run([sys.executable, "init_db.py", "demo"], check=True)
        print("Database initialized with demo data!")
        return True
    except subprocess.CalledProcessError:
        print("Error: Failed to initialize database")
        return False

def start_server(dev_mode=True):
    """Start the FastAPI server"""
    print(f"Starting server in {'development' if dev_mode else 'production'} mode...")
    
    if dev_mode:
        cmd = [
            "uvicorn", "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ]
    else:
        cmd = [
            "uvicorn", "main:app",
            "--host", "0.0.0.0",
            "--port", "8000"
        ]
    
    try:
        subprocess.run(cmd)
    except KeyboardInterrupt:
        print("\nServer stopped.")
    except subprocess.CalledProcessError:
        print("Error: Failed to start server")

def main():
    """Main function"""
    print("🧠 Dementia Detection API - Setup & Start Script")
    print("=" * 50)
    
    # Check Python version
    check_python_version()
    
    # Change to backend directory if not already there
    if not Path("main.py").exists():
        if Path("backend/main.py").exists():
            os.chdir("backend")
        else:
            print("Error: Cannot find main.py. Please run from project root or backend directory.")
            sys.exit(1)
    
    # Parse command line arguments
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "setup":
            print("Setting up development environment...")
            
            # Install dependencies
            if not install_dependencies():
                sys.exit(1)
            
            # Download spaCy model
            if not download_spacy_model():
                sys.exit(1)
            
            # Setup environment
            setup_environment()
            
            # Check for model files
            if not check_models_exist():
                print("\nSetup completed, but ML model files are missing.")
                print("Please add the required .pkl files before starting the server.")
                sys.exit(1)
            
            # Initialize database
            if not initialize_database():
                sys.exit(1)
            
            print("\n✅ Setup completed successfully!")
            print("\nNext steps:")
            print("1. Review and update .env file if needed")
            print("2. Run 'python start.py' to start the development server")
            print("3. Access API docs at http://localhost:8000/docs")
            
        elif command == "prod":
            print("Starting in production mode...")
            if not check_models_exist():
                sys.exit(1)
            start_server(dev_mode=False)
            
        elif command == "check":
            print("Checking system requirements...")
            
            checks = [
                ("Python version", lambda: sys.version_info >= (3, 8)),
                ("ML model files", check_models_exist),
                ("Environment file", lambda: Path(".env").exists()),
                ("Database file", lambda: Path("dementia_detection.db").exists())
            ]
            
            all_good = True
            for name, check_func in checks:
                try:
                    result = check_func()
                    status = "✅ OK" if result else "❌ FAIL"
                    print(f"{name}: {status}")
                    if not result:
                        all_good = False
                except Exception as e:
                    print(f"{name}: ❌ ERROR - {str(e)}")
                    all_good = False
            
            if all_good:
                print("\n✅ All checks passed! Ready to start server.")
            else:
                print("\n❌ Some checks failed. Please fix issues before starting.")
                
        else:
            print(f"Unknown command: {command}")
            print("Available commands: setup, prod, check")
            
    else:
        # Default: start development server
        print("Starting development server...")
        
        if not check_models_exist():
            print("\nWould you like to set up the environment first? (y/n)")
            if input().lower().startswith('y'):
                subprocess.run([sys.executable, __file__, "setup"])
                return
            else:
                sys.exit(1)
        
        start_server(dev_mode=True)

if __name__ == "__main__":
    main()