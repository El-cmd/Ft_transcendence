from rest_framework import serializers
from django.contrib.auth.models import User

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
        # from profile.models import Profile
        # profile = user.profile
        # profile.avatar  = self.context.get('profile_picture', None)
        # profile.is_42_user = self.context.get('is_42_user', False)
        # profile.save()
        pass

    def create(self, validated_data):
        # Crée un utilisateur avec un mot de passe hashé
        super().create(validated_data)
        user = User.objects.create_user(**validated_data)
        self.update_profile(user, validated_data)
        return user
    
    def update(self, instance, validated_data):
        super().update(instance, validated_data)
        self.update_profile(instance, validated_data)

