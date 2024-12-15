from django.contrib import admin
from django.urls import path, include
from shop.views import CategoryView
from shop.views import ArticleView
from shop.views import ProductView
from rest_framework import routers


#ici nous creons une instance de DefaultRouter
router = routers.DefaultRouter()

#Puis ajoutons les vues que nous voulons exposer
router.register('category', CategoryView, basename='category') 
router.register('product', ProductView, basename='product')
router.register('article', ArticleView, basename='article')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api-auth/', include('rest_framework.urls')),
	path('api/', include(router.urls)), #include le router dans les urls
]
