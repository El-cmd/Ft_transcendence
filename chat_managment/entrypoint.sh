#!/bin/bash

# Ajouter srcs au PYTHONPATH
export PYTHONPATH=/app/srcs:$PYTHONPATH

# Set Django settings module # todel ?
export DJANGO_SETTINGS_MODULE=chat_managment.settings

# todel ?
# Create database migrations
echo "Creating database migrations..."
python srcs/manage.py makemigrations chat

# Appliquer les migrations de la base de données
echo "Applying database migrations..."
python srcs/manage.py migrate



# Collecter les fichiers statiques
echo "Collecting static files..."
python srcs/manage.py collectstatic --noinput


# Créer un superutilisateur pour l'administration Django
# python srcs/manage.py createsuperuser --noinput --username admin --password admin --email mail@mail.mail
# python srcs/manage.py populatedb

# Démarrer le serveur Gunicorn
echo "Starting Gunicorn server..."
cd /app/srcs

# the '--worker-class uvicorn.workers.UvicornWorker \' option if for Gunicorn to properly handle ASGI/WebSocket connections (Regular Gunicorn workers don't support ASGI/WebSocket, we need Uvicorn workers for proper ASGI/WebSocket support with Django Channels)
exec watchmedo auto-restart --directory=./ --pattern=*.py --recursive -- \
    gunicorn chat_managment.asgi:application \
    --bind 0.0.0.0:8003 \
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
