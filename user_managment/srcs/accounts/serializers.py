from rest_framework import serializers
from .models import Profile, RelationsType, RelationsUpdate
from rest_framework.fields import CurrentUserDefault
from django.contrib.auth.models import User
from django.urls import reverse
from django.db import IntegrityError

from django.core.cache import cache
from PIL import Image


class UserShortSerializer(serializers.ModelSerializer):
    avatar = serializers.SerializerMethodField()
    relation = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'avatar', 'relation', 'online_status']
        
    def get_avatar(self, obj):
        
        profile = Profile.get_profile(obj)
        if profile.avatar:
            return profile.avatar.url
        # Si pas d'avatar local mais une URL externe (42 API)
        elif profile.profile_picture_url:
            return profile.profile_picture_url
        return None
    
    def get_relation(self, obj):
        pass

    def get_online_status(self, obj):
        pass
    

class UserRegisterSerializer(serializers.ModelSerializer):
    repeated_password = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'repeated_password']
        extra_kwargs = {
            'password': {'style': {'input_type': 'password'}, 'write_only': True},
            'username': {'validators': []},  # Supprimer les validateurs par défaut pour personnaliser le message
            'email': {'required': True}
        }

    def is_valid(self, *, raise_exception=False):
        print('in is_valid',self.initial_data)
        print(super().is_valid(raise_exception=False))
        return super().is_valid(raise_exception=raise_exception)
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Un utilisateur avec ce nom existe déjà.")
        return value
    
    def save(self, **kwargs):
        if self.validated_data['password'] != self.validated_data['repeated_password']:
            raise serializers.ValidationError({"password": ["Les mots de passe ne correspondent pas."]})
        
        user = User.objects.create_user(
            username=self.validated_data['username'],
            email=self.validated_data.get('email', ''),
            password=self.validated_data['password']
        )
        return user

class RelationActionMaker():
    """
    Tool class to get accesible action between request user and some other user
    get_actions returns a dict : {'action_name' : 'action_url'}
    """
    relation_update_url = 'profile-update-relation'
    
    def __init__(self, request : str, other : Profile):
        self.profile : Profile = Profile.from_request(request)
        self.other = other
        self.actions = dict()
        self.create_actions()
        
    def get_action_url(self, relation_type : RelationsUpdate):
        kwargs = {
            'relation_type' : relation_type.value,
            'pk' : self.other.user.pk
        }
        
        return reverse(self.relation_update_url, kwargs=kwargs)
    
    def create_actions(self) -> dict :
        if self.profile.user == self.other.user:
            return
        for updates in self.profile.get_relation_to(self.other.user).get_accessible_updates() :
            self.actions[updates.get_update_name()] = self.get_action_url(updates)
       
class UserUpdateCredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username']

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    relation = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()
    online_status = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    # user = UserShortSerializer()

    def get_avatar_url(self, obj):
        # Renvoie l'URL de l'avatar (locale ou 42)
        if obj.avatar:
            return obj.avatar.url
        elif obj.profile_picture_url:
            return obj.profile_picture_url
        return None

    class Meta:
        model = Profile
        fields = ['id', 'username', 'elo', 'avatar', 'avatar_url', 'bio', 'relation', 'actions', 'online_status', 'profile_picture_url', 'is_42_user']
        extra_kwargs = {
            'elo': {'read_only': True}
        }
    
    def get_relation(self, obj):
        return Profile.get_profile(Profile.from_request(self.context['request'])).get_relation_to(obj.user).name
    
    def get_actions(self, obj):
        return RelationActionMaker(self.context['request'], obj).actions
    
    def to_representation(self, instance):
        """
        Modifie la représentation de l'instance pour renvoyer un avatar par défaut si aucun avatar n'est défini,
        et corriger les URLs incorrectes.
        """
        representation = super().to_representation(instance)
        
        # Définir un chemin d'avatar par défaut
        default_avatar = '/media/avatars/default-avatar.jpg'
        
        # Si pas d'avatar, utiliser l'image par défaut
        if not representation.get('avatar'):
            representation['avatar'] = default_avatar
        
        # S'assurer que avatar_url a également une valeur par défaut
        if not representation.get('avatar_url'):
            representation['avatar_url'] = default_avatar
        
        # Corriger l'URL incorrecte (sans le port 8000)
        elif 'http://localhost/media/' in representation['avatar']:
            representation['avatar'] = representation['avatar'].replace(
                'http://localhost/media/',
                'http://localhost:8000/media/'
            )
        
        # Appliquer la même correction à avatar_url si nécessaire
        if representation.get('avatar_url') and 'http://localhost/media/' in representation['avatar_url']:
            representation['avatar_url'] = representation['avatar_url'].replace(
                'http://localhost/media/',
                'http://localhost:8000/media/'
            )
        
        # Pour debugging
        print(f"Avatar URL: {representation.get('avatar_url')}")
        print(f"Avatar: {representation.get('avatar')}")
        
        return representation

    def get_username(self, obj):
        return obj.user.username
    
    # soit pioche direct dans le cache, soit passe par AuthorisedRequest et fetch au chat API endpoint user_status
    def get_online_status(self, obj : Profile):
        key = f'user:{obj.user.id}:connectedCount'
        last_seen_key = f"user:{obj.user.id}:last_seen"
        if cache.get(key, 0) > 0:
            return {"status": "online"}
        else:
            last_seen = cache.get(last_seen_key, "Unknown")
            return {"status": "offline", "last_seen": last_seen}
    
    

class UserSerializer(serializers.ModelSerializer):
    is_42_user = serializers.SerializerMethodField()
    profile_picture = serializers.SerializerMethodField()
    class Meta(object):
        model = User
        fields = ['id', 'username', 'password', 'email', 'is_42_user', 'profile_picture']
        extra_kwargs = {
            'password': {'write_only': True}, #Ne jamais retourner le mdp
        }
    def get_is_42_user(self, obj):
        # Vérifie si un utilisateur est connecté avec 42 (ajout via contexte ou vue)
        return self.context.get('is_42_user', False)
    
    def get_profile_picture(self, obj):
        # Retourne l'URL de la photo de profil depuis le contexte
        return self.context.get('profile_picture', None)

    def update_profile(self, instance, validated_data):
        from accounts.models import Profile
        profile = Profile.objects.get(user=instance)
        
        # L'URL de l'avatar est stocku00e9e directement dans le modèle Profile
        # sans essayer de tu00e9lu00e9charger l'image
        # Ce sera l'URL externe de l'API 42
        profile.profile_picture_url = self.context.get('profile_picture', None)
        profile.is_42_user = self.context.get('is_42_user', False)
        profile.save()
        
        return profile

    def create(self, validated_data):
        # Crée un utilisateur avec un mot de passe hashé
        super().create(validated_data)
        user = User.objects.create_user(**validated_data)
        self.update_profile(user, validated_data)
        return user
    
    def update(self, instance, validated_data):
        instance  = super().update(instance, validated_data)
        self.update_profile(instance, validated_data)
        return instance