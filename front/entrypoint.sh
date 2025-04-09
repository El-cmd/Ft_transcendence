#!/bin/sh

# Start Nginx in the background
nginx;

echo "Nginx is now running..."
# Watch for changes in the Nginx configuration file
while inotifywait -r -e modify,create,delete /usr/share/nginx/html/; do
    echo "Changes detected in the dist directory, reloading Nginx..."
    nginx -s reload
done

echo "Nginx has stopped running, exiting..."
