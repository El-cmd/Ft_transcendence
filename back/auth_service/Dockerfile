# Utiliser une image Python officielle comme image de base
FROM python:3.10-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le contenu du répertoire actuel dans le conteneur à /app
COPY . /app

COPY requirements.txt .

# Installer les packages nécessaires spécifiés dans requirements.txt
RUN pip install --no-cache-dir -r requirements.txt


COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Rendre le port 5000 disponible pour le monde extérieur à ce conteneur
EXPOSE 8001

ENTRYPOINT [ "/app/entrypoint.sh" ]
# Commande pour appliquer les migrations, créer le superutilisateur et démarrer le serveur
#CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:8001 auth.wsgi:application"]
