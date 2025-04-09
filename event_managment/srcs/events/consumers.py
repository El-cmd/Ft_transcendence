# This is  the file where all the asynchronous functionality will take place
# Handle WebSocket connections and relay messages between clients.
# Equivalent of views.py file for channels (websockets communication)

import jwt
import asyncio
import logging
import functools
import time

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async
from urllib.parse import parse_qs
from django.conf import settings
from .models import Event, EventPlayer
from .errors import *
from channels.layers import get_channel_layer

# Configure logging
logger = logging.getLogger(__name__)

# Helper functions for async operations
def async_db_operation(func):
    """Decorator to handle sync-to-async database operations with error handling"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await sync_to_async(func)(*args, **kwargs)
        except Exception as e:
            logger.error(f"Database operation failed: {func.__name__} - {str(e)}")
            raise
    return wrapper

class WebSocketCloseCode:
    NO_TOKEN = 4001
    INVALID_TOKEN = 4002
    EXPIRED_TOKEN = 4003
    GENERAL_AUTH_ERROR = 4004
    NO_EVENT_ID = 4005
    EVENT_ERROR = 4006

def generate_event_group_name(event_id):
    return f'event_{event_id}'

def generate_game_group_name(user_id):
    game_id = Event.current_game(user_id).id
    return generate_event_group_name(game_id)

def generate_tournament_group_name(tournament_id):
    tournament_id = Event.current_tournament(tournament_id).id
    return generate_event_group_name(tournament_id)

def generate_user_group_name(user_id):
    return f'user_{user_id}'

class EventConsumer(AsyncJsonWebsocketConsumer):
    main_channel_name = 'event_main_channel'
    
    # Class variable to track disconnected players and their reconnection timers
    disconnected_players = {}
    
    # Message handler registry - for cleaner message routing
    MESSAGE_HANDLERS = {
        'quit': '_handle_quit',
        'goal_scored': '_handle_goal_scored',
        'gamestate': 'handle_gamestate',
        'paddle_update': 'handle_paddle_update',
        'ball_update': 'handle_ball_update',
    }
    
    @staticmethod
    async def authenticateUser(token: str) -> dict : # returns the token's decoded payload
        try:                
            signing_key = settings.JWT_AUTH['SIGNING_KEY']
            algorithm = settings.JWT_AUTH['ALGORITHM']
            decoded_payload = jwt.decode(token, signing_key, algorithms=[algorithm])
            user_id = decoded_payload['user_id']
            if user_id is None or user_id == '':
                raise Exception("No user_id in jwt payload")
            return decoded_payload
        except jwt.ExpiredSignatureError as e:
            logger.error(f"Token expired error: {str(e)}")
            raise
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid token error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error during token authentication: {str(e)}")
            raise

    # forfeit if user is disconnected for too long
    async def cancel_forfeit_timer(self):
        """Cancel any forfeit timer for the current user"""
        if hasattr(self, 'user_id') and self.user_id in EventConsumer.disconnected_players:
            task = EventConsumer.disconnected_players[self.user_id]
            if not task.done():
                task.cancel()
            del EventConsumer.disconnected_players[self.user_id]
            logger.info(f"Cancelled forfeit timer for user {self.user_id}")

    async def start_forfeit_timer(self):
        """Start a forfeit timer for the current user if they're in an event"""
        if not hasattr(self, 'user_id'):
            return
        timeout_seconds = 5 
        loop = asyncio.get_running_loop()
        task = loop.create_task(self.forfeit_after_timeout(timeout_seconds))
        EventConsumer.disconnected_players[self.user_id] = task
        logger.info(f"Started forfeit timer for user {self.user_id}")
        

    async def forfeit_after_timeout(self, timeout_seconds):
        """
        Wait for the specified timeout period, then forfeit the game if the player hasn't reconnected.
        """
        try:
            logger.debug('In forfeit loop')
            await asyncio.sleep(timeout_seconds)
            
            # After the timeout, if we're still running this task, execute the forfeit
            logger.info(f"Forfeit timeout reached for user {self.user_id}, declaring forfeit")
            
            # Notify other players about the forfeit
            try:
                # game = await sync_to_async(Event.current_game)(self.user_id)
                # player =  await sync_to_async(game.players.get)(self.user_id)
                # role = player.role
                # logger.info(f"game infos before forfeiting : {game}")
                await sync_to_async(EventPlayer.quit_current_event)(self.user_id)
                # logger.info(f"Player {player} forfeited from game {game.id} with role {role}") 
                # await self.channel_layer.group_send(
                #     f'event_{game.id}',
                #     {
                #         'type': 'player_gave_up',
                #         'payload': {
                #             'player': role,
                #         }
                #     }
                # )
            except NotInAnEventError:
                pass
            logger.info(f'Game forfeit by user {self.user_id}') 
            if self.user_id in EventConsumer.disconnected_players:
                del EventConsumer.disconnected_players[self.user_id]
                
        except asyncio.CancelledError:
            logger.info(f"Forfeit timer cancelled for user {self.user_id}")
        
    # Helper methods for group operations
    async def _add_to_group(self, group_name):
        """Add user to a channel group and track it in event_group_names if needed"""
        try:
            await self.channel_layer.group_add(group_name, self.channel_name)
            return True
        except Exception as e:
            logger.error(f"Error adding to group {group_name}: {str(e)}")
            return False
        
    async def _remove_from_group(self, group_name):
        """Remove user from a channel group"""
        logger.info(f"Removing user {self.user_id} from group {group_name}")
        await self.channel_layer.group_discard(group_name, self.channel_name)
        if group_name == self.game_group_name:
            self.game_group_name = None
        if group_name == self.tournament_group_name:
            self.tournament_group_name = None
    
    async def _join_main_channel(self):
        """Join the main channel group"""
        await self._add_to_group(EventConsumer.main_channel_name)
    
    async def _join_user_group(self, user_id):
        """Join the user-specific group"""
        self.user_group_name = await sync_to_async(generate_user_group_name)(user_id)
        await self._add_to_group(self.user_group_name)
        
    async def _authenticate(self, token):
        """Authenticate user with JWT token"""
        if not token:
            logger.warning("Game websocket connection refused: No token provided")
            await self.close(code=WebSocketCloseCode.NO_TOKEN)
            return False
            
        try:
            decoded_payload = await self.authenticateUser(token)
            self.user_id = decoded_payload['user_id']
            self.access_token = token
            return True
        except jwt.ExpiredSignatureError:
            logger.error("Token expired error")
            await self.close(code=WebSocketCloseCode.EXPIRED_TOKEN)
        except jwt.InvalidTokenError:
            logger.error("Invalid token error")
            await self.close(code=WebSocketCloseCode.INVALID_TOKEN)
        except Exception as e:
            logger.error(f"Unexpected error during token authentication: {str(e)}")
            await self.close(code=WebSocketCloseCode.GENERAL_AUTH_ERROR)
        return False
        
    async def add_to_current_event_group(self):
        """Add user to their current game and tournament groups"""
        game = await self._get_current_game(self.user_id)
        if game is not None:
            self.game_group_name = f'event_{game.id}'
            await self._add_to_group(self.game_group_name)
            
        tournament = await self._get_current_tournament(self.user_id)
        if tournament is not None:
            self.tournament_group_name = f'event_{tournament.id}'
            await self._add_to_group(self.tournament_group_name)
        logger.info(f"After adding to current event group, user {self.user_id} is in groups: game->{self.game_group_name}, tournament->{self.tournament_group_name}")
        

    # Database operations with proper async handling
    @async_db_operation
    def _get_current_game(self, user_id):
        """Get the current game for a user"""
        try:
            return Event.current_game(user_id)
        except NotInAnEventError:
            return None
    
    @async_db_operation
    def _get_current_tournament(self, user_id):
        """Get the current tournament for a user"""
        try:
            return Event.current_tournament(user_id)
        except NotInAnEventError:
            return None
    
    @async_db_operation
    def _quit_event(self, user_id):
        """Quit the current event for a user"""
        return EventPlayer.quit_current_event(user_id)
    
    @async_db_operation
    def _score_goal(self, game, scorer):
        """Score a goal in the given game"""
        return game.score_goal(scorer)
    
    @async_db_operation
    def _get_current_player_id(self, game, user_id):
        """Get the current player id (set as localPlayer in pong) of a user's current game"""
        return game.players.get(user=user_id).role


    # Connect and disconnect methods
    async def connect(self):
        logger.info("Attempting to connect game websockets...")
        query_params = parse_qs(self.scope['query_string'].decode())
        
        token = query_params.get('token', [None])[0]
        if not await self._authenticate(token):
            return
            
        # Cancel any pending forfeit tasks for this user
        await self.cancel_forfeit_timer()

        # Join main-event-group
        await self._join_main_channel()

        # Join user-specific group
        await self._join_user_group(self.user_id)
        
        # Join event group
        self.game_group_name = None
        self.tournament_group_name = None
        
        await self.add_to_current_event_group()
        
        await self.accept()
        logger.info(f"Connection accepted for user {self.user_id}")

    async def disconnect(self, close_code):
        # Remove from event group
        if hasattr(self, 'game_group_name') and self.game_group_name:
            await self._remove_from_group(self.game_group_name)
            self.game_group_name = None
        if  hasattr(self, 'tournament_group_name') and self.tournament_group_name:
            await self._remove_from_group(self.tournament_group_name)
            self.tournament_group_name = None
        
        # Remove from user group
        if hasattr(self, 'user_group_name'):
            await self._remove_from_group(self.user_group_name)
        
        logger.info(f'Disconnecting event websocket: {close_code}')
        # game 
        await self.start_forfeit_timer()
        
    # Message handling with improved structure
    async def receive_json(self, content):
        """
        Handle messages received from the WebSocket using a message router pattern.
        """
        message_type = content.get('type')
        payload = content.get('payload', {})
        logger.debug(f"Received message: {message_type}, {payload}")
        
        if not message_type:
            logger.warning("Received message with no type")
            return
            
        # Use the message handler registry to route messages
        handler_name = self.MESSAGE_HANDLERS.get(message_type)
        if handler_name:
            handler = getattr(self, handler_name, None)
            if handler:
                try:
                    await handler(payload)
                except Exception as e:
                    logger.error(f"Error handling message {message_type}: {str(e)}")
            else:
                logger.warning(f"Handler method {handler_name} not found")
        else:
            logger.warning(f"Unknown message type: {message_type}")
    
    # Specific message handlers
    async def _handle_quit(self, payload):
        """Handle quit messages"""
        logger.info(f"User {self.user_id} sent quit message : in handler")
        try:
            game = await self._get_current_game(self.user_id)
            if game is None:
                logger.error(f"No active game found for user {self.user_id} when broadcasting quit message")
                return
            player_id = await self._get_current_player_id(game, self.user_id)
            await self._quit_event(self.user_id)
            # for pong4 : send quit update to other players, as there might be enough remaining players for the game to keep going
            
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'player_gave_up',
                    'payload': {
                        'player': player_id
                    }
                }
            )
            
            # group discard
            if self.game_group_name:
                await self._remove_from_group(self.game_group_name)
            if self.tournament_group_name:
                await self._remove_from_group(self.tournament_group_name)
                
        except NotInAnEventError:
            logger.info(f"User {self.user_id} already quit")
        except Exception as e:
            logger.error(f"Error handling quit: {str(e)}")
    
    async def _handle_goal_scored(self, payload):
        """Handle goal_scored messages"""
        logger.debug(f"Handling goal scored: {payload}")
        try:
            game = await self._get_current_game(self.user_id)
            if game is None:
                logger.error(f"No active game found for user {self.user_id} when scoring goal")
                return
                
            # Make sure we have valid scorer information
            scorer = payload.get('scorer')
            if not scorer:
                logger.error("Goal scored without valid scorer information")
                return
                
            await self._score_goal(game, scorer)
            
            # Send next server update to all players
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': 'next_server_update',
                    'payload': payload['victim']
                }
            )
# await self._broadcast_to_game('next_server_update', payload['victim'])
        except Exception as e:
            logger.error(f"Error handling goal scored: {str(e)}")
            # Don't re-raise to avoid breaking the WebSocket connection
    
    async def _broadcast_to_game(self, message_type, data=None):
        """Broadcast a message to the current game group"""
        if self.game_group_name:
            await self.channel_layer.group_send(
                self.game_group_name,
                {
                    'type': message_type,
                    'payload': data
                }
            )
        else:
            logger.warning("XXXXXXX No game group to broadcast ", message_type)
    
    async def ball_update(self, event):
        """Send ball update to the WebSocket"""
        
        await self.send_json({
            'type': 'ball_update',
            'payload': event['payload']
        })
        
    async def handle_ball_update(self, payload):
        """Handle ball updates to be shared between clients"""
        # current_time = time.time()
        # Send ball update to all players in the game except sender
        # self.last_ball_update = current_time
        await self._broadcast_to_game('ball_update', payload)
        print('ball update received')
        # if not hasattr(self, 'last_ball_update') or current_time - self.last_ball_update > 0.1:

        # await self._broadcast_to_game('ball_update', payload)
        
    
    async def next_server_update(self, event):
        data = event.get('payload', {})
        await self.send_json({
            'type': 'next_server_update',
            'payload': data
        })
    # paddle update
    async def handle_paddle_update(self, payload):
        """Handle paddle updates to be shared between clients"""
        # Send paddle update to all players in the game except sender
        logger.debug(f"Received paddle update: {payload}")
        await self.channel_layer.group_send(
            self.game_group_name,
            {
                'type': 'paddle_update',
                'user_id': self.user_id,
                'payload': payload
            }
        )        
            
    async def paddle_update(self, event):
        """Send paddle update to the WebSocket"""
        # Don't send paddle update back to the user who sent it
        # if str(event['user_id']) != str(self.user_id):
            
        await self.send_json({
            'type': 'paddle_update',
            'user_id': event['user_id'],
            'payload': event['payload']
        })
            
    async def join_event(self, event):
        """Add the user to a specific event group when instructed to join an event"""
        event_id = event.get('data', {}).get('event_id')
        event_type = event.get('data', {}).get('event_type')
        logger.info(f"✅ JOIN EVENT CALLED WITH {event_id}")
        if event_id:
            event_group_name = await sync_to_async(generate_event_group_name)(event_id)
            
            # Always add to the group, even if it's the same as before
            await self.channel_layer.group_add(event_group_name, self.channel_name)
            logger.info(f"✅ USER {self.user_id} JOINED {event_group_name}")
            logger.info(f"Added user {self.user_id} to event group {event_group_name}")
            
            if event_type == 'game':
                if self.game_group_name and self.game_group_name != event_group_name:
                    await self._remove_from_group(self.game_group_name)
                    logger.warning(f"Removed user {self.user_id} from game group {self.game_group_name} in join_event")
                self.game_group_name = event_group_name
            elif event_type == 'tournament':
                if self.tournament_group_name and self.tournament_group_name != event_group_name:
                    await self._remove_from_group(self.tournament_group_name)
                    logger.warning(f"Removed user {self.user_id} from tournament group {self.tournament_group_name} in join_event")
                self.tournament_group_name = event_group_name
            logger.info(f"✅ USER {self.user_id} IS IN {self.game_group_name} AND {self.tournament_group_name}")
    
    async def leave_event(self, event):
        """Remove the user from a specific event group"""
        event_id = event.get('data', {}).get('event_id')
        if event_id:
            event_group_name = await sync_to_async(generate_event_group_name)(event_id)
            # Check if the user is in this group before trying to remove
            if event_group_name == self.game_group_name or event_group_name == self.tournament_group_name:
                await self.channel_layer.group_discard(event_group_name, self.channel_name)
                logger.info(f"Removed user {self.user_id} from event group {event_group_name}")
                logger.info(f"✅ USER {self.user_id} LEFT {event_group_name}")
                
                # Clean up game/tournament group if they match this event
                if self.game_group_name == event_group_name:
                    self.game_group_name = None
                if self.tournament_group_name == event_group_name:
                    self.tournament_group_name = None

    async def player_status(self, event):
        """Send the player's status to the WebSocket"""
        status = event.get('data', {})
        print(f"🔥 PLAYER STATUS: {status}")
        await self.send_json({
            'type': 'player_status',
            'payload': status
        })
    
    async def game_launch(self, event):
        """Send a game launch message to the WebSocket"""
        await self.send_json({
            'type': 'game_launch',
            'payload': event.get('data', {})
        })
        
    async def event_end(self, event):
        """Send a game end message to the WebSocket"""
        await self.send_json({
            'type': 'event_end',
            'payload': event.get('data', {})
        })
        
    async def update_score_board(self, event):
        """Send an updated scoreboard to the WebSocket"""
        data = event.get('data', {})
        await self.send_json({
            'type': 'update_score_board',
            'payload': data
        })

    async def player_gave_up(self, event):
        """Notifies other players in the game that a player gave up"""
        logger.info(f"Sending player_gave_up message to user {self.user_id}. data = {event}")
        await self.send_json(event)
    
    async def tournament_launch(self, event):
        """Send a tournament launch message to the WebSocket"""
        await self.send_json({
            'type': 'tournament_launch'
        })
    
    async def new_invite(self, event):
        """Send a new invite message to the WebSocket"""
        data = event.get('data', {})
        logger.info(f"Sending new invite message to user {self.user_id} with data {data}")
        await self.send_json({
            'type': 'game_invite', # new_invite
            'payload': data
        })
    
    async def event_detail_change(self, event):
        """Send an event detail change message to the WebSocket"""
        await self.send_json({
            'type': 'event_detail_change',
        })
        
    async def accessible_events_change(self, event):
        """Send an accessible events change message to the WebSocket"""
        print('sending accessible_events_change received')
        await self.send_json({
            'type': 'accessible_events_change'
        })
    
    async def tournament_end(self, event):
        """Send a tournament end message to the WebSocket"""
        await self.send_json({
            'type': 'tournament_end',
            'payload': event.get('data', {})
        })

    async def round_launch(self, event):
        await self.send_json({
            'type': 'round_launch'
            })
