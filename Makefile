PROJECT_NAME = ft_transcendence

# Commandes
.PHONY: all setup build up down clean fclean re

# Commandes
all: up

up:
	@echo "Lancement des services..."
	docker-compose up --build

down:
	@echo "Arrêt des services..."
	docker-compose down -v

clean:
	@echo "Nettoyage des volumes et images Docker..."
	docker-compose down -v --rmi all

fclean: clean
	@echo "Suppression de toutes les traces du projet..."
	docker system prune -f --volumes

re: fclean all