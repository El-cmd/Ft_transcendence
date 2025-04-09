# from django.test import TestCase
# from django.urls import reverse
# from rest_framework.test import APIClient
# from .models import Game, EventPlayer
# from rest_framework import status
# from events.models import  User
# from .errors import *

def test_smtg():
    assert 1 == 2
    
# # Create your tests here.
# class GameTestCase(TestCase):
#     def setUp(self):
#         for i in range(2):
#             User.objects.create_user(username=f'user{i}', password='password')
#         self.client = APIClient()
#         self.user0 = User.objects.get(username='user0')
#         self.user1 = User.objects.get(username='user1')
#         self.client.force_login(self.user0)
        
#         self.game = Game.objects.create(max_players=2, owner=self.user0)
#         self.game.players.add(User.objects.get(username='user0'))
#         self.game.players.add(User.objects.get(username='user1'))
#         self.game.launch(self.user0.pk)
#         self.game.save()
        
#     def assert_user_score(self, score0, score1):
#         assert(EventPlayer.objects.get(event=self.game, user=self.user0).score == score0)
#         assert(EventPlayer.objects.get(event=self.game, user=self.user1).score == score1)
    
#     def check_rank(self, rank0, rank1):
#         assert(EventPlayer.objects.get(event=self.game, user=self.user0).rank == rank0)
#         assert(EventPlayer.objects.get(event=self.game, user=self.user1).rank == rank1)
    
#     def test_score_goal(self):
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': self.user0.pk})
#         self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
#         self.assert_user_score(1, 0)
#         self.check_rank(0, 1)
        
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': self.user1.pk})
#         self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
#         self.assert_user_score(1, 1)
#         self.check_rank(0, 0)
        
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': self.user1.pk})
#         self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
#         self.assert_user_score(1, 2)
#         self.check_rank(1, 0)
    
#     def test_score_goal_not_in_game(self):
#         not_in_game_user = User.objects.create_user(username='not_in', password='password')
#         self.client.force_login(not_in_game_user)
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': not_in_game_user.pk})
#         self.assertContains(rsp, NotInGameError().message, status_code=status.HTTP_400_BAD_REQUEST)
        
#     def test_not_launched_game(self):
#         self.game.has_begin =False
#         self.game.save()
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': self.user0.pk})
#         self.assertContains(rsp, NoGoalError().message, status_code=status.HTTP_400_BAD_REQUEST)

#     def test_game_over(self):
#         self.game.is_over = True
#         self.game.save()
#         rsp = self.client.post(reverse('game-score-goal', kwargs={'pk': self.game.pk}), data={'user_pk': self.user0.pk})
#         self.assertContains(rsp, NoGoalError().message, status_code=status.HTTP_400_BAD_REQUEST)