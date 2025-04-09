from django.shortcuts import render
from rest_framework import viewsets
from .models import Tournament
from events.serializers import EventSerializer
from rest_framework import status
from rest_framework.response import Response
from events.errors import EventError
from events.views import handle_token_expired
from events.signals import new_public_signal
from .serializers import TournamentSerializer
# Create your views here.
class TournamentViewset(viewsets.ModelViewSet):
    queryset = Tournament.objects.all()
    serializer_class = TournamentSerializer
    
    @handle_token_expired
    def create(self, request, *args, **kwargs):
        print('hello')
        try:
            data = request.data
            # print(data)
            request.data['owner'] = request.user.id
            rsp = super().create(request, *args, **kwargs)
        except Exception as e:
            print(e)
            return Response(status=status.HTTP_400_BAD_REQUEST)
        if self.is_public:
            new_public_signal.send(sender=Tournament, event=self)
        return rsp
        # try:
        #     data = request.data
        #     print(data)
        #     data['owner'] = request.user.id
            
        #     return Response(status=status.HTTP_201_CREATED)
        # except EventError as e:
        #     print(e)
        #     return Response(status=status.HTTP_400_BAD_REQUEST)
        # return super().create(request, *args, **kwargs)
    # => create need default name, description, visibility, max_players, score_to_win