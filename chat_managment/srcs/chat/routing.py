# This will route the WebSocket connections to the consumers.
# Equivalent of the urls.py file for websockets communication

from django.urls import re_path  #relative path 
from . import consumers

"""
?P<> : defines that we are defining a variable
<text> : text is your variable's name
\w+ : is your regex which defines what pattern is acceptable. 
    In this case \w represents anything in the set [0-9a-zA-Z_] and + represents any number of repetitions
"""
# This defines the WebSocket URL pattern for chat rooms
websocket_urlpatterns = [
    re_path(r'ws/chat/?$', consumers.ChatConsumer.as_asgi()) # added the '?' before $ : todel ?
]
