from django.shortcuts import render
from django.http import HttpResponse
from listings.models import Band
from listings.models import Title
from django.shortcuts import render

# Create your views here.

def band_list(request):
    bands = Band.objects.all()
    return render(request, 'listings/band_list.html', context={'bands': bands})

def about(request):
    return HttpResponse('<h1>About us</h1> <p>Nous adorons le shit</p>')

def listings(request):
    titles = Title.objects.all()
    return render(request, 'listings/listings.html', context={'titles': titles})


def contact(request):
    return HttpResponse('<h1>Contact us</h1> <p>email:</p>')

def band_detail(request, id):
    band = Band.objects.get(id=id)
    return render(request, 'listings/band_detail.html', {'id': id})

