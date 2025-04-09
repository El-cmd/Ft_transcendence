from django.db import models
from events.models import Event, EventPlayer
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from .errors import *
from events.signals import rank_update_signal, stop_signal


class Game(Event):
    score_to_win = models.PositiveSmallIntegerField(default=5)
    auto_start = True
    

    def score_goal(self, role : int):
        if not self.has_begin or self.is_over:
            raise NoGoalError()
        print(self.players.get(role=role).user, 'has scored')
        self.players.get(role=role).goal()
       
    @property
    def end_condition(self):
        score_lst = [player.score for player in EventPlayer.objects.filter(event=self)]
        has_not_gave_up = EventPlayer.objects.filter(event=self, gave_up=False).count()
        return not (max(score_lst) < self.score_to_win and has_not_gave_up > 1)

        
    @receiver(rank_update_signal, sender=EventPlayer)
    def update_rank(event, **kwargs):
        if not Game.objects.filter(pk=event.pk).exists() or not event.has_begin or event.is_over:
            return
        
        game = Game.objects.get(pk=event.pk)
        
        players = EventPlayer.objects.filter(event=game, gave_up=False).all()
        scores = players.order_by('-score').values_list('score', flat=True).distinct()
        
        for i, score in enumerate(scores):
            for player in players.filter(score=score):
                player.rank = 1 + i
                player.save()
                
        for player in EventPlayer.objects.filter(event=game, gave_up=True).all():
            player.rank = max(players, key=lambda x: x.rank).rank + 1
            player.save()
        
            
        if game.end_condition:
            stop_signal.send(sender=game.__class__, event=game)
    
            


