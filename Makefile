# Couleurs pour le terminal
GREEN = \033[0;32m
RED = \033[0;31m
YELLOW = \033[0;33m
RESET = \033[0m

# Nom du projet
PROJECT_NAME = transcendance

# Services
SERVICES = api_gateway frontend user_managment event_managment chat_managment

.PHONY: all clean fclean re build restart logs rebuild test_usermanagment

# Commande par défaut
all:
	@echo "$(GREEN)Démarrage des conteneurs...$(RESET)"
	@if ! docker info > /dev/null 2>&1; then \
		echo "$(RED)Erreur: le démon Docker ne fonctionne pas. Veuillez le démarrer et réessayer.$(RESET)"; \
		exit 1; \
	fi
	docker compose up -d
	@echo "$(GREEN)Services disponibles sur:$(RESET)"
	@LOCAL_IP=$$(hostname -I | awk '{print $$1}') && echo "$(YELLOW)API Gateway: https://$$LOCAL_IP:8443$(RESET)"

# Nettoyer (arrêter les conteneurs)
clean:
	@echo "$(RED)Arrêt des conteneurs...$(RESET)"
	docker compose down

# Nettoyer (arrêter les conteneurs et supprimer les images)
fclean: clean
	@echo "$(RED)Nettoyage complet...$(RESET)"
	docker compose down --rmi all --volumes --remove-orphans
	@if [ -n "`docker ps -a -q`" ]; then \
		docker rm -f `docker ps -a -q`; \
	else \
		echo "$(YELLOW)Aucun conteneur à supprimer.$(RESET)"; \
	fi
	docker system prune -f

# Redémarrer
re: fclean all

# Voir les logs d'un service spécifique
logs:
	@echo "$(GREEN)Affichage des logs du service $(service)...$(RESET)"
	docker compose logs -f $(service)

# Reconstruire et redémarrer un service spécifique
rebuild:
	@echo "$(GREEN)Reconstruction et redémarrage du service $(service)...$(RESET)"
	docker compose build $(service)
	docker compose up -d $(service)
	@echo "$(GREEN)Vérification de l'état des conteneurs...$(RESET)"
	@docker ps -a --filter "status=exited" --filter "status=created" --format "{{.Names}}: {{.Status}}" | while read line; do echo "$(RED)Attention: Le conteneur $$line est arrêté ou a échoué.$(RESET)"; done;



service_shell:
	@echo "$(GREEN)Ouverture d'un shell dans le service $(service)...$(RESET)"
	docker compose exec $(service) sh
