from django.shortcuts import redirect
from django.urls import reverse
from .models import Event, EventPlayer
from .serializers import EventSerializer, EventPlayerSerializer
from rest_framework import generics, viewsets, mixins
from rest_framework.decorators import action, api_view
from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from rest_framework.response import Response
from .errors import *
from .permissions import EventPermission
from django.core.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from .accounts_request import TokenExpired
from rest_framework_simplejwt.authentication import JWTStatelessUserAuthentication
from rest_framework import status
from functools import wraps

def handle_token_expired(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except TokenExpired:
            return JsonResponse({'Error': 'Token expired'}, status=401)
    return wrapper

class EventViewset(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    authentication_classes = [ JWTStatelessUserAuthentication ]
    permission_classes = [EventPermission, IsAuthenticated]

    
    @handle_token_expired
    @action(detail=False, methods=['get'])
    def player_status(self, request):
        # status = {
        #     'game_status': '',
        #     'tournament_status': '',
        #     'game_id': None,
        #     'tournament_id': None
        # }
        # try :
        #     current_game = Event.current_game(request.user.id)
        #     if current_game is not None:
        #         status['game_id'] = current_game.id
        #         game_player = current_game.players.get(user=request.user.id)
        #         status['game_status'] = game_player.status
        #     else:
        #         status['game_status'] = 'None'        
        # except NotInAnEventError:
        #     status['game_status'] = 'None'
        # try :
        #     current_tournament = Event.current_tournament(request.user.id)
        #     if current_tournament is not None:
        #         status['tournament_id'] = current_tournament.id
        #         tournament_player = current_tournament.players.get(user=request.user.id)
        #         status['tournament_status'] = tournament_player.status
        #     else:
        #         status['tournament_status'] = 'None'
        # except NotInAnEventError:
        #     status['tournament_status'] = 'None'
        return JsonResponse(Event.player_status(request.user.id), safe=False)
    

    def set_player_ready(self, request, name = ''):
        print('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@', name)
        event = EventPlayer.current_event(request.user.id)
        player = event.players.get(user=request.user.id)
        try:
            player.ready_up(name)
        except Exception as e:
            print(e)
        if player.event.has_begin:
            return JsonResponse(status=200, data={'launched': True})
        return JsonResponse(status=200, data={'launched': False})

    # @handle_token_expired
    # @action(detail=False, methods=['get'],)
    # def player_ready(self, request, name = ''):
    #     return self.set_player_ready(request, name)
    
    @handle_token_expired
    @action(detail=False, methods=['get'], url_path=r'player_ready/(?P<name>[-\w]+)')
    def player_ready(self, request, name):
        return self.set_player_ready(request, name)
    
      
    # def player_ready_name(self, request, name):

    # @handle_token_expired
    # def retrieve(self, request, *args, **kwargs):
    #     if not self.get_object().retreivable(request.user.id):
    #         raise PermissionDenied()
    #     return super().retrieve(request, *args, **kwargs)
    
    @handle_token_expired
    def update(self, request, *args, **kwargs):
        raise PermissionDenied('use child api to update event')

    @handle_token_expired
    @action(detail=False, methods=['get'])
    def current_game_player(self, request):
        try:
            g = Event.current_game(request.user.id)
            print(g, g.players, request.user.id)
            if g is None:
                return JsonResponse(status=204, data={'Error': 'No current game'})
            player = g.players.get(user=request.user.id)
            serializer = EventPlayerSerializer(player, many=False)
            return JsonResponse(serializer.data, safe=False)
        except Exception as e:
            print(e)
            return JsonResponse(status=500, data={'Error': 'Internal server error'})
        
    @handle_token_expired
    @action(detail=False, methods=['get'])
    def user_history(self, request):
        # should retunr 
        pass
        # return JsonResponse(serializer.data, safe=False)
    
    @handle_token_expired
    @action(detail=False, methods=['get'])
    def currents(self, request):
        data = {}
        try:
            t = Event.current_tournament(request.user.id)
            if t is not None:
                data['tournament'] = EventSerializer(t, context={'request': request}).data
        except NotInAnEventError:
            return HttpResponse(status.HTTP_204_NO_CONTENT)
        try:
            
            g = Event.current_game(request.user.id)
            if g is not None:
                print(g, type(g))
                data['game'] = self.get_serializer(g).data
        except NotInAnEventError:
            return HttpResponse(status.HTTP_204_NO_CONTENT)
        return JsonResponse(data, safe=False)

    
    # listing methods
    @handle_token_expired
    def list(self, request, *args, **kwargs):
        queryset = Event.get_list(request.user.id)
        serializer = EventSerializer(queryset, many=True, context={'request': request})
        return JsonResponse(serializer.data, safe=False)

    @handle_token_expired
    @action(detail=False, methods=['get'])
    def get_inviteds_events(self, request):
        events = Event.get_inviteds_events(request.user.id)
        serializer = EventSerializer(events, many=True, context={'request': request})
        return JsonResponse(serializer.data, safe=False)
    
    # @action(detail=False, methods=['get'])
    # @handle_token_expired
    # def get_current_or_accessible(self, request):
    #     # get all events that user can join or event he is currently in
    #     print(request)
    #     try :
    #         return self.get_current_event(request)
    #     except Exception as e:
    #         return self.get_accessible_events(request)
        
    @handle_token_expired
    @action(detail=False, methods=['get'])
    def get_accessible_events(self, request):
        # return Json response with all events that user can join and action to create a new event
        # {
        #     'inviteds' : events,
        #     'publics' : events,
        #     'create_new': 'url'
        # }
        try:
            print('tryiing ...')
            events = Event.get_accessible_events(request.user.id)
            print('after geting event ', events)
            serializer_inviteds = EventSerializer(events['inviteds'], many=True, context={'request': request})

            
            serializer_publics = EventSerializer(events['publics'], many=True, context={'request': request})
            return JsonResponse({
                'current': False,
                'inviteds': serializer_inviteds.data,
                'publics': serializer_publics.data,
            }, safe=False)
            
        except EventError as e:
            return JsonResponse(status=400, data={'Error': e.message})
        
        except Exception as e:
            print('zkrpo', e )
            return JsonResponse(status=500, data={'Error': 'Internal server error {}'.format(e)})
    
    @handle_token_expired
    def get_current_event(self, request):
        try:
            current = EventPlayer.current_event(request.user.id)
        except NotInAnEventError:
            return JsonResponse(status=204, data={'Error': 'No current event'})
        print('current:', current)
        if current is None:
            print('raising..')
            raise
        print('after raise')
        serializer = EventSerializer(current,  context={'request': request})
        return JsonResponse({
            'current': True,
            'waiting': not current.has_begin,
            'event': serializer.data
        })

    @handle_token_expired
    @action(detail=False, methods=['get'])
    def get_over_events(self, request):
        events = Event.get_over_events(request.user.id)
        serializer = self.get_serializer(events, many=True)
        
        return JsonResponse(serializer.data, safe=False)
    
    
    def catch_errors(self, e):
        if isinstance(e, EventError):
            return JsonResponse(status=400, data={'Error': e.message})
        elif isinstance(e, PermissionError):
            raise PermissionDenied()
        else:
            return JsonResponse(status=500, data={'Error': 'Internal server error'})
    
    @handle_token_expired
    def handle_event_action(self, pk, user_pk, action_func):
            event = Event.objects.get(pk=pk)
            action_func(event, user_pk)
            return HttpResponse(status=status.HTTP_204_NO_CONTENT)
        # try:
        # except Exception as e:
        #     return self.catch_errors(e)

    @handle_token_expired
    @action(detail=True)
    def join(self, request, pk):
        return self.handle_event_action(pk, request.user.id, lambda event, user_pk: event.add_player(user_pk))

    @handle_token_expired
    @action(detail=False)
    def unjoin(self, request):
        user_pk = request.user.id
        event = EventPlayer.current_event(user_pk)
        if not event:
            return JsonResponse(status=400, data={'Error': 'No current event'})
        
        return self.handle_event_action(event.id , user_pk, lambda event, user_pk: EventPlayer.quit_current_event(user_pk))

    @handle_token_expired
    @action(detail=False, methods=['get'], url_path=r'invite/(?P<user_pk>[-\w]+)')
    def invite(self, request, user_pk=None):
        try:
            if user_pk is None:
                user_pk = request.query_params.get('user_pk')
            if not user_pk:
                return JsonResponse(status=400, data={'Error': 'User ID is required'})
            try:
                event = EventPlayer.current_event(request.user.id)
            except NotInAnEventError:
                # create default event
                from games.models import Game
                event = Game.objects.create(name=f'{request.user.id} vs {user_pk}', description='wondefull game', owner=request.user.id)
                event.add_player(request.user.id)
                print('no current event to invite-> creating new game')
            
            if not event.invite_perm(request.user.id):
                raise PermissionDenied()
            return self.handle_event_action(event.pk, int(user_pk), lambda event, user_id: event.invite_player(user_id, request.user.id))
        except EventError as e:
            return JsonResponse(status=400, data={'Error': str(e)})
        
        
    @handle_token_expired
    @action(detail=True, methods=['get'])
    def uninvite(self, request, pk=None, user_pk=None):
        if user_pk is None:
            user_pk = request.query_params.get('user_pk')
        if user_pk is None:
            user_pk = request.user.id
            
        if not user_pk:
            return JsonResponse(status=400, data={'Error': 'User ID is required'})
        if not pk:
            return JsonResponse(status=400, data={'Error': 'Event ID is required'})
        
        event = Event.objects.get(pk=pk)
        if request.user.id != user_pk and not event.invite_perm(request.user.id):
            raise PermissionDenied('You are not allowed to uninvite player')
        return self.handle_event_action(pk, user_pk, lambda event, user_id: event.uninvite_player(user_id))
       
    @handle_token_expired
    @action(detail=True)
    def launch(self, request, pk):
        return self.handle_event_action(pk, request.user.id, lambda event, user_pk: event.launch(user_pk))
    
    @handle_token_expired
    @action(detail=False)
    def give_up(self, request):
        user_pk = request.user.id
        event = EventPlayer.current_event(user_pk)
        if not event:
            return JsonResponse(status=400, data={'Error': 'No current event'})
        return self.handle_event_action(event.id , user_pk, lambda event, user_pk: EventPlayer.quit_current_event(user_pk))
    
    @handle_token_expired
    def create(self, request, *args, **kwargs):
        return HttpResponseForbidden('Use child api to create event')

    
# class EventPlayerViewset(viewsets.ModelViewSet):    



@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy"})
