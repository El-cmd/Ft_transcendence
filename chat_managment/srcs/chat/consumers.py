# This is  the file where all the asynchronous functionality will take place
# Handle WebSocket connections and relay messages between clients.
# Equivalent of views.py file for channels (websockets communication)

import asyncio
import jwt
import logging 
import time 

from channels.generic.websocket import AsyncWebsocketConsumer, AsyncJsonWebsocketConsumer
from django.core.exceptions import PermissionDenied
from django.http import Http404
from asgiref.sync import sync_to_async
from channels.db import database_sync_to_async
from django.db.utils import IntegrityError
from .models import  PrivateMessage
from .errors import TokenExpiredException
from django.contrib.auth.models import User
from urllib.parse import parse_qs
from django.conf import settings
from .utils_consumers import *
from django.core.cache import cache
from datetime import datetime, timezone

from .accounts_request import AuthorisedRequest

from django.contrib.auth import get_user_model

"""
WebSocket authentification with JWT :

1) Inital connection authentification :
    - Send the JWT token as a URL parameter when establishing the WebSocket connection
    - The server validates the token before accepting the connection
2) Message authentification :
    - Once the connection is authenticated, subsequent messages are considered authenticated
        -> on fait ca, ou alors on renvoie le token pour chaque msg ?
    - The server maintains the user's identity throughout the WebSocket session

HMAC (Hash-based Message Authentication Code) - HS256, HS384, HS512:
    Uses a single secret key for both signing and verification
    The same secret key is used to both create and verify the signature
    Simpler to implement but requires secure key distribution
    Example algorithms: HS256, HS384, HS512
"""

class WebSocketCloseCode:
    NO_TOKEN = 4001
    INVALID_TOKEN = 4002
    EXPIRED_TOKEN = 4003
    GENERAL_AUTH_ERROR = 4004
    

class ChatConsumer(AsyncJsonWebsocketConsumer):
        @staticmethod
        async def authenticateUser(token: str) -> dict : # returns the token's decoded payload
            try:                
                # Use the same signing key as the user_management service (?)
                signing_key = settings.JWT_AUTH['SIGNING_KEY']
                algorithm = settings.JWT_AUTH['ALGORITHM']
                decoded_payload = jwt.decode(token, signing_key, algorithms=[algorithm])
                print(f"Token decoded successfully. Payload: {decoded_payload}")

                user_id = decoded_payload['user_id']
                if user_id is None or user_id == '':
                    raise Exception("No user_id in jwt payload")
                return decoded_payload
            except jwt.ExpiredSignatureError:
                print(f"Token expired error: {str(e)}")
                raise
            except jwt.InvalidTokenError:
                print(f"Invalid token error: {str(e)}")
                raise
            except Exception as e:
                print(f"Unexpected error during token authentication: {str(e)}")
                raise
                   
                   
        async def connect(self):
            print("Attempting to connect...")

            query_params = parse_qs(self.scope['query_string'].decode())
            token = query_params.get('token', [None])[0] # query_params['token'][0]
            if not token:
                print("WebSocket connection refused : No token provided")
                await self.close(code=WebSocketCloseCode.NO_TOKEN) # 4001
                return
            
            try:
                # Validate the token and get the user ids
                decoded_payload = await self.authenticateUser(token)
                print('payload decoded')
                self.user_id = decoded_payload['user_id']
                # self.user = await sync_to_async(User.objects.get)(pk=self.user_id) # ok ?
                self.access_token = token  # Store the token for future use
                print(f"User authenticated: {self.user_id} {self.access_token}")

                # update the user online status
                key = f"user:{self.user_id}:connectedCount"
                cache.set(key, 1, timeout=None) #cache.set(key, cache.get(key, 0) + 1, timeout=None)

                # Notify friends about the status change
                self.room_group_name = generate_chat_room_name(self.user_id)
                await self.channel_layer.group_add(self.room_group_name, self.channel_name)
                await self.accept()

                await self.notify_friends("online")

                # add the user to its own room in the channel layers
                print(f"Connection accepted for user {self.user_id}")
            
            except jwt.ExpiredSignatureError:
                print("WebSocket connection refused: Token expired")
                await self.close(code=WebSocketCloseCode.EXPIRED_TOKEN)
            except jwt.InvalidTokenError:
                print("WebSocket connection refused: Invalid token")
                await self.close(code=WebSocketCloseCode.INVALID_TOKEN)
            except Exception as e:
                print(f"Unexpected error during connection: {str(e)}")
                await self.close(code=WebSocketCloseCode.GENERAL_AUTH_ERROR) # 4003
            

        async def disconnect(self, close_code):
            if hasattr(self, 'room_group_name'):
                await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

            # User disconnects: update Redis & notify friends
            if self.user_id:
                print(f'------------------ decrementing connectedCount for user {self.user_id}')
                key = f"user:{self.user_id}:connectedCount"
                last_seen_key = f"user:{self.user_id}:last_seen"

                cache.delete(key)
                cache.set(last_seen_key, int(time.time()), timeout=None)
                # Notify friends about offline status
                await self.notify_friends("offline")

            print('disconnecting : ', close_code)


        async def receive_json(self, content):
            print('receiving', content)
            payload = content["payload"]
            request_type = content['type']
            """
            Possible msg types :
            - private message
            - upcoming game (tournament notif)
            - invite for a game
            - block action -> 
            """
            if request_type == 'private_message':
                await self.handle_private_messaging(payload)
            elif request_type == 'relation_update':
                await self.handle_relation_update(payload)
            

        # payload = transmitted data from the client 
        async def handle_private_messaging(self, payload):
            print(f"payload = {payload}")
            if 'recipient' not in payload or 'sender' not in payload:
                print('no recipient key in the received payload')
                raise Exception('Missing recipient and/or sender key in payload')
            sender_id = payload['sender']
            recipient_id = payload['recipient']
            if not sender_id or sender_id is None or not recipient_id or recipient_id is None:
                raise Exception('Error : Sender/recipient cannot be null')
            if sender_id == recipient_id:
                raise Exception('Error : Sender and recipient keys are identicals')
            
            # Check if the recipient blocked the sender : if they did, do not broadcast the message 
            try:
                is_blocked = await self.check_relation(sender_id, recipient_id)
            except TokenExpiredException:
                self.handle_expired_token("private_message", payload)
                return # The front end will refresh the token and resend the message. That way, the msg won't be created twice in the db. 

            # Create msg anyway
            message = await self.create_private_message(payload, not is_blocked)
            await sync_to_async(print)(f"created message : {message}")
            
            # Do not broadcast it to other user if they blocked us
            if is_blocked:
                return 
            
            # If is a game invitation, create invitation
            # if message.message_type is 'game_invite':
            #     try:
            #         response = await sync_to_async(AuthorisedRequest.get_instance(self.access_token).invite_user_to_game)(message.recipient)
            #     except TokenExpiredException:
            #         print("chatConsumer: Token expired: notifying frontend")
            #         raise
            

            sent_payload = await sync_to_async(message.get_message_info)()
            event = {
                "type": "private_message", # Event type, determines which method handler will be called (here private_message)
                "payload": sent_payload
            }

            await self.channel_layer.group_send(
                generate_chat_room_name(recipient_id), # Group name for this room
                event
            )
            await sync_to_async(print)("after group_send") 


        async def private_message(self, event):
            # Extract the message data from the event.
            await sync_to_async(print)('sending', event)
            await sync_to_async(print)(f"user : {self.scope['user'].username}")
            payload = event["payload"] # sender, recipient, content, timestamp
            await self.send_json({"type": "private_message", "payload": payload})


        # Almost identical as private_message() -> make only one method that takes the msg type as parameter as well
        async def handle_relation_update(self, payload):
            if 'target' not in payload:
                raise Exception('Error : missing target user for performed action in payload')
            target_id = payload['target']
            if target_id is None:
                raise Exception('Error : target user for performed action cannot be null')
            event = {
                'type': 'relation_update',
                'payload': {
                    'sender': self.user_id,
                    # updated relation, ou part du principe que re fetch les infos du profile dans le front qd reçoit ca ?
                }
            }
            await self.channel_layer.group_send(
                generate_chat_room_name(target_id),
                event
            )
        
        async def relation_update(self, event):
            await self.send_json(event)
        
        async def game_invite(self, event):
            payload = event['payload']
            await self.send_json({"type": "game_invite", "payload": payload})
        
        async def notify_friends(self, status):
            try :
                print(f'Notifying friends of user {self.user_id} with status {status}')
                friends = await sync_to_async(AuthorisedRequest.get_instance(self.access_token).get_connected_friends)() # Get connected friend IDs
                print(f'Connected friends of user {self.user_id} : ', friends)
                payload = {"sender": self.user_id, "status": status} # sender instead of user
                event = {
                    "type": "status_update", # Event type, determines which method handler will be called (here private_message)
                    "payload": payload
                }

            except TokenExpiredException:
                print("chatConsumer: Token expired: notifying frontend")
                raise

            for friend_id in friends:
                print(f'------------------- In notify_friend, sending status update to friend {friend_id}')
                await self.channel_layer.group_send(
                    generate_chat_room_name(friend_id),
                    event
                )

        async def status_update(self, event):
            print('Sending status_update message : ', event)
            payload = event['payload']
            await self.send_json({"type": "status_update", "payload": payload})

        # sends {"type": "token_expired", "payload": data, "code": 401} back to client
        # data is the type and payload of the initial message sent from the client (ex : 'type': 'private_message', 'payload': ...)
        async def handle_expired_token(self, type, payload):
            data = {'type': type, 'payload': payload}
            await self.send_json({"type": "token_expired", "payload": data, "code": 401})
            await self.close(code=WebSocketCloseCode.EXPIRED_TOKEN)

        async def check_relation(self, sender, recipient):
            try:
                print(f"-------chatConsumer.check_relation, between users {sender} and {recipient}")
                token = self.access_token
                blocked = await sync_to_async(AuthorisedRequest.get_instance(token).blocked_by_other)(sender, recipient)
                if blocked:
                    print(f"The recipient {recipient} blocked the sender {sender}, message not broadcasted")
                    return True
                return False
            except TokenExpiredException:
                print("chatConsumer: Token expired: notifying frontend")
                raise

        # Wrap database interaction in async functions using sync_to_async
        @database_sync_to_async
        def create_private_message(self, payload, should_send):
            # Remove "Z" from timestamp (Python's fromisoformat does not support it)
            timestamp = payload['timestamp'].replace("Z", "")

            # Convert timestamp from string to datetime object
            timestamp_dt = datetime.fromisoformat(timestamp.replace("Z", "+00:00")).astimezone(timezone.utc)

            return PrivateMessage.objects.create(
                sender = payload['sender'],
                recipient = payload['recipient'],
                content = payload['content'],
                should_send = should_send, 
                timestamp = timestamp_dt,
                message_type = payload['message_type'],
                is_active = payload['message_type'] == 'game_invite')