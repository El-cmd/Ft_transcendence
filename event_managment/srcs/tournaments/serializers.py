from rest_framework import serializers
from .models import Tournament, EventPlayer, TournamentGame

from events.accounts_request import AuthorisedRequest
from events.serializers import EventSerializer
from games.serializers import GameSerializer

class TournamentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = '__all__'

    
    def get_owner(self, obj):
        return AuthorisedRequest.get_instance().get_user(obj.owner)
    
    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user.id
        tournament : Tournament = super().create(validated_data)
        tournament.add_player(validated_data['owner'])
        return tournament
    
    def to_representation(self, instance : Tournament):
        event_data = EventSerializer(instance, context={'request':self.context['request']}).data
        event_data['score_to_win'] = instance.score_to_win
        event_data['event_games'] = {}
        # final, semi, quarter, huit, sixteen, thirty_two
        # -> 1, 2, 4, 8, 16, 32
        # -> 0, 1, 2, 3, 4, 5
        round_name = ['final', 'semi', 'quarter', 'huit', 'sixteen', 'thirty_two']
        for i in range(instance.initial_round, -1, -1):
            event_data['event_games'][i] = {
                round_name[i] : GameSerializer(instance.get_round_games(i), many=True, context={'request':self.context['request']}).data,
            }


        return event_data