#!/bin/bash

# Script per gestire lo stato degli utenti (ban/whitelist/default)

# --- Validazione Argomenti ---
if [ "$#" -ne 2 ]; then
    echo "❌ Errore: argomenti non validi."
    echo "Uso: ./set-status.sh <userId> <ban|whitelist|default>"
    exit 1
fi

USER_ID=$1
STATUS=$2

if [[ "$STATUS" != "ban" && "$STATUS" != "whitelist" && "$STATUS" != "default" ]]; then
    echo "❌ Errore: lo stato deve essere 'ban', 'whitelist', o 'default'."
    exit 1
fi

# --- Caricamento Configurazione ---
if [ ! -f .env ]; then
    echo "❌ Errore: file di configurazione .env non trovato."
    exit 1
fi
source .env

if [ -z "$ADMIN_SECRET_KEY" ] || [ -z "$APP_URL" ]; then
    echo "❌ Errore: variabili non impostate nel file .env."
    exit 1
fi

# --- Esecuzione Chiamata API ---
echo "⚙️  Impostando lo stato dell'utente $USER_ID a '$STATUS'..."

JSON_BODY="{\"userId\": \"$USER_ID\", \"status\": \"$STATUS\"}"

curl --silent -L -X POST "$APP_URL/api/admin/set-user-status" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET_KEY" \
  -d "$JSON_BODY"

echo -e "\n✅ Richiesta completata."