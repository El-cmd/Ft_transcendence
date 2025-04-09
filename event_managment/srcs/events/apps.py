
from django.apps import AppConfig

class EventsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'events'

    def ready(self):
        # Import signals to ensure they are registered
        import events.signals_broadcaster
        import events.signals
        # Log that signals are properly connected
        import logging
        logger = logging.getLogger(__name__)
        logger.info("✅ EVENTS APP READY - SIGNALS CONNECTED")
