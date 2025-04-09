from django.urls import path, re_path, include
from rest_framework.urlpatterns import format_suffix_patterns
from games import views
from rest_framework import routers

router = routers.DefaultRouter()
router.register('games', views.GameViewSet)
urlpatterns = [
    path('', include(router.urls)),
]

