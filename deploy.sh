#!/bin/bash

# Script deploy.sh
firebase deploy

# Añadir cambios a Git
git add .

# Commit con fecha y hora
git commit -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"

# Push a repositorio
git push origin main
