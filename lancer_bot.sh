#!/bin/bash
cd "$(dirname "$0")"

# Verifier si Python est installe
if ! command -v python3 &> /dev/null; then
    echo "Python3 n'est pas installe!"
    exit 1
fi

# Creer environnement virtuel si necessaire
if [ ! -d "venv" ]; then
    echo "Creation de l'environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement
source venv/bin/activate

# Installer les dependances
pip install -q -r requirements.txt

# Lancer le bot
python3 bot.py

deactivate
