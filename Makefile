SHELL := /bin/bash

# Configuration
PYTHON_BIN ?= python3
VENV_DIR ?= backend/.venv
HOST ?= 0.0.0.0
PORT ?= 8000

.PHONY: help install dev-server dev-desktop build-exe build-source clean

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install dependencies (frontend & backend)
	@echo "--- Installing Backend Dependencies ---"
	cd backend && $(PYTHON_BIN) -m pip install -e .[dev]
	@echo "--- Installing Frontend Dependencies ---"
	cd frontend && npm install

dev-server: ## Run development server (backend only)
	@echo "--- Starting Development Server ---"
	HOST=$(HOST) PORT=$(PORT) ./scripts/run.sh

dev-desktop: ## Run development desktop app
	@echo "--- Starting Development Desktop App ---"
	./scripts/run.sh desktop

build-exe: ## Build executable (desktop app)
	@echo "--- Building Executable ---"
	$(PYTHON_BIN) scripts/build.py --type exe

build-source: ## Build source package
	@echo "--- Building Source Package ---"
	$(PYTHON_BIN) scripts/build.py --type source

clean: ## Clean build artifacts
	@echo "--- Cleaning ---"
	rm -rf dist build
	rm -rf backend/__pycache__ backend/*.pyc
	rm -rf backend/build backend/dist backend/*.egg-info
	rm -rf frontend/dist
