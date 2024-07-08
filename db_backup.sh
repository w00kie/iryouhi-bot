#!/bin/bash -x

# Ensure script stops when commands fail.
set -e

# Backup & compress our database to the temp directory.
sqlite3 /app/data/prod.db "VACUUM INTO '/tmp/db'"
gzip /tmp/db

# 1-day, rolling hourly backup
rclone copy /tmp/db.gz r1:db-hourly-`date +%H`.gz
# 1-month, rolling daily backup
rclone copy /tmp/db.gz r2:db-daily-`date +%d`.gz

# Notify dead man that back up completed successfully.
curl -d s=$? $BACKUP_HEARTBEAT_URL &> /dev/null
