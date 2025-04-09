import jwt
import logging
import functools

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from asgiref.sync import sync_to_async, async_to_sync
from urllib.parse import parse_qs
from django.conf import settings
from django.apps import apps
from .models import Event, EventPlayer
from .errors import *
from channels.layers import get_channel_layer
from django.dispatch import receiver
from tournaments.signals import skiped_game_signal, round_launch_signal
from .accounts_request import AuthorisedRequest

# Configure logging
logger = logging.getLogger(__name__)
# Import signals - ensure full path used
from events.signals import (
    new_public_signal,
    event_launch_signal,
    event_over_signal,
    rank_update_signal,
    invite_signal,
    player_status_update,
    new_player_signal,
    player_ready_signal,
    stop_signal,
    player_give_up
)
from .consumers import EventConsumer

# Add debug logging to confirm the module is loaded
logger.info("SIGNALS BROADCASTER MODULE LOADED")

# Utility functions for async operations
def get_channel_layer_safe():
    """Get channel layer with error handling"""
    try:
        return get_channel_layer()
    except Exception as e:
        logger.error(f"Error getting channel layer: {str(e)}")
        raise

def send_to_all_users(type):
    """Send a message to all connected users"""
    try:
        channel_layer = get_channel_layer_safe()
        logger.info("Sending new public event signal")
        async_to_sync(channel_layer.group_send)(
            EventConsumer.main_channel_name,
            {
                'type': type
            }
        )
    except Exception as e:
        logger.error(f"Error sending to all users: {str(e)}")


def send_to_user(user_id, message_type, data=None):
    """Send a message to a specific user"""
    try:
        data = data or {}
        data = {str(k): v for k, v in data.items()}
        logger.info(f"Sending {message_type} to user {user_id}")
        channel_layer = get_channel_layer_safe()
        user_group_name = f'user_{user_id}'
        async_to_sync(channel_layer.group_send)(
            user_group_name,
            {
                'type': message_type,
                'data': data
            }
        )
    except Exception as e:
        logger.error(f"Error sending to user {user_id}: {str(e)}")

def send_to_event(event_id, message_type, data=None, data_name = 'data'):
    """Send a message to all users in a specific event"""
    try:
        data = data or {}
        channel_layer = get_channel_layer_safe()
        event_group_name = f'event_{event_id}'
        logger.info(f"|||||||||Sending {message_type} to event {event_id}")
        
        data = {str(k): v for k, v in data.items()}
        async_to_sync(channel_layer.group_send)(
            event_group_name,
            {
                'type': message_type,
                data_name: data
            }
        )
    except Exception as e:
        logger.error(f"Error sending to event {event_id}: {str(e)}")

# Helper for getting players in an event
def get_event_players(event):
    """Get all players in an event"""
    return list(event.players.all())

# Signal receivers with very explicit logging to debug
@receiver(new_public_signal, dispatch_uid="broadcast_new_public_event")
def broadcast_new_public_event(sender, event, **kwargs):
    """Handle new public event signal"""
    logger.info(f"✅ NEW PUBLIC EVENT SIGNAL RECEIVED: {event}")
    send_to_all_users('accessible_events_change')
    
@receiver(event_launch_signal, dispatch_uid="broadcast_event_launch")
def broadcast_event_launch(sender, event : Event, **kwargs):
    """Handle event launch signal"""
    event_id = event.id
    logger.info(f"✅ EVENT LAUNCH SIGNAL RECEIVED FOR EVENT {event_id}")
    if event.get_type_display in ['game', 'tournament_game']:
        send_to_event(event_id, 'game_launch', {'num_players' : event.max_players})
    else :
        send_to_event(event_id, 'tournament_launch')
    # Send to event group
    
    # Notify all players individually to update their status
    players = get_event_players(event)
    for player in players:
        logger.info(f"Sending player_status update to user {player.user} for event launch")
        broadcast_player_status_update(sender, player.user)
    
@receiver(event_over_signal, dispatch_uid="broadcast_event_over")
def broadcast_event_over(sender, event, **kwargs):
    """Handle event over signal"""
    event_id = event.id
    logger.info(f"✅ EVENT OVER SIGNAL RECEIVED FOR EVENT {event_id}")
    send_to_event(event_id, 'event_end', {'event_type' : event.get_type_display})
    send_to_all_users('event_detail_change')
    
    for player in event.players.all():
        broadcast_player_status_update(sender, player.user)
    
        
    # Tell all participants to leave the event channel
    send_to_event(event.id, 'leave_event',  {'event_id': event.id})
    
@receiver(rank_update_signal, dispatch_uid="broadcast_rank_update")
@receiver(event_over_signal, dispatch_uid="broadcast_rank_update")
def broadcast_rank_update(sender, event, **kwargs):
    """Handle rank update signal"""
    event_id = event.id
    logger.info(f"✅ RANK UPDATE SIGNAL RECEIVED FOR EVENT {event_id}")
    data = {}

    players = get_event_players(event)
    logger.debug(f'----------------- players : {players}')
    for player in players:
        user = user = AuthorisedRequest.get().get_user(player.user)
        game_name = player.userevent_name if player.userevent_name else user.username 
        # if not player.gave_up:
        #     data[f'player{player.role}'] = {'name': game_name, 'score': str(player.score)}
        # else:
        #     data[f'player{player.role}'] = {'name': game_name, 'score': 'gave_up'}
        if not player.gave_up:
            data[f'player{player.role}'] = f'{game_name} : {str(player.score)}'
        else:
            data[f'player{player.role}'] = f'{game_name} : gave up'
    
    send_to_event(event_id, 'update_score_board', data)
    send_to_all_users('event_detail_change')
    
@receiver(invite_signal, dispatch_uid="broadcast_invite")
def broadcast_invite(sender, event, user_id, invited_by_id, **kwargs):
    """Handle invite signal"""
    event_id = event.id
    logger.info(f"✅ INVITE SIGNAL RECEIVED FOR USER {user_id} TO EVENT {event_id}")
    send_to_user(user_id, 'new_invite', {'event_id': event_id, 'invited_by_id': invited_by_id})
    send_to_user(user_id, 'accessible_events_change')
    send_to_event(event_id, 'event_detail_change', {'user_id': user_id})
import time
@receiver(player_status_update, dispatch_uid="broadcast_player_status_update")
def broadcast_player_status_update(sender, user_id, **kwargs):
    """Handle player status update signal"""
    logger.info(f"✅ PLAYER STATUS UPDATE SIGNAL RECEIVED FOR USER {user_id}")
    pstatus = Event.player_status(user_id)
    pstatus['last_update'] = time.time()
    logger.info(f"Sending status '{pstatus}' to user {user_id}")
    send_to_user(user_id, 'player_status', Event.player_status(user_id))

    
@receiver(new_player_signal, dispatch_uid="broadcast_new_player")
def broadcast_new_player(sender, event, user_id, **kwargs):
    """Handle new player signal"""
    event_id = event.id
    
    logger.info(f"✅ NEW PLAYER SIGNAL RECEIVED FOR USER {user_id} IN EVENT {event_id}")
    # send_to_event(event_id, 'new_player')
    event_type = event.get_type_display if event.get_type_display != 'tournament_game' else 'game'
    send_to_user(user_id, 'join_event', {'event_id': event_id, 'event_type': event_type})
    send_to_event(event_id, 'event_detail_change')

   
@receiver(skiped_game_signal, dispatch_uid="broadcast_skiped_game")
def broadcast_skiped_game(sender, tournament_id, skiped_game_id, user_to_prevent, **kwargs):
    """Handle skiped game signal"""
    logger.info(f"✅ SKIPED GAME SIGNAL RECEIVED FOR TOURNAMENT {tournament_id} GAME {skiped_game_id}")
    # only append in tournament game so redirect user to tournament game page
    send_to_event(tournament_id, 'event_detail_change')

@receiver(player_ready_signal, dispatch_uid="broadcast_player_ready")
def broadcast_player_ready(sender, event, **kwargs):
    """Handle player ready signal"""
    event_id = event.id
    logger.info(f"✅ PLAYER READY SIGNAL RECEIVED FOR EVENT {event_id}")
    send_to_event(event_id, 'event_detail_change')
    send_to_all_users('event_detail_change')
    
from django.db.models.signals import post_delete, post_save
@receiver(post_delete, sender=EventPlayer, dispatch_uid="broadcast_player_quit")
def broadcast_player_quit(sender, instance, **kwargs):
    """Handle player quit signal"""
    event_id = instance.event.id
    logger.info(f"✅ PLAYER QUIT SIGNAL RECEIVED FOR EVENT {event_id}")
    send_to_event(event_id, 'event_detail_change')
    send_to_all_users('event_detail_change')
    broadcast_player_status_update(sender, instance.user)

@receiver(player_give_up, sender=EventPlayer, dispatch_uid="broadcast_player_update")
def broadcast_player_give_up(sender, event_player, **kwargs):
    """Handle player give up signal"""
    event_id = event_player.event.id

    logger.info(f"✅ PLAYER GIVE UP SIGNAL RECEIVED FOR EVENT {event_id}")
    
    send_to_event(event_id, 'player_gave_up', {'player': event_player.role}, data_name='payload')
    # send_to_all_users('event_detail_change')
    
    broadcast_player_status_update(sender, event_player.user)
    
    
# @receiver(post_save, sender=EventPlayer, dispatch_uid="broadcast_player_join")
# def broadcast_player_join(sender, instance, **kwargs):
#     """Handle player join signal"""
#     event_id = instance.event.idi
#     logger.info(f"✅ PLAYER JOIN SIGNAL RECEIVED FOR EVENT {event_id}")
#     broadcast_player_status_update(sender, instance.user)



@receiver(round_launch_signal, dispatch_uid="broadcast_round_launch_signal")
def broadcast_round_launch_signal(sender, user_id, **kwargs):
    logger.info(f"✅ ROUND LAUNCH SIGNAL RECEIVED FOR TOURNAMENT {user_id}")
    send_to_user(user_id, 'round_launch')
    # try:
    #     from tournaments.models import Tournament, TournamentGame
        
    #     # First notify all tournament participants
        
    #     # Then notify all players in the new round's games
    #     print(event.games.all(), "signal received")
    #     for game in event.games.all():  # <-- Use .all() to get the queryset iterator
    #         tournament_game = TournamentGame.objects.get(game=game, tournament=event)
    #         if event.current_round == tournament_game.round:
    #             send_to_event(game.id, 'new_tournament_game', {
    #                 'round': event.current_round,
    #                 'tournament_id': event.id
    #             })
    #             logger.info(f"Notifying about new tournament game {game.id} in round {event.current_round}")
                
                    
    # except Exception as e:
    #     logger.error(f"Error in broadcast_round_launch_signal: {str(e)}")