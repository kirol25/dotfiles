#!/bin/bash

# Update Homebrew
echo "Updating Homebrew..."
brew update

# Install Git
echo "Installing Git..."
brew install git

# Install Python
echo "Installing Python..."
brew install python

# Install Kubernetes CLI (kubectl)
echo "Installing Kubernetes CLI (kubectl)..."
brew install kubectl

# Install Helm
echo "Installing Helm..."
brew install helm

# Install Helmfile
echo "Installing Helmfile..."
brew install helmfile

# Install Taskfile
echo "Installing Taskfile..."
brew install go-task/tap/go-task

# Final Brew Cleanup
echo "Running brew cleanup..."
brew cleanup

echo "Installation completed!"