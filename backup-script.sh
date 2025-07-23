#!/bin/sh

# Backup script for Cue database
# Runs at 12 AM and 12 PM Toronto time

BACKEND_URL="http://backend:3000/api/v1/backup-db"
EMAIL="realbencyrus@gmail.com"
PASSWORD="$DB_SEND_PASSWORD"

echo "$(date): Starting database backup..."

# Send backup request
RESPONSE=$(curl -s -X POST "$BACKEND_URL" \
  -H "Content-Type: application/json" \
  -d "{\"password\": \"$PASSWORD\", \"email\": \"$EMAIL\"}")

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "$(date): Backup sent successfully"
  echo "Response: $RESPONSE"
else
  echo "$(date): Backup failed"
  echo "Response: $RESPONSE"
  exit 1
fi 