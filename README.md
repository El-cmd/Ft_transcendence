# 🎮 Projet de Jeu Multijoueur en Architecture Microservices

## 🎬 Démonstration

![Démonstration du projet](demo.gif)

## 🏗️ Architecture technique

Ce projet est construit sur une **architecture microservices** permettant une meilleure scalabilité, maintenance et isolation des différentes fonctionnalités.

### 🛠️ Stack technique

- **Frontend**: HTML/CSS/JavaScript avec Bootstrap et Three.js
- **API Gateway**: Nginx
- **HTTPS Proxy**: Configuration SSL/TLS pour sécuriser les communications
- **Microservices**:
  - **👤 User Management**: Gestion des utilisateurs, authentification et autorisations
  - **🏆 Event Management**: Gestion des événements et tournois
  - **💬 Chat Management**: Système de messagerie en temps réel
- **⚡ Cache**: Redis pour les performances et le partage d'état
- **🐳 Conteneurisation**: Docker et Docker Compose pour la gestion des environnements

## ✨ Fonctionnalités principales

### 💬 Système de chat en temps réel
- Communication instantanée entre joueurs
- Canaux de discussion publics et privés
- Historique des conversations

### 🕹️ Jeu multijoueur
- Matchmaking automatique
- Système de tournoi
- Classements et statistiques
- Parties en temps réel

## 🚀 Démarrage

Pour lancer l'application:

```bash
docker-compose up -d
```

L'application sera accessible à l'adresse IP du serveur.

## ⚙️ Configuration

Créez les fichiers `.env` nécessaires dans chaque microservice:

### Pour user_managment/.env
Il est nécessaire de configurer:
- L'URL et le port du service
- Les paramètres de connexion à la base de données
- **API_42_UID** et **API_42_SECRET**: Clés API nécessaires pour l'authentification via 42

### Pour chat_managment/.env et event_managment/.env
Configurer les paramètres de connexion aux autres services et bases de données.