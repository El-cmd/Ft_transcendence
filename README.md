# Ft_transcendence
# Frontend Application with Docker

Ce projet contient un conteneur Docker configuré pour servir une application frontend. Le conteneur utilise une image Nginx et expose le frontend sur un port spécifié.

---

## **Prérequis**
Avant de commencer, assurez-vous d'avoir installé :
- [Docker](https://www.docker.com/) (version 20.x ou plus récente).

---

## **Commandes principales**

### **1. Construire l'image Docker**
Pour créer l'image Docker à partir du fichier `Dockerfile`, utilisez la commande suivante :

```bash
docker build -t frontend-app .
```

docker build : Crée une image à partir du Dockerfile.
-t frontend-app : Attribue le tag frontend-app à l'image. Ce nom sera utilisé pour référencer l'image lors de son exécution.
. : Indique que le contexte de construction est le répertoire actuel (contenant le Dockerfile).

### **2. Exécuter le conteneur
Pour exécuter l'application dans un conteneur Docker, lancez la commande suivante :

```bash
docker run -d -p 8000:80 frontend-app
```

docker run : Lance un nouveau conteneur basé sur une image Docker.
-d : Exécute le conteneur en arrière-plan (mode détaché).
-p 8000:80 : Configure la redirection des ports entre votre machine hôte et le conteneur :

    8000 : Port sur votre machine hôte. Vous accéderez à l'application via http://localhost:8000.
    80 : Port interne du conteneur où Nginx est configuré pour écouter.

frontend-app : Nom de l'image Docker à utiliser pour ce conteneur.

### **3. Arrêter le conteneur

Pour arrêter un conteneur en cours d'exécution, utilisez :
```bash
docker stop <CONTAINER_ID>
```

### **4. Supprimer le conteneur
Pour supprimer un conteneur arrêté, utilisez :
```bash
docker stop <CONTAINER_ID>
```
