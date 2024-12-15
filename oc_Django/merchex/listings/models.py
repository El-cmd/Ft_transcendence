from django.db import models
from django.core.validators import MaxValueValidator, MinValueValidator

# Create your models here
class Band(models.Model):
	def __str__(self):
		return f'{self.name}'
	class Genre(models.TextChoices):
		HIP_HOP = 'HH'
		SYNTH_POP = 'SP'
		ALTERNATIVE = 'AR'
		RAP = 'R'
		PUNK = 'P'
	name = models.fields.CharField(max_length=100)
	biography = models.fields.CharField(max_length=1000)
	year_creation = models.fields.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2024)])
	active = models.fields.BooleanField(default=True)
	official_webpage = models.fields.URLField(null=True, blank=True)
	genre = models.fields.CharField(choices=Genre.choices, max_length=5)
	#like_new = models.fields.BooleanField(default=False)

class Title(models.Model):
	name = models.fields.CharField(max_length=100)

class Listing(models.Model):
	title = models.fields.CharField(max_length=100)
	description = models.fields.CharField(max_length=1000)
	sold = models.fields.BooleanField(default=False)
	year = models.fields.IntegerField(validators=[MinValueValidator(1900), MaxValueValidator(2024)])
	band = models.ForeignKey(Band, null=True, on_delete=models.SET_NULL)

