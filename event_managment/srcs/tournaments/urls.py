from rest_framework import routers
from tournaments import views
from django.urls import path, include

router = routers.DefaultRouter()
router.register('tournaments', views.TournamentViewset, basename='tournament')
urlpatterns = [
    path('', include(router.urls)),
]