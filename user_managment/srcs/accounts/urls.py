from django.urls import path, include, re_path
# from django.conf.urls import url
from . import views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.routers import DefaultRouter
from django.conf import settings
from django.conf.urls.static import static
router = DefaultRouter()
router.register('profiles', views.ProfileViewSet, basename='profile')
# router.register('register')
urlpatterns = [
    # path('api-auth/', include('rest_framework.urls')),
    # path('api-auth/register/', views.UserRegistrationView.as_view(), name='register'),
    re_path(r'', include(router.urls)),
    path('health/', views.health_check),
    path('login/', views.login),
    path('register/', views.signup),
    path('test_token/', views.test_token),
    path('token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('oauth2/login/', views.oauth2_login, name='oauth2_login'),
    path('oauth2/callback/', views.oauth2_callback, name='oauth2_callback'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
