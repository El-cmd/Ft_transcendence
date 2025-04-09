from django.apps import AppConfig
from django.dispatch import Signal
from tournaments.signals import round_launch_signal

class TournamentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tournaments'
