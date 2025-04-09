from django.urls import path, include

from . import views 

urlpatterns = [
    path("", views.PreviewsView.as_view(), name="chat_index"),
    path("<int:pk>", views.DetailsView.as_view(), name="chat_details"),
    path('health/', views.health_check),
    path('friends_status/', views.get_friends_status, name='friends_status'),
    path('user_status/<int:pk>/', views.get_user_status, name='user_status')
]