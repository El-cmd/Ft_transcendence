from django.db import models
from django.dispatch import receiver
from django.db.models.signals import post_save
from .errors import *
from django.db.models import QuerySet
from .signals import *
from django.utils import timezone


class Event(models.Model):
    name = models.CharField(max_length=30, default='event!')
    description = models.TextField(default='event description')
    owner = models.PositiveIntegerField()
    has_begin = models.BooleanField(default=False)
    is_over = models.BooleanField(default=False)
    is_public = models.BooleanField(default=False)
    max_players = models.PositiveIntegerField(default=2)
    end_date = models.DateTimeField(null=True, blank=True)
    


    @staticmethod
    def player_status(user_pk : int):
        status = {
            'game_status': 'None',
            'tournament_status': 'None',
            'game_id': None,
            'tournament_id': None,
            'game_size':0,
        }
        try :
            current_game = Event.current_game(user_pk)
            if current_game is not None:
                status['game_id'] = current_game.id
                game_player = current_game.players.get(user=user_pk)
                status['game_status'] = game_player.status
                status['game_size'] = current_game.max_players
            else:
                status['game_status'] = 'None'        
        except NotInAnEventError:
            status['game_status'] = 'None'

        try :
            current_tournament = Event.current_tournament(user_pk)
            if current_tournament is not None:
                status['tournament_id'] = current_tournament.id
                tournament_player = current_tournament.players.get(user=user_pk)
                status['tournament_status'] = tournament_player.status
            else:
                status['tournament_status'] = 'None'
        except NotInAnEventError:
            status['tournament_status'] = 'None'
        # print('status', status)
        return status
    
    @property
    def get_type_display(self):
        # import in function to conturn circular import
        from games.models import Game
        from tournaments.models import Tournament, TournamentGame
        if Tournament.objects.filter(id=self.id).exists():
            return 'tournament'
        if Game.objects.filter(id=self.id).exists():
            if TournamentGame.objects.filter(game=self).exists():
                return 'tournament_game'
            return 'game'
        raise AbastractEvent
    
    # filters
    @staticmethod
    def get_list(pk):
        return Event.objects.filter(id__in=[event.id for event in Event.objects.all() if event.players.filter(user=pk).exists()]).all()

    @staticmethod
    def get_accessible_events(user_pk : int):
        # check if user is already in an event that as not begin
        EventPlayer.join_permission(user_pk)
        base_qs = Event.objects.filter(pk__in=[event.pk for event in Event.objects.all() if event.accessible(user_pk)]).annotate(remaining_slots=models.F('max_players') - models.Count('eventplayer')).order_by('remaining_slots')
        print('in get_accessible_events, ok here')
        inviteds = EventInvite.get_all_invites(user_pk, base_qs)
        
        return {
            'inviteds': inviteds,
            'publics': base_qs.exclude(pk__in=inviteds.values_list('pk', flat=True))
        }

    @staticmethod
    def get_over_events(user : int):
        return EventPlayer.event_with(user).filter(is_over=True).order_by('-end_date').all()


    @staticmethod
    def get_inviteds_events(user : int):
        return EventInvite.get_all_invites(user, Event.objects.all())
    
    def invite_perm(self, pk : int):
        if self.has_begin or self.is_full:
            return False
        if self.is_player(pk) or pk == self.owner:
            return True
        from tournaments.models import TournamentGame
        # tournament game can't be retrieved individuallly
        if TournamentGame.objects.filter(tournament=self).exists():
            return False
        return False
    # actions

    def add_player(self, pk):
        if not self.accessible(pk) and self.players.count() > 0 and pk != self.owner:
            raise NotPublicNotInvitedError()
        
        EventPlayer.join_permission(pk)
        if self.is_full or self.has_begin:
            return
        EventPlayer.create_player(pk, self)
        
        
    def remove_player(self, pk):
        self.remove_player_ok(pk)
        EventPlayer.remove_player(pk, self)
        if self.players.count() == 0:
            self.delete()
        
    def invite_player(self, pk :int, from_user : int):
        if self.is_full:
            raise EventFullError()
        if self.has_begin:
            raise EventHasBegin()
        if EventPlayer.is_player(pk, self):
            raise CanNotInviteAlreadyInvitedPlayerError()
        if EventInvite.is_invited(pk, self):
            raise CanNotInviteAlreadyInvitedPlayerError()
        EventInvite.invite(pk, self, from_user=from_user)

    def uninvite_player(self, pk : int):
        if not self.is_invited(pk):
            raise NotInvitedError()
        EventInvite.objects.get(user=pk, event=self).delete()
        
    def launch(self, user_pk : int):
        if self.owner != user_pk and not self.is_player(user_pk):
            raise PermissionError()
        if not self.is_full:
            raise NotEnoughPlayersError()
        if self.has_begin:
            raise AlreadyLaunchedError()
        for i, player in enumerate(self.players.all()):
            player.role = i + 1
            player.save()
        self.has_begin = True
        self.save()
        event_launch_signal.send(sender=self.__class__, event=self)
        
    @receiver(stop_signal)
    def end(event, **kwargs):
        if not event.has_begin:
            raise CanNotEndIfHasNotBeginError()
        if event.is_over:
            raise EventOverError()
        # if event.child_property(lambda x: x.end_condition):
        event.is_over = True
        event.end_date = timezone.now()
        event.save()
        event.elo_variation()
        
        event_over_signal.send(sender=event.__class__, event=event)
        
    def elo_variation(self):
        # send request to accounts api to update rank
        # {variation: +-/, user: pk}
        from games.models import Game
        from tournaments.models import TournamentGame, Tournament
        ranks = self.players.order_by('rank').values_list('user', 'rank')
        variation = 0
        data = {}
        for user, rank in ranks:
            if Game.objects.filter(id=self.id).exists():
                print(rank)
                if self.max_players == 2:
                    # rank => 1 ou 2 si 1 -> +10 si 2 -> -10
                    if rank == 1:
                        variation = 10
                    else:
                        variation = -10
                    print('max players 2', variation)
                else:
                    # rank => 1, 2, 3, 4 si 1 -> +20 si 2 -> +10 si 3 -> -10 si 4 -> -20
                    if rank == 1:
                        variation = 20
                    elif rank == 2:
                        variation = 10
                    elif rank == 3:
                        variation = -10
                    else:
                        variation = -20
            if Tournament.objects.filter(id=self.id).exists():
                variation = 10 * (Tournament.objects.get(id=self.id).initial_round - Tournament.objects.get(id=self.id).current_round)
                print('trr max players 4', variation)
            data[user] = variation
        if self.is_public:
            from .accounts_request import AuthorisedRequest
            AuthorisedRequest.get().update_ranks(data)
    
    def give_up(self, user_pk : int):
        EventPlayer.give_up(user_pk, self)
        
    @property
    def end_condition(self):
        return True
        
    @property
    def is_full(self) -> bool:
        return self.player_count == self.max_players
    
    @property
    def player_count(self) -> int :
        return self.players.count()
        
    @property
    def players(self):
        if self.has_begin:
            return EventPlayer.at_event(self).order_by('rank').all()
        return EventPlayer.at_event(self).all()

    @property
    def invited_players(self):
        return EventInvite.objects.filter(event=self).all()
    
    
    def is_player(self, user_pk : int) -> bool:
        return EventPlayer.is_player(user_pk, self)
    
    def is_invited(self, user_pk : int) -> bool:
        return EventInvite.is_invited(user_pk, self)
    
    def user_in(self, user_pk : int):
        return self.owner == user_pk or self.is_player(user_pk) or self.is_invited(user_pk)
    
    # def retreivable(self, user_pk : int) -> bool:
    #     if self.is_public or self.user_in(user_pk) or (self.get_type_display == 'tournament_game') :
    #         return True
    #     return False
    
    def accessible(self, user_pk : int) -> bool:
        if EventPlayer.in_an_event(user_pk) or self.has_begin:
            return False
        if self.is_full:
            return False
        if not self.is_public and not EventInvite.is_invited(user_pk, event=self) and not user_pk == self.owner:
            return False
        return True
    
    def remove_player_ok(self, user_pk : int):
        if self.has_begin:
            raise EventHasBegin()
        if not EventPlayer.objects.filter(user=user_pk).filter(event=self).exists():
            raise NotAPlayerCanNotUnjoinError()
        return True

    @staticmethod
    def current_game(user_pk : int):
        from games.models import Game
        try:
            if Game.objects.filter(id__in=EventPlayer.current_event_ids(user_pk)).exists():
                return Game.objects.get(id__in=EventPlayer.current_event_ids(user_pk))
        except:
            return None
            # return None
            # return Game.objects.get(id__in=EventPlayer.current_event_ids(user_pk))
    
    @staticmethod
    def current_tournament(user_pk : int):
        from tournaments.models import Tournament
        try:
            if Tournament.objects.filter(id__in=EventPlayer.current_event_ids(user_pk)).exists():
                tournament : Tournament = Tournament.objects.get(id__in=EventPlayer.current_event_ids(user_pk))
                if user_pk in [ p.user for p in tournament.qualified_players]:
                    return tournament
        except:
            return None
            # return None
            # return Tournament.objects.get(id__in=EventPlayer.current_event_ids(user_pk))

    def quit(self, user_pk : int):
        if self.has_begin:
            self.give_up(user_pk)
        else:
            self.remove_player(user_pk)
        if self.players.count() == 0:
            self.delete()

    def __str__(self):
        return f'{self.name} {self.pk}, has begin = {self.has_begin}.'
    

from .accounts_request import AuthorisedRequest

class EventPlayer(models.Model):
    user = models.PositiveIntegerField()
    event = models.ForeignKey(Event, on_delete=models.CASCADE)
    score = models.PositiveIntegerField(default=0)
    rank = models.PositiveIntegerField(default=0)
    gave_up = models.BooleanField(default=False)
    role = models.PositiveIntegerField(default=0)
    ready = models.BooleanField(default=False)
    userevent_name = models.CharField(max_length=30, default='')

    @property
    def status(self):
        if self.event.has_begin and (self.gave_up or self.event.is_over):
            return 'None'
        elif self.event.has_begin:
            return 'InProgress'
        if not self.ready:
            return 'NotReady'
        return 'Ready'

        

    def ready_up(self, name = ''):
        # if self.event.get_type_display == 'tournament_game':
        #     from tournaments.models import TournamentGame, Tournament
        #     tg = TournamentGame.objects.get(game=self.event)
        #     tg_player = tg.game.players.get(user=self.user)
        #     name = tg_player.userevent_name
        # elif len(name) == 0:
        #     user = AuthorisedRequest.get().get_user(self.user)
        #     name = user['username']
        #     # do request to user to get player name
        #     pass
        self.ready = True
        if self.event.get_type_display == 'tournament_game':
            from tournaments.models import TournamentGame
            self.userevent_name = TournamentGame.objects.get(game=self.event).tournament.players.get(user=self.user).userevent_name
        elif len(name) > 0:
            self.userevent_name = name
        self.save()
        player_ready_signal.send(sender=self.__class__, event=self.event)
        player_status_update.send(sender=self.__class__, user_id=self.user)
        
    def goal(self):
        print(self.score, 'in goal ..................')
        self.score += 1
        self.save()
        rank_update_signal.send(sender=self.__class__, event=self.event)  # Send signal
         
    
        
    @staticmethod
    def current_event_ids(user : int):

        if not EventPlayer.in_an_event(user):
            raise NotInAnEventError()
        if EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).count() > 2:
            # -> tournament + game
            raise VeryWeirdError()
        return EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).values_list('event__id', flat=True)

    @staticmethod
    def current_event(user : int):
        # if player in event and no current game -> game
        # else -> tournament
        from games.models import Game
        from tournaments.models import Tournament
        event_ids = EventPlayer.current_event_ids(user)
        if Game.objects.filter(id__in=event_ids).exists():
            return Event.objects.get(id=Game.objects.get(id__in=event_ids).id)
        # if tournament -> only one ids
        return Event.objects.get(id__in=event_ids)
            
    
    @staticmethod
    def in_an_event(user : int):
        EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).exists()
        if EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).count() == 1:
            from tournaments.models import Tournament
            # This line had the error - Tournament is a subclass of Event, not a related model
            # Fix: Query the event player table instead and join to the tournament
            event_ids = EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).values_list('event_id', flat=True)
            if Tournament.objects.filter(pk__in=event_ids, has_begin=True).exists():
                t = Tournament.objects.get(id__in=event_ids)
                if user not in [p.user for p in t.qualified_players]:
                    return False
            return True
        return EventPlayer.objects.filter(user=user, event__is_over=False, gave_up=False).exists()
        

    @staticmethod
    def quit_current_event(user_id : int):
        print(f'quit current event for user {user_id}')
        try :
            event = Event.current_tournament(user_id)
            if event:
                event.quit(user_id)
        except Exception as e:
            print(e)
        try :
            event = Event.current_game(user_id)
            if event:
                event.quit(user_id)
        except Exception as e:
            print(e)
    
    @staticmethod
    def join_permission(user_pk : int):
        if EventPlayer.in_an_event(user_pk):
            raise YouCanNotSubscribeToMoreThanOneWaitingEventError()
        return True
        
    @staticmethod
    def get_player(user_pk : int, event : Event):
        if not event.is_player(user_pk):
            raise NotAPlayer()
        return EventPlayer.objects.get(user=user_pk, event=event)
    
    @staticmethod
    def is_player(user_pk : int, event : Event) -> bool:
        return EventPlayer.objects.filter(user=user_pk, event=event).exists()
        
    @staticmethod
    def at_event(event : Event):
        return EventPlayer.objects.filter(event=event).all()
    
    @staticmethod
    def event_with(player : int):
        event_ids = EventPlayer.objects.filter(user=player).all().select_related('event').values_list('event__id', flat=True)
        return Event.objects.filter(id__in=event_ids)
        
    @staticmethod
    def remove_player(user_pk : int, event : Event):
        print('remove player')
        ep = EventPlayer.objects.get(user=user_pk, event=event)
        ep.delete()
        player_status_update.send(sender=ep.__class__, user_id=ep.user)

    @staticmethod
    def create_player(user_pk : int, event : Event):
        
        if EventInvite.is_invited(user_pk, event):
            EventInvite.objects.get(user=user_pk, event=event).delete()
        player = EventPlayer.objects.create(user=user_pk, event=event, userevent_name=AuthorisedRequest.get().get_user(user_pk)['username'])
        if event.is_full:
            EventInvite.objects.filter(event=event).delete()
        player_status_update.send(sender=player.__class__, user_id=user_pk)
        new_player_signal.send(sender=player.__class__, user_id= player.user, event=event)
        return player

    @staticmethod
    def give_up(user_pk : int, event : Event):
        print('--- in givup, for user ', user_pk, event.get_type_display, event.id)
        if not event.has_begin:
            raise EventHasNotBegin()
        if event.is_over:
            raise EventOverError()
        if not EventPlayer.objects.filter(user=user_pk).filter(event=event).exists():
            raise NotAPlayer()
        ep = EventPlayer.objects.get(user=user_pk, event=event)
        ep.gave_up = True
        ep.save()
        player_give_up.send(sender=ep.__class__, event_player=ep)
        rank_update_signal.send(sender=ep.__class__, event=event)
        player_status_update.send(sender=ep.__class__, user_id=ep.user)


    def __str__(self):
        return f'user :{self.user} event:{self.event} gu= {self.gave_up} ready= {self.ready}' +  f' score = {self.score}, rank={self.rank}' if self.event.has_begin else ''


# @receiver(post_save, sender=EventPlayer)
# def post_create_event_player(sender, instance, created, **kwargs):
#     if created:
        
#         instance.role = instance.event.player_count
#         print('role', instance.role, instance.user, instance.event)
#         instance.save()

@receiver(player_ready_signal)
def player_ready(sender, event,  **kwargs):
    print('---------- in @receiver player_ready, event = ', event)
    if event.players.filter(ready=False).exists():
        return
    if not event.is_full:
        return
    event.launch(event.owner)
        
class EventInvite(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="invited_players")
    user = models.PositiveIntegerField()
    
    @staticmethod
    def get_all_invites(user : int, events : QuerySet[Event]):
        invite =[ invite.event.id for invite in EventInvite.objects.filter(user=user).all()]
        return events.filter(id__in=invite).all()
    
    @staticmethod
    def is_invited(user : int, event : Event) -> bool:
        if not EventInvite.objects.filter(user=user).filter(event=event).exists():
            return False
        return True
    
    @staticmethod
    def invite(user_pk : int, event: Event, from_user : int):
        invite = EventInvite.objects.create(user=user_pk, event=event)
        invite_signal.send(sender=invite.__class__, event=event, user_id=user_pk, invited_by_id = from_user)
        return invite
    
    def __str__(self):
        return f'{self.user} was invited to {self.event}'
