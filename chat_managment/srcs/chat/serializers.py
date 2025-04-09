from .accounts_request import AuthorisedRequest
from rest_framework import serializers
from rest_framework.fields import CurrentUserDefault
from django.contrib.auth.models import User
from django.urls import reverse
from .models import PrivateMessage 
from .errors import PrivateMessageError, TokenExpiredException
from django.db.models import Q
import logging


class PrivateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PrivateMessage
        fields = ['id', 'sender', 'recipient', 'content', 'timestamp', 'message_type'] # 'status' 

# obj is a Profile
class ConversationDetailsSerializer(serializers.Serializer): # ModelSerializer ?

    class Meta:
        fields = ['id', 'other_profile', 'messages']

    messages = serializers.SerializerMethodField()
    other_profile = serializers.SerializerMethodField()

    def get_qs(self, obj) -> list:
        user = self.context['request'].user.id
        convo = PrivateMessage.objects.filter(sender__in = [obj['id'], user], recipient__in = [user, obj['id']])

        print('------- messages in convo ', user, ' : ', convo)

        print('------- game invitations for convo ', user, ' : ', convo.filter(message_type = 'game_invite'))
        
        active_game_invites = convo.filter(message_type = 'game_invite', is_active = True)

        print('------- active game invitations for convo ', user, ' : ', active_game_invites)

        # ne peut avoir que deux active invitations a la fois : une par user (si chacun.e a invité l'autre)
        latest_own_active_invite = active_game_invites.filter(sender = user).order_by('-timestamp').first()
        latest_other_active_invite = active_game_invites.filter(sender = obj['id']).order_by('-timestamp').first()

        for invite in active_game_invites:
            if invite not in [latest_own_active_invite, latest_other_active_invite]:
                print('------------- Marking invite ', invite, ' as inactive')
                invite.is_active = False
                invite.save()
        
        return convo.exclude(
                Q(should_send=False) & Q(recipient=user)
            ).exclude(
                Q(message_type='game_invite') & Q(is_active=False)
            ).order_by('timestamp')

    def get_messages(self, obj):
        user = self.context['request'].user.id

        messages = self.get_qs(obj)
        # for msg in messages:
        #     if msg.recipient == user and  msg.status is not MessageStatus.READ:
        #         try:
        #             msg.update_status(MessageStatus.READ)
        #         except PrivateMessageError as e:
        #             print(e)        
        return PrivateMessageSerializer(messages, many=True).data
    
    def get_other_profile(self, obj):
        jwt_token = self.context['request'].headers.get("Authorization") 
        response = AuthorisedRequest.get_instance(jwt_token).get_profile(obj['id'])
        if response.status_code == 401: 
            raise TokenExpiredException
        return response.json()

# obj is a profile
class ConversationsSnippetsSerializer(serializers.Serializer): # ModelSerializer ?

    class Meta:
        fields = ['id', 'other_profile', 'last_message', 'relation_type'] # ,       # user's id username et avatar avec get_user (user short infos) 

    last_message = serializers.SerializerMethodField()
    other_profile = serializers.SerializerMethodField()
    relation_type = serializers.SerializerMethodField()

    def get_qs(self, obj): # verifier que obj est bien le PK de l'autre user
        user = self.context['request'].user.id
        return PrivateMessage.objects.filter(
            sender__in = [obj['id'], user], recipient__in= [user, obj['id']]).exclude(Q(should_send=False) & Q(recipient=user)).order_by('timestamp').last()
    
    # def update_statuses(self, obj):
    #     user = self.context['request'].user.id

    #     messages = PrivateMessage.objects.filter(
    #         sender__in = [obj['id'], user], recipient__in= [user, obj['id']]).exclude(Q(should_send=False) & Q(recipient=user)).order_by('timestamp')
    #     for msg in messages:
    #         if msg.recipient == user:
    #             try:
    #                 msg.update_status(MessageStatus.DELIVERED)
    #             except PrivateMessageError as e:
    #                 print(e)    
    
    def get_relation_type(self, obj):
        user = self.context['request'].user.id
        jwt_token = self.context['request'].headers.get("Authorization") 
        response = AuthorisedRequest.get_instance(jwt_token).get_relation_to(user,obj['id'])
        if response.status_code == 401: 
            raise TokenExpiredException
        return response.json()
        # return AuthorisedRequest.get_instance(jwt_token).get_relation_to(user,obj['id'])

    def get_last_message(self, obj):
        user = self.context['request'].user.id

        last_message = self.get_qs(obj)
        # self.update_statuses(obj)    
        return PrivateMessageSerializer(last_message, many=False).data

    def get_other_profile(self, obj):
        jwt_token = self.context['request'].headers.get("Authorization") 
        # response = AuthorisedRequest.get_instance(jwt_token).get_user(obj['id']) 
        response = AuthorisedRequest.get_instance(jwt_token).get_profile(obj['id'])
        if response.status_code == 401: 
            raise TokenExpiredException
        return response.json()
        # return AuthorisedRequest.get_instance(jwt_token).get_user(obj['id']) 