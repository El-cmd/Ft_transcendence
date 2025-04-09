#!/bin/sh

# Vérifier si les certificats existent déjà
if [ ! -f /etc/nginx/certs/fullchain.pem ] || [ ! -f /etc/nginx/certs/privkey.pem ]; then
    echo "Génération des certificats SSL..."
    # Génération des certificats
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/certs/privkey.pem \
        -out /etc/nginx/certs/fullchain.pem \
        -subj "/CN=localhost" \
        -addext "subjectAltName = DNS:localhost,IP:127.0.0.1"
    echo "Certificats SSL générés avec succès."
else
    echo "Les certificats SSL existent déjà."
fi

# Exécution de la commande fournie ou la commande par défaut
exec "$@"