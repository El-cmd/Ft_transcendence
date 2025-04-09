from django.http import JsonResponse, Http404
from django.shortcuts import render
from .models import Game
from rest_framework import generics, viewsets, permissions, status
from .serializers import GameSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from .errors import *
from events.views import handle_token_expired
from events.signals import new_public_signal
    
class GameViewSet(viewsets.ModelViewSet):
    queryset = Game.objects.all()
    serializer_class = GameSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def create(self, request, *args, **kwargs):
        print('hey', request.data)
        print(request.data)
        sup = super().create(request, *args, **kwargs)
        new_public_signal.send(sender=Game, event=sup.data)
        return sup
    
    @handle_token_expired
    def create_game(self, request, max_players=None):
        try:
            game = Game.objects.create(max_players=max_players if max_players is not None else 2, owner=request.user.id, is_public=True)
            game.add_player(request.user.id)
            print('created game', game)
            new_public_signal.send(sender=Game, event=game)
            return JsonResponse(self.get_serializer(game).data)
        except EventError as e:
            return JsonResponse(status=status.HTTP_400_BAD_REQUEST, data={'Error': str(e)},)
        except Exception as e:
            print(e)
            return JsonResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={'Error': 'Internal server error'})

    @handle_token_expired
    @action(detail=False, methods=['get'])
    def create_default_game2(self, request):
        return self.create_game(request)

    @handle_token_expired
    @action(detail=False, methods=['get'])
    def create_default_game4(self, request):
        return self.create_game(request, max_players=4)

    # @handle_token_expired
    # @action(detail=True, methods=['get'])
    # def score_goal(self, request, pk=None):
    #     try:
    #         user_pk = request.user.id
    #         game : Game = Game.objects.get(pk=pk)
    #         game.score_goal(user_pk)
    #         return Response(status=status.HTTP_204_NO_CONTENT)
    #     except EventError as e:
    #         return JsonResponse(status=status.HTTP_400_BAD_REQUEST, data={'Error': str(e)},)
    #     except Exception as e:
    #         print(e)
    #         return JsonResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={'Error': 'Internal server error'})
        
        
    @handle_token_expired
    @action(detail=False)
    def join_any_public(self, request):
        print('called')
        try:
            pub : Game = Game.objects.filter(id__in=[game.id for game in Game.get_accessible_events(request.user.id)['publics']]).first()
        except YouCanNotSubscribeToMoreThanOneWaitingEventError as e:
            return JsonResponse(status=status.HTTP_400_BAD_REQUEST, data={'Error': str(e)},)
        if pub:
            # join pub then return
            
            try:
                print(pub, pub.players.all(), pub.has_begin, pub.is_over)
                pub.add_player( request.user.id)
                print('succesfully joined', pub.players.all(), pub.has_begin)
                return Response(status=status.HTTP_204_NO_CONTENT)
            except EventError as e:
                print(e)
                # if failed is probably because concurrency issue
                return self.join_any_public(request)
            except Exception as e:
                print(e)
                return JsonResponse(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={'Error': 'Internal server error'})
        else:
            return self.create_game(request)

    