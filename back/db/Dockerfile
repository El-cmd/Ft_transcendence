FROM postgres:13.4

# Install gettext to use envsubst
RUN apt-get update && apt-get install -y gettext

# Exposer le port 5432 pour le monde extérieur à ce conteneur
EXPOSE 5432

# Copier le script d'initialisation de la base de données
COPY init.sql /docker-entrypoint-initdb.d/
COPY docker-entrypoint.sh /docker-entrypoint-initdb.d/
RUN chmod +x /docker-entrypoint-initdb.d/docker-entrypoint.sh

# Set the correct permissions for the init script directory
RUN chown -R postgres:postgres /docker-entrypoint-initdb.d