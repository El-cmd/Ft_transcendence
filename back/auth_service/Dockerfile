# Utiliser une image Python officielle comme image de base
FROM python:3.10-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le contenu du répertoire actuel dans le conteneur à /app
COPY . /app

COPY requirements.txt .

# Installer les packages nécessaires spécifiés dans requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Rendre le port 5000 disponible pour le monde extérieur à ce conteneur
EXPOSE 8001

# Définir les variables d'environnement pour la base de données PostgreSQL
CMD ["python", "manage.py", "runserver", "127.0.0.1:8001"]