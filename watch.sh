#!/bin/bash
# Dossier de l extension
EXT_DIR=~/.local/share/gnome-shell/extensions/openai-shortcuts@venatum.com

# Surveille tous les fichiers .js, .css, .json de l'extension
ls $EXT_DIR/*.js $EXT_DIR/*.css $EXT_DIR/*.json | entr -d sh -c '
  echo "🔄 Rechargement de l extension..."
  gnome-extensions disable openai-shortcuts@venatum.com || true
  gnome-extensions enable openai-shortcuts@venatum.com
  echo "✅ Extension rechargée !"
'
