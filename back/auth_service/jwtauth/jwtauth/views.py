from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404

from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import UserSerializer
from decouple import config

CLIENT_ID = config("CLIENT_ID")
CLIENT_SECRET = config("CLIENT_SECRET")
REDIRECT_URI = config("REDIRECT_URI")


###### Simple Token JWT ######
@api_view(['POST'])
def login(request):
    #Verification du mdp et du username
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

@api_view(['POST'])
def signup(request):
    #initialiser le nouvel user
    serializer = UserSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        user = User.objects.get(username=request.data['username'])
        user.set_password(request.data['password']) #hash le mdp
        user.save()
        #Generation des token JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
            "user": serializer.data
        })
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def test_token(request):
    return Response("Passed for {}".format(request.user.email))

############

###### JWT Token + Oauth2 42 Token ######

@api_view(['GET'])
def oauth2_login(request):
    # Redirige l'utilisateur vers l'authentification 42
    oauth_url = f"https://api.intra.42.fr/oauth/authorize?client_id={CLIENT_ID}&redirect_uri={REDIRECT_URI}&response_type=code"
    return Response(oauth_url)

@api_view(['GET'])
def oauth2_callback(request):
    import requests
    #recupere le code dauth envoye par 42
    code = request.GET.get('code')
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

    # Vérifie si l'utilisateur existe déjà ou crée-le
    user, created = User.objects.get_or_create(username=username, defaults={'email': email})

    # Génération du token JWT
    refresh = RefreshToken.for_user(user)

    # Passe "is_42_user=True" au contexte du serializer
    serializer = UserSerializer(user, context={'is_42_user': True})
    return Response({
        "refresh": str(refresh),
        "access": str(refresh.access_token),
        "user": serializer.data,
    })

############
