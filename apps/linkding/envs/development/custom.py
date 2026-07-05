# Mounted over /etc/linkding/bookmarks/settings/custom.py - linkding's
# official extension hook (prod.py ends with `from .custom import *` and
# the placeholder file says "can be mounted in a Docker container").
# linkding never sets CONN_MAX_AGE for postgres, so Django opens a new
# DB connection per request; even through pgbouncer that reconnect
# (incl. a doomed sslmode=prefer TLS probe) roughly doubled per-render
# cost vs sqlite (results.yaml record 12).
from .base import DATABASES

# Persistent connections: one per uwsgi worker thread. 2 pods x 2 procs
# x 2 threads = ~8, comfortably inside the pooler's 20-conn server pool
# (session mode holds a server conn per client conn).
DATABASES["default"]["CONN_MAX_AGE"] = None
DATABASES["default"]["CONN_HEALTH_CHECKS"] = True
# pgbouncer has no client-side TLS; stop psycopg2 probing for it
DATABASES["default"]["OPTIONS"]["sslmode"] = "disable"
