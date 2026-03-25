#!/bin/sh
if [ "$IS_WORKER" = "true" ]; then
  exec pnpm worker
else
  pnpm prisma migrate deploy && exec pnpm start
fi
