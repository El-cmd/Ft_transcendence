from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.response import Response

from shop.models import Category
from shop.models import Product
from shop.models import Article
from shop.serializers import CategorySerializer
from shop.serializers import ProductSerializer
from shop.serializers import ArticleSerializer

class CategoryView(ReadOnlyModelViewSet):
 
    serializer_class = CategorySerializer
 
    def get_queryset(self):
        return Category.objects.filter(active=True)
	
class ProductView(ReadOnlyModelViewSet):
	serializer_class = ProductSerializer
	def get_queryset(self):
		#Nous récupérons les produits dans une variable nommée queryset
		queryset = Product.objects.filter(active=True)
		#Nous récupérons la valeur de la clé category_id dans la requête
		category_id = self.request.GET.get('category_id')
		#Si la valeur de la clé category_id n'est pas None
		if category_id is not None:
			queryset = queryset.filter(category=category_id)
		return queryset
	
class ArticleView(ReadOnlyModelViewSet):
	serializer_class = ArticleSerializer
	def get_queryset(self):
		#Nous récupérons les produits dans une variable nommée queryset
		queryset = Article.objects.filter(active=True)
		#Nous récupérons la valeur de la clé category_id dans la requête
		product_id = self.request.GET.get('product_id')
		#Si la valeur de la clé category_id n'est pas None
		if product_id is not None:
			queryset = queryset.filter(product=product_id)
		return queryset
