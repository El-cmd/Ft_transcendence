from django.shortcuts import render
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework.decorators import api_view, renderer_classes, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.core.exceptions import ObjectDoesNotExist, FieldError
from django.db.models import Q
from django.http import Http404

from rest_framework.authentication import get_authorization_header
from .errors import TokenExpiredException
from .accounts_request import AuthorisedRequest
from rest_framework_simplejwt.authentication import JWTStatelessUserAuthentication

from .serializers import PrivateMessageSerializer, ConversationDetailsSerializer, ConversationsSnippetsSerializer
from .models import PrivateMessage
from rest_framework.views import APIView
from django.contrib.auth.models import User
from django.core.cache import cache 

from django.urls import reverse

# returns a snippet of every conversation of the request.user
# -> who is the other user, the timestamp and content of last message (and possibly the msg status if implemented)
# -> used to display the list of all private conversations, kinda like an index page
class  PreviewsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTStatelessUserAuthentication]
    serializer_class = ConversationsSnippetsSerializer

    def get_queryset(self):
        user_id = self.request.user.id
        # jwt_token = self.request.headers.get("Authorization").split(" ")[1]
        auth_header = get_authorization_header(self.request)
        jwt_token = auth_header.decode().split(" ")[1] if auth_header else None

        messaged_users = set() # set to avoir duplicates
        last_messages = {}

        for msg in PrivateMessage.objects.filter(Q(sender=user_id) | Q(recipient=user_id)):
            other_user = msg.recipient if msg.sender == user_id else msg.sender
            if other_user not in messaged_users:
                messaged_users.add(other_user)
                last_messages[other_user] = msg
            else:
                # Update the last message if this one is newer
                if last_messages[other_user].timestamp < msg.timestamp:
                    last_messages[other_user] = msg

        # messaged_users = [] # exclude the users we haven't talked to, as their profile would be serialized otherwise 
        # for msg in PrivateMessage.objects.all():
        #     if user_id == msg.sender and msg.recipient not in messaged_users:
        #         messaged_users.append(msg.recipient)
        #     elif user_id == msg.recipient and msg.sender not in messaged_users:
        #         messaged_users.append(msg.sender)
        # queryset = AuthorisedRequest.get_instance(jwt_token).get_convo_profiles(messaged_users)

        # Sort users by their last message timestamp (most recent first)
        # The key argument tells python how to sort the users. reverse=True makes the sorting descending 
        sorted_users = sorted(messaged_users, key=lambda u: last_messages[u].timestamp, reverse=True) 

        # Fetch conversation profiles in descending order (most recent first)
        queryset = AuthorisedRequest.get_instance(jwt_token).get_convo_profiles(sorted_users)
        return queryset
    
    def handle_exception(self, exc):
        """Custom exception handler to catch token expiration"""
        if isinstance(exc, TokenExpiredException):
            return Response(
                {"detail": "Token has expired. Please refresh it."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)  # Default handling for other errors
        

class  DetailsView(generics.RetrieveAPIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTStatelessUserAuthentication]
    serializer_class = ConversationDetailsSerializer

    def get_object(self):
        other_user_id = self.kwargs['pk']
        # jwt_token = self.request.headers.get("Authorization").split(" ")[1]
        auth_header = get_authorization_header(self.request)
        jwt_token = auth_header.decode().split(" ")[1] if auth_header else None

        try:
            # Get the profile data for the other user
            profile_data = AuthorisedRequest.get_instance(jwt_token).get_profile(other_user_id)
            if not profile_data:
                raise Http404("User not found")
            return profile_data.json() 
        except Exception as e:
            raise Http404(f"Error retrieving conversation: {str(e)}")

    def handle_exception(self, exc):
        """Custom exception handler to catch token expiration"""
        if isinstance(exc, TokenExpiredException):
            return Response(
                {"detail": "Token has expired. Please refresh it."}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
        return super().handle_exception(exc)  # Default handling for other errors

@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy"})

# !!! does not check if user exists 
@api_view(['GET'])
def get_user_status(request, pk):
    user_id = self.kwargs['pk']
    key = f"user:{user_id}:connectedCount"
    last_seen_key = f"user:{user_id}:last_seen"

    if cache.get(key, 0) > 0:
        status_data = {"status": "online"}
    else:
        last_seen = cache.get(last_seen_key, "Unknown")
        status_data = {"status": "offline", "last_seen": last_seen}
        
    return Response(status_data)
    
# the friends ids whose status needs to be fetched are passed in the query parameters 
@api_view(['GET'])
def get_friends_status(request):
    user_ids = request.GET.getlist("user_ids[]")  # Friends passed as a list of IDs
    status_data = {}

    for user_id in user_ids:
        key = f"user:{user_id}:connectedCount"
        last_seen_key = f"user:{user_id}:last_seen"

        if cache.get(key, 0) > 0:
            status_data[user_id] = {"status": "online"}
        else:
            last_seen = cache.get(last_seen_key, "Unknown")
            status_data[user_id] = {"status": "offline", "last_seen": last_seen}

    return Response(status_data)