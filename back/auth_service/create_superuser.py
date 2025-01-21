import os
import django
from django.contrib.auth.models import User
from decouple import config

DJANGO_SUPERUSER_USERNAME = config("DJANGO_SUPERUSER_USERNAME")
DJANGO_SUPERUSER_EMAIL = config("DJANGO_SUPERUSER_EMAIL")
DJANGO_SUPERUSER_PASSWORD = config("DJANGO_SUPERUSER_PASSWORD")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

# Check if a superuser already exists
if not User.objects.filter(username=os.environ.get('DJANGO_SUPERUSER_USERNAME')).exists():
    User.objects.create_superuser(
        username=os.environ.get('DJANGO_SUPERUSER_USERNAME'),
        email=os.environ.get('DJANGO_SUPERUSER_EMAIL'),
        password=os.environ.get('DJANGO_SUPERUSER_PASSWORD')
    )