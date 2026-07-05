# Mounted over /etc/linkding/bookmarks/settings/custom.py - linkding's
# official extension hook (prod.py ends with `from .custom import *`).
# linkding never sets CONN_MAX_AGE for postgres, so Django reconnects
# (incl. a doomed TLS probe against the TLS-less pgbouncer) on every
# request - that overhead was worth 409 -> 1164+ rps in the dev A/B
# (results.yaml records 12/13).
from .base import DATABASES

# Engine guard: with LD_DB_ENGINE=sqlite (e.g. an exec'd manage.py
# against the old PVC database) these keys would crash the sqlite
# backend - only apply on postgres.
if DATABASES["default"]["ENGINE"] == "django.db.backends.postgresql_psycopg2":
    # Persistent connections: one per uwsgi worker thread (2 procs x 2
    # threads = ~4-5), comfortably inside the pooler's 20-conn server
    # pool (session mode holds a server conn per client conn).
    DATABASES["default"]["CONN_MAX_AGE"] = None
    DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
    # pgbouncer has no client-side TLS; stop psycopg2 probing for it
    DATABASES["default"]["OPTIONS"]["sslmode"] = "disable"
