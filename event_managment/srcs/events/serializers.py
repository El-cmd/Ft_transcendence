from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied
from .models import Event, EventPlayer, EventInvite
from.accounts_request import AuthorisedRequest
from django.utils import timezone

from django.urls import reverse


class ActionOnEvent():
    def __init__(self, event : Event, user : int):
        self.actions = {}
        self.event : Event = event
        self.user : int = user
        if self.user == self.event.owner:
            pass
        if self.event.has_begin or self.event.is_full:
            return
        if self.event.is_invited(self.user) :
            self.actions['accept'] = reverse('event-join', args=[self.event.id])
        elif self.event.is_public and not self.event.is_player(self.user):
            self.actions['join'] = reverse('event-join', args=[self.event.id])
        if self.event.is_invited(self.user):
            self.actions['deny'] = reverse('event-uninvite', args=[self.event.id])
        if self.event.is_player(self.user):
            self.actions['unjoin'] = reverse('event-unjoin')

class EventPlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventPlayer
        fields = '__all__'
    
class EventInviteSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = EventInvite
        fields = ['user', 'userevent_name']

    # user = serializers.SerializerMethodField()
    userevent_name = serializers.SerializerMethodField()
    
    # def get_user(self, instance):
    #     return super().to_representation(instance)

    def get_userevent_name(self, obj : EventPlayer):
        return AuthorisedRequest.get().get_user(obj.user)['username']
    
    # def get_eventname(self, obj : EventPlayer):
    #     return obj.event.name
    

class EventSerializer(serializers.ModelSerializer):
    """
    Serializer to create and update events
    """

    actions = serializers.SerializerMethodField()
    type_str = serializers.SerializerMethodField()
    ready = serializers.SerializerMethodField()
    time_since_end = serializers.SerializerMethodField()
    user_rank = serializers.SerializerMethodField()
    inviteds = serializers.SerializerMethodField()
    players = EventPlayerSerializer(many=True, read_only=True)


    def get_user_rank(self, obj):
        if obj.has_begin:
            if obj.is_over and obj.is_player(self.context['request'].user.id):
                return f"{obj.players.get(user=self.context['request'].user.id).rank} / {max(obj.players.all(), key=lambda x: x.rank).rank}"
        return None

    def get_time_since_end(self, obj):
        if obj.is_over:
            return (timezone.now() - obj.end_date).total_seconds()
        else:
            return None
    
    def get_type_str(self, obj):
        return obj.get_type_display
    
    def get_actions(self, obj):
        return ActionOnEvent(obj, self.context['request'].user.id).actions
    
    def get_ready(self, obj):
        if EventPlayer.objects.filter(event=obj, user=self.context['request'].user.id):
            return EventPlayer.objects.get(event=obj, user=self.context['request'].user.id).ready
        return False

    def get_inviteds(self, obj):
        return EventInviteSerializer(many=True, read_only=True, context={'request': self.context['request']}).to_representation(EventInvite.objects.filter(event=obj))
    
    class Meta:
        model = Event
        fields = [
            'id', 
            'name', 
            'description', 
            'is_over',
            'is_public', 
            'max_players',
            'has_begin',
            'actions',
            'type_str',
            'ready',
            'players',
            'inviteds',
            'actions',
            'end_date',
            'time_since_end',
            'user_rank',
        ]
        
        extra_kwargs = {
            'owner': {'read_only': True},
            'is_over' : {'read_only': True},
            'id' : {'read_only': True},
        }
  




