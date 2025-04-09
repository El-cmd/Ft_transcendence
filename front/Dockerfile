FROM nginx:latest

EXPOSE 3000
# autoupdate
RUN apt-get update && apt-get install -y inotify-tools

# Copier les fichiers statiques dans le dossier HTML de Nginx
COPY ./dist /usr/share/nginx/html


# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

RUN apt-get update && apt-get install -y curl

# Create a custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]