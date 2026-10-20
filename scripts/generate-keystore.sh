#!/usr/bin/env bash
set -e

KEYSTORE_PATH="${1:-android/release.keystore}"
KEY_ALIAS="${2:-rebu-release}"
VALIDITY_DAYS="${3:-10000}"

echo "=== rebu Release Keystore Generator ==="
echo "Ziel-Pfad:      $KEYSTORE_PATH"
echo "Schlüssel-Alias: $KEY_ALIAS"
echo "Gültigkeit:     $VALIDITY_DAYS Tage"
echo "========================================"

if [ -f "$KEYSTORE_PATH" ]; then
  echo "FEHLER: Datei '$KEYSTORE_PATH' existiert bereits!"
  echo "Um einen neuen Keystore zu erstellen, lösche oder verschiebe die bestehende Datei."
  exit 1
fi

if ! command -v keytool &> /dev/null; then
  echo "FEHLER: 'keytool' wurde nicht gefunden. Bitte JDK installieren."
  exit 1
fi

mkdir -p "$(dirname "$KEYSTORE_PATH")"

echo "Erstelle Keystore (du wirst nach einem Passwort gefragt)..."
keytool -genkeypair \
  -v \
  -keystore "$KEYSTORE_PATH" \
  -alias "$KEY_ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity "$VALIDITY_DAYS"

echo ""
echo "Keystore erfolgreich erstellt unter: $KEYSTORE_PATH"
echo ""
echo "=== Nächste Schritte für lokale Builds ==="
echo "Erstelle 'android/key.properties' mit folgendem Inhalt (bereits in .gitignore):"
echo "--------------------------------------------------------"
echo "storeFile=../$KEYSTORE_PATH"
echo "storePassword=<DEIN_PASSWORT>"
echo "keyAlias=$KEY_ALIAS"
echo "keyPassword=<DEIN_PASSWORT>"
echo "--------------------------------------------------------"
echo ""
echo "=== Nächste Schritte für GitHub Actions CI ==="
echo "Für GitHub Secrets erstelle einen Base64-String des Keystores:"
echo "  base64 -w 0 $KEYSTORE_PATH"
echo "Und trage ihn als Secret 'RELEASE_KEYSTORE_BASE64' ein."
