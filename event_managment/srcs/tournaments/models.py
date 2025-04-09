from cmath import log, sqrt
from django.db import models
from django.dispatch import receiver
from django.db.models import signals
from games.models import Event, EventPlayer, Game
from events.signals import event_over_signal, stop_signal, event_launch_signal
from events.errors import *
from events.signals import *
from .signals import tournament_game_is_over_signal, skiped_game_signal, round_launch_signal
import logging
from events.signals_broadcaster import broadcast_event_over

logger = logging.getLogger(__name__)
class Tournament(Event):
    # round 0 is the final round -> 1 game -> 2 player with the highest score 
    # round 1 is the semi-final round -> 2 games -> 4 players with the highest score
    # round 2 is the quarter-final round -> 4 games -> 8 players with the highest score
    # max_players = models.IntegerField(choices=TOURNAMENT_SIZE, default=8)
    games = models.ManyToManyField(Game, blank=True, through='TournamentGame')
    current_round = models.PositiveSmallIntegerField(default=0)
    score_to_win = models.PositiveSmallIntegerField(default=5)

    @receiver(event_launch_signal)
    def create_round_after_launch(sender, event, **kwargs):
        if Tournament.objects.filter(pk=event.pk).exists():
            logger.info(f'tournament after_launch')
            Tournament.objects.get(pk=event.pk).create_round_game()
        
    def get_round_games(self, round=None):
        if round is None:
            round = self.current_round
        return Game.objects.filter(id__in=[tg.game.id for tg in TournamentGame.objects.filter(tournament=self, round=round).all()])
   
    def create_round_game(self):
        logger.info(f'creating round {self.current_round} for tournament {self.pk} {self.score_to_win}')
        for i in range(2 ** self.current_round):
            game = Game.objects.create(max_players=2, owner=self.owner, score_to_win=self.score_to_win, is_public=False)
            TournamentGame.objects.create(game=game, tournament=self, round=self.current_round)
            p0 = self.qualified_players[2 * i]
            p1 = self.qualified_players[2 * i + 1]
            EventPlayer.create_player(event=game, user_pk=p0.user)
            EventPlayer.create_player(event=game, user_pk=p1.user)
            if self.current_round == 0:
                name = f'{self.name} - final'
            elif self.current_round == 1:
                name = f'{self.name} - semi-final'
            else:
                name = f'{self.name} - round {self.current_round}'
            description = f'{p0.userevent_name} vs {p1.userevent_name}'
            game.name = name
            game.description = description
            game.save()
            self.games.add(game)
            if p0.gave_up == True:
                self.skip_game(game.pk, p0.user)
            if p1.gave_up == True:
                self.skip_game(game.pk, p1.user)
            
            self.save()
        # round_launch_signal.send(sender=Event, event = self)
        for player in self.qualified_players:
            round_launch_signal.send(sender=player.__class__, user_id=player.user)
            player_status_update.send(sender=player.__class__, user_id=player.user)
        logger.info(f'creation done')
            
        
    @property
    def end_condition(self):
        return self.current_round == 0 and TournamentGame.objects.filter(tournament=self, round=self.current_round).filter(game__is_over=True).count() == 1
        
    @receiver(tournament_game_is_over_signal)
    def game_over(tournament_game, **kwargs):
        tournament = tournament_game.tournament
        for tournament_game in TournamentGame.objects.filter(tournament=tournament.pk, round=tournament.current_round):
            if not tournament_game.game.is_over:
                return
        broadcast_event_over(sender=tournament.__class__, event=tournament_game.game)
        if tournament.current_round == 0:
            stop_signal.send(sender=tournament.__class__, event=tournament)
        else:
            tournament.current_round -= 1
            tournament.save()
            tournament.create_round_game()
            
        
    @property
    def qualified_players(self):
        return self.players.order_by('-score').all()[0:self.qualified_player_count]
    
    @property
    def qualified_player_count(self): 
        return 2 ** (self.current_round + 1) if not self.is_over else 1
    
    @property
    def initial_round(self):
        return int( log(self.max_players, 2).real) - 1
    
    
    def quit(self, user):
        print('tournament quit')
        try:
            if self.has_begin and self.get_round_games():
                for game in self.get_round_games():
                    if game.players.filter(user=user).exists():
                        self.skip_game(game.pk, user)
                        break
                        
        except Exception as e:
            print(e)
        super().quit(user)
            
    def skip_game(self, game_id, user_whoquit):
        from games.models import Game
        game : Game = self.games.get(pk=game_id)
        print('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>skipping game')
        if not game.has_begin:
            for player in game.players.all():
                if not player.ready:
                    player.ready = True
                    player.save()
            game.has_begin = True
            game.save()
        game.give_up(user_whoquit)

        for player in game.players.all():
            if player.user == user_whoquit:
                player_status_update.send(sender=player.__class__, user_id=player.user)
        print('game quitted')
            
    
    
    
class TournamentGame(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE)
    round = models.PositiveSmallIntegerField(default=0)
    
    @property
    def game_players(self):
        return self.game.players.all()
    
    @property
    def tournament_players(self):
        return self.tournament.players.filter(user__in=[p.user for p in self.game_players]).all()
    
    def get_correspondent_player(self, player : EventPlayer):
        if Game.objects.filter(pk=player.event.pk).exists() :
            return self.tournament_players.get(user=player.user)
        elif Tournament.objects.filter(pk=player.event.pk).exists():
            return self.game_players.get(user=player.user)
        raise AbastractEvent()
    
    @receiver(event_over_signal, dispatch_uid="update_score")
    def update_score(event : Game, **kwargs):
        event_id = event.pk
        if not TournamentGame.objects.filter(game__id=event_id).exists():
            return
        tournament_game = TournamentGame.objects.get(game=event.pk)
        tournament = tournament_game.tournament
        
        if not tournament_game.game.is_over:
            raise EventNotOverError()
        
        for player in event.players:
            tp = tournament_game.tournament_players.get(user=player.user)
            tp.score = tp.score + 2 - player.rank
            tp.save()
        
        # Fix: Only consider players from THIS tournament
        players = EventPlayer.objects.filter(event=tournament, gave_up=False).all()
        scores = players.order_by('-score').values_list('score', flat=True).distinct()
        
        for i, score in enumerate(scores):
            for player in players.filter(score=score):
                player.rank = 1 + i
                player.save()
                
        # Fix: Only update gave_up players from THIS tournament
        for player in EventPlayer.objects.filter(event=tournament, gave_up=True).all():
            player.rank = len(scores) + 1
            player.save()
            
        tournament_game_is_over_signal.send(sender=tournament_game.__class__, tournament_game=tournament_game)
    
      
    
from django.db.models.signals import post_save
@receiver(post_save, sender=Tournament)
def set_initial_round(sender, instance : Tournament, created, **kwargs):
    if created:
        instance.add_player(instance.owner)
        # EventPlayer.objects.create(event=instance, user=instance.owner)
        instance.current_round = instance.initial_round
        instance.save()
        if instance.is_public:
            new_public_signal.send(sender=instance.__class__, event=instance)
