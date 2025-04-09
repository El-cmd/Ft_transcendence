from rest_framework import serializers
from .models import Game
from events.models import EventPlayer
from events.serializers import EventSerializer
from events.accounts_request import AuthorisedRequest

class GameSerializer(serializers.ModelSerializer):
    """
    Serializer to create and update events
    """
    
    def to_representation(self, instance : Game):
        event_data = EventSerializer(instance, context={'request':self.context['request']}).data
        event_data['score_to_win'] = instance.score_to_win
        from tournaments.models import TournamentGame
        if TournamentGame.objects.filter(game=instance).exists():
            event_data['tournament'] = TournamentGame.objects.get(game=instance).tournament.id
        else:
            event_data['tournament'] = None
        return event_data

    class Meta:
        model = Game
        fields = '__all__'
        extra_kwargs = {
            'owner': {'read_only': True},
        }
        
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user.id
        game : Game = super().create(validated_data)
        game.add_player(validated_data['owner'])
        return game
    