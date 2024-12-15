from django.contrib import admin

from listings.models import Band, Listing

class BandAdmin(admin.ModelAdmin):
	list_display = ('name', 'year_creation', 'genre')

class ListingAdmin(admin.ModelAdmin):
	list_display = ('title', 'band', 'year')  # ajouter ‘band' ici

admin.site.register(Band, BandAdmin	)
admin.site.register(Listing, ListingAdmin)

# Register your models here.
