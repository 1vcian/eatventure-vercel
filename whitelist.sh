#!/bin/bash

# Script per gestire la whitelist degli utenti tramite API

# --- Validazione Argomenti ---
# Controlla se sono stati forniti esattamente due argomenti
if [ "$#" -ne 2 ]; then
    echo "❌ Errore: mancano gli argomenti."
    echo "Uso: ./whitelist.sh <userId> <true|false>"
    exit 1
fi

USER_ID=$1
STATUS=$2

# Controlla se lo stato è valido (solo 'true' o 'false')
if [ "$STATUS" != "true" ] && [ "$STATUS" != "false" ]; then
    echo "❌ Errore: lo stato deve essere 'true' o 'false'."
    echo "Uso: ./whitelist.sh <userId> <true|false>"
    exit 1
fi

# --- Caricamento Configurazione ---
# Cerca e carica il file .env
if [ ! -f .env ]; then
    echo "❌ Errore: file di configurazione .env non trovato."
    exit 1
fi
source .env

# Controlla che le variabili siano state caricate
if [ -z "$ADMIN_SECRET_KEY" ] || [ -z "$APP_URL" ]; then
    echo "❌ Errore: le variabili ADMIN_SECRET_KEY o APP_URL non sono impostate nel file .env."
    exit 1
fi

# --- Esecuzione Chiamata API ---
echo "⚙️  Invio richiesta per l'utente $USER_ID con stato $STATUS..."

# Costruisce il corpo JSON della richiesta
JSON_BODY="{\"userId\": \"$USER_ID\", \"isWhitelisted\": $STATUS}"

# Esegue la chiamata con curl
curl --silent -X POST "$APP_URL/api/admin/set-whitelist" \
  -H "Content-Type: application/json" \
  -H "x-admin-secret: $ADMIN_SECRET_KEY" \
  -d "$JSON_BODY"

echo -e "\n✅ Richiesta completata."