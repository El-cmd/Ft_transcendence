# from .consumers import ChatConsumer
from .models import PrivateMessage
from django.contrib.auth.models import User
from channels.layers import get_channel_layer
from django.core.cache import cache

def generate_chat_room_name(user_pk : int):
    return f"chat_{user_pk}"

"""
You'll often want to send to the channel layer from outside of the scope of a consumer, and so you wont have self.channel_layer. 
In this case, you should use the get_channel_layer function to retrieve it.
! Remember that channel layers only support async methods.
"""

async def send_ws_data_to_user(user: int, data: dict):
    channel_layer = get_channel_layer()
    room_name = generate_chat_room_name(user)
    if 'type' not in data:
        print(f'Warning : ws_data does not contain a type')
    await channel_layer.group_send( 
        room_name,
        data 
    )

def is_user_connected(user : int):
    key = f"user:{user}:connectedCount"
    return cache.get(key, 0) > 0