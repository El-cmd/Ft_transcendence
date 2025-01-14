# Utiliser l'image officielle de Nginx
FROM nginx:alpine

# Copier les fichiers frontend (HTML, CSS, JS) dans le dossier par défaut de Nginx
COPY ./dist /usr/share/nginx/html

# Copier une configuration personnalisée pour Nginx (optionnel)
COPY ./nginx.conf /etc/nginx/conf.d/default.conf


# Exposer un port non privilégié (exemple : 8080)
EXPOSE 8000
