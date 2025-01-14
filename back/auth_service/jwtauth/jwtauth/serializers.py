from rest_framework import serializers
from django.contrib.auth.models import User

class UserSerializer(serializers.ModelSerializer):
    is_42_user = serializers.SerializerMethodField()
    class Meta(object):
        model = User
        fields = ['id', 'username', 'password', 'email', 'is_42_user']
        extra_kwargs = {
            'password': {'write_only': True}, #Ne jamais retourner le mdp
        }
    def get_is_42_user(self, obj):
        # Vérifie si un utilisateur est connecté avec 42 (ajout via contexte ou vue)
        return self.context.get('is_42_user', False)
