FROM nginx:alpine

# Installation d'openssl pour générer les certificats
RUN apk add --no-cache openssl

# Création d'un répertoire pour les certificats
RUN mkdir -p /etc/nginx/certs

# Le script de génération des certificats est maintenant intégré dans docker-entrypoint.sh

# Copie de la configuration nginx
COPY nginx.conf /etc/nginx/nginx.conf

# Script d'entrée qui génère les certificats au démarrage
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Exposition des ports
EXPOSE 80 443

# Utilisation du script d'entrée
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Commande par défaut pour démarrer nginx
CMD ["nginx", "-g", "daemon off;"]