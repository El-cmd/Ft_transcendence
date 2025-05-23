# Generated by Django 4.2.17 on 2025-03-07 12:05

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Event',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(default='event!', max_length=30)),
                ('description', models.TextField(default='event description')),
                ('owner', models.PositiveIntegerField()),
                ('has_begin', models.BooleanField(default=False)),
                ('is_over', models.BooleanField(default=False)),
                ('is_public', models.BooleanField(default=False)),
                ('max_players', models.PositiveIntegerField(default=2)),
                ('end_date', models.DateTimeField(blank=True, null=True)),
            ],
        ),
        migrations.CreateModel(
            name='EventPlayer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.PositiveIntegerField()),
                ('userevent_name', models.CharField(default='username', max_length=30)),
                ('score', models.PositiveIntegerField(default=0)),
                ('rank', models.PositiveIntegerField(default=0)),
                ('gave_up', models.BooleanField(default=False)),
                ('role', models.PositiveIntegerField(default=0)),
                ('ready', models.BooleanField(default=False)),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='events.event')),
            ],
        ),
        migrations.CreateModel(
            name='EventInvite',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user', models.PositiveIntegerField()),
                ('event', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='invited_players', to='events.event')),
            ],
        ),
    ]
