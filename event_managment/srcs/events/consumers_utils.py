from django.contrib.auth.models import User
from channels.layers import get_channel_layer

def generate_event_group_name(game_id: int) -> str:
    return (f"game_{game_id}")