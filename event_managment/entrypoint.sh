#!/bin/bash

# Ajouter srcs au PYTHONPATH
export PYTHONPATH=/app/srcs:$PYTHONPATH

# Appliquer les migrations de la base de données
echo "Applying database migrations..."
python srcs/manage.py migrate


# Collecter les fichiers statiques
echo "Collecting static files..."
python srcs/manage.py collectstatic --noinput

# Créer un superutilisateur pour l'administration Django
python srcs/manage.py populatedb

# Démarrer le serveur Gunicorn
echo "Starting Gunicorn server..."
cd /app/srcs
# exec gunicorn event_managment.wsgi:application \
#     --bind 0.0.0.0:8002 \
#     --workers 3 \
#     --access-logfile - \
#     --error-logfile - \
#     --log-level debug \
#     --capture-output \
#     --enable-stdio-inheritance \
#     --reload

exec watchmedo auto-restart --directory=./ --pattern=*.py --recursive -- \
    gunicorn event_managment.asgi:application \
    --bind 0.0.0.0:8002 \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 1 \
    --timeout 300 \
    --keep-alive 65 \
    --access-logfile - \
    --error-logfile - \
    --log-level debug \
    --capture-output \
    --enable-stdio-inheritance
    # --workers 3 \