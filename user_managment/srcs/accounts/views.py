from django.db import IntegrityError
from .models import Profile, RelationError, UnknownRelationError
from .serializers import  UserRegisterSerializer,  ProfileSerializer, UserSerializer, UserShortSerializer #,ProfileUpdateSerializer,
from django.shortcuts import render, redirect
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import viewsets, generics, status
from rest_framework.response import Response
from rest_framework.exceptions import APIException
from rest_framework.decorators import api_view, renderer_classes, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from django.http import Http404
from django.http import HttpResponseForbidden
from .permissions import ProfilePermisson
from django.http import JsonResponse


from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.authentication import JWTStatelessUserAuthentication
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from decouple import config
from rest_framework.parsers import JSONParser
from rest_framework.parsers import MultiPartParser, FormParser

CLIENT_ID = config("CLIENT_ID")
CLIENT_SECRET = config("CLIENT_SECRET")
REDIRECT_URI = config("REDIRECT_URI")
# CreateAPIView : Used for create-only endpoints.

class UserRegistrationView(generics.CreateAPIView):
    serializer_class = UserRegisterSerializer
    
    
class ProfileViewSet(viewsets.ModelViewSet):
    queryset = Profile.objects.order_by('-elo').all()
    serializer_class = ProfileSerializer
    authentication_classes = [JWTStatelessUserAuthentication]
    permission_classes = [IsAuthenticated, ProfilePermisson]
    parser_classes = (MultiPartParser, FormParser, JSONParser)


    def update(self, request, *args, **kwargs):
        profile = self.get_object()  # Récupérer l'instance actuelle du profil
        avatar_provided = 'avatar' in request.FILES  # Vérifier si un nouvel avatar a été envoyé

        # Construire le serializer avec les données mises à jour
        serializer = self.get_serializer(profile, data=request.data, partial=True)

        if serializer.is_valid():
            if not avatar_provided:
                # Si aucun nouvel avatar n'est fourni, conserver l'ancien
                serializer.validated_data['avatar'] = profile.avatar

            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


    @action(detail=False, methods=['post'])
    def update_ranks(self, request):
        data = request.data
        print('data : ', data)
        for user_id, rank in data.items():
            profile = Profile.objects.get(user__id=user_id)
            profile.elo += rank
            profile.save()
            
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['get'], url_path=r'other_pov/(?P<other_pk>[-\w]+)')
    def get_other_pov(self, request, pk, other_pk=None): # ou enleve pk, et utilise request.user.id 
        try:
            profile = Profile.objects.get(pk=pk)
            other_profile = Profile.objects.get(pk=other_pk)
            relation = other_profile.get_relation_to(profile.user)
        except ObjectDoesNotExist:
            raise Http404
        return Response({'relation': relation.value})

    @action(detail=False, methods=['get'], url_path=r'search_users')
    def search_users(self, request):
        """
        Search for users based on a query parameter.
        Returns a list of users whose username contains the search query (case-insensitive).
        """
        query = request.query_params.get('query', '')
        if not query:
            return Response({'error': 'Query parameter is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Search for users whose username containe the query (case insensitive), exclude requesting user
        users = User.objects.filter(username__icontains=query)
        users = users.exclude(id=request.user.id)

        # todo : Exclude users that we blocked as well ? 

        # Get profiles for these users
        profiles = Profile.objects.filter(user__in=users)
        return Response(self.get_serializer(profiles, many=True).data)

    @action(detail=True, methods=['get'], url_path=r'relation_to/(?P<other_pk>[-\w]+)') # tocheck
    def relation_between(self, request, pk, other_pk):
        profile = Profile.from_request(request)
        print('--------- authentified user in ProfileViewSet.relation_between : ', profile.user.username)
        try:
            profile: Profile = Profile.objects.get(pk=pk)
            other_profile: Profile = Profile.objects.get(pk=other_pk)
            relation = profile.get_relation_to(other_profile.user)
        except ObjectDoesNotExist:
            raise Http404
        return Response({'relation': relation.name})
        # return JsonResponse({'relation': relation.name}, safe=False)
    

    @action(detail=True, methods=['get'])
    def user_short(self, request, pk=None):
        profile = get_object_or_404(Profile, pk=pk)
        serializer = UserShortSerializer(profile.user)
        try:
            rsp = JsonResponse(data=serializer.data, safe=False)
        except Exception as e:
            print('Error', e)
        return rsp
    
    
    @action(detail=False)
    def get_profile(self, request):
        try:
            for i in range(5, 10):
                user= User.objects.get(id=i)
            profile = Profile.from_request(request)
            
        except ObjectDoesNotExist:
            raise Http404
        return Response(self.get_serializer(profile).data)
    
    
    @action(detail=False, url_path=r'relation/(?P<relation_type>[-\w]+)')
    def get_relation(self, request, relation_type):
        try:
            profile: Profile = Profile.from_request(request)
            print(f'In user_managment get_relation, User making the request : {request.user.id} : {request.user.username}')
            qs = profile.get_relation_profile_qs(relation_type)
        except RelationError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST, data={'Error': e.message})
        # serialized_data = self.get_serializer(qs, many=True).data
        serialized_data = self.get_serializer(qs, many=True).data
        return JsonResponse(serialized_data, safe=False)

    @action(detail=False, url_path=r'update_relation/(?P<relation_type>[-\w]+)/(?P<pk>[-\w]+)')
    def update_relation(self, request, relation_type, pk):
        try:
            Profile.from_request(request).update_relations(int(pk), relation_type)
        except RelationError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST, data={'Error': e.message})
        except ObjectDoesNotExist:
            raise Http404
        return Response(status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        return HttpResponseForbidden("you can't create a profile directly")


###### Simple Token JWT ######
@api_view
def my_new_function(self, request):
        pass

@api_view(['POST'])
def login(request):
    
    if not User.objects.filter(username=request.data['username']).exists():
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    user = get_object_or_404(User, username=request.data['username'])
    if not user.check_password(request.data['password']):
        return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)
    #Generation des tokens jwt
    refresh = RefreshToken.for_user(user)
    serializer = UserSerializer(instance=user)
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": serializer.data
    })


"""
    Checker si le user est pas deja dans la db (ie username deja utilise ? et autres infos qui doivent etre uniques)

    Creer user dans la db -> Profile.objects.create(<infos necessaires pr creation>)

    retourner reponse avec infos pour le front (de quelles infos a besoin dans le front a part ok ou erreur ?)
    """
@api_view(['POST'])
def signup(request):
    # data = JSONParser().parse(request)
    print('------------------------- in signup view')
    data = request.data
    print("Donnees recues :", data)
    serializer = UserRegisterSerializer(data=data)
    if serializer.is_valid():
        print("Donnee validees :",serializer.data)
        try:
            serializer.save()
            user = User.objects.get(username=request.data['username'])
            refresh = RefreshToken.for_user(user)
            return Response({
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": UserSerializer(user).data
            })
        except IntegrityError:
            print("⚠ ERREUR : Le username existe déjà !")
            return Response(
                {"username": ["Un utilisateur avec ce nom existe déjà."]},
                status=status.HTTP_400_BAD_REQUEST
            )
    else:
        print("❌ Erreur de validation :", serializer.errors)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response(f"Passed for {request.user}")

############


@api_view(['GET'])
def health_check(request):
    return Response({"status": "healthy"})


###### JWT Token + Oauth2 42 Token ######

@api_view(['GET'])
def oauth2_login(request):
    # Redirige l'utilisateur vers l'authentification 42
    # get redirect uri from request data 
    redirect_uri = request.GET.get('redirect_uri', REDIRECT_URI)
    
    oauth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={redirect_uri}&response_type=code"
    return redirect(oauth_url)

@api_view(['POST'])
def oauth2_callback(request):
    import requests
    #recupere le code dauth envoye par 42
    code = request.data.get('code')
    if not code:
        return Response({"error": "Missing code"}, status=400)
    
    #echange le code obtenu par un access token

    token_response = requests.post(
        'https://api.intra.42.fr/oauth/token',
        data={
            'grant_type': 'authorization_code',
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'code': code,
            'redirect_uri': REDIRECT_URI,
        }
    )
    if token_response.status_code != 200:
        return Response({"error": "Failed to fetch access token"}, status=400)
    
    token_data = token_response.json()
    access_token = token_data.get('access_token')

    # Récupère les informations utilisateur depuis l'API de 42
    user_info_response = requests.get(
        'https://api.intra.42.fr/v2/me',
        headers={'Authorization': f'Bearer {access_token}'}
    )

    if user_info_response.status_code != 200:
        return Response({"error": "Failed to fetch user info"}, status=400)

    user_info = user_info_response.json()
    username = user_info.get('login')
    email = user_info.get('email')
    profile_picture = user_info.get('image', {}).get('link')


    # Vérifie si l'utilisateur existe déjà ou crée-le
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})

    # Génération du token JWT
    refresh = RefreshToken.for_user(user)

    # Passe "is_42_user=True" au contexte du serializer
    # Passer l'URL de la photo de profil 42 dans le contexte du serializer
    serializer = UserSerializer(user, context={'is_42_user': True, 'profile_picture': profile_picture}, data=request.data, partial=True)
    if serializer.is_valid():
        user = serializer.save()
        
        # Mettre u00e0 jour directement le profile_picture_url
        from accounts.models import Profile
        profile = Profile.objects.get(user=user)
        if profile_picture and not profile.profile_picture_url:
            profile.profile_picture_url = profile_picture
            profile.save()
            print(f"Profile picture URL updated to: {profile_picture}")

    else:
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": serializer.data,
    })

############
