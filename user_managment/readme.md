# Service de Gestion des Utilisateurs

Ce service gère l'authentification et les opérations liées aux utilisateurs dans l'application.

## Technologies Utilisées

- Django 4.x
- Django REST Framework
- PostgreSQL
- Docker

## Structure du Projet

```
user_managment/
├── srcs/
│   ├── accounts/          # Application de gestion des comptes
│   ├── user_managment/    # Configuration principale du projet
│   ├── manage.py         # Script de gestion Django
│   ├── requirements.txt  # Dépendances Python
│   └── static/          # Fichiers statiques
├── Dockerfile           # Configuration Docker
├── entrypoint.sh       # Script d'entrée Docker
└── .env                # Variables d'environnement
```

## Routes API

### Routes d'Authentification

- `POST /api/auth/login/` : Connexion utilisateur
- `POST /api/auth/logout/` : Déconnexion utilisateur
- `POST /api/auth/register/` : Inscription nouvel utilisateur
- `POST /api/auth/password/reset/` : Demande de réinitialisation du mot de passe
- `POST /api/auth/password/reset/confirm/` : Confirmation de réinitialisation du mot de passe

### Routes de Gestion des Utilisateurs

- `GET /api/users/` : Liste des utilisateurs (admin seulement)
- `GET /api/users/{id}/` : Détails d'un utilisateur
- `PUT /api/users/{id}/` : Mise à jour d'un utilisateur
- `DELETE /api/users/{id}/` : Suppression d'un utilisateur
- `GET /api/users/me/` : Profil de l'utilisateur connecté

## Installation et Démarrage

1. Construire l'image Docker :
```bash
docker build -t user_management .
```

2. Démarrer le service avec docker-compose :
```bash
docker-compose up -d
```

## Variables d'Environnement

- `DJANGO_SECRET_KEY` : Clé secrète Django
- `DB_NAME` : Nom de la base de données
- `DB_USER` : Utilisateur de la base de données
- `DB_PASSWORD` : Mot de passe de la base de données
- `DB_HOST` : Hôte de la base de données
- `DB_PORT` : Port de la base de données

## Développement

Pour lancer le serveur de développement :

```bash
python manage.py runserver
```

Pour exécuter les migrations :

```bash
python manage.py migrate
```

Pour créer un superutilisateur :

```bash
python manage.py createsuperuser