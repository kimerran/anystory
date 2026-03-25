#!/bin/sh
if [ "$RAILWAY_SERVICE_NAME" = "worker" ]; then
  exec pnpm worker
else
  pnpm prisma migrate deploy && exec pnpm start
fi
