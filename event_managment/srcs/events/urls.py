from django.urls import path, include, re_path
from rest_framework.urlpatterns import format_suffix_patterns
from events import views
from rest_framework import routers

router = routers.DefaultRouter()
# router.register('event-players', views.EventPlayerViewset)
router.register('events', views.EventViewset)

urlpatterns = [
    path('', include(router.urls)),
    path('health/', views.health_check)
    # path('<int:pk>/', views.EventDetail.as_view()),
]
