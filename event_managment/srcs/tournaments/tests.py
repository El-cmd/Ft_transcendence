# from django.test import TestCase

# from events.models import EventPlayer
# from .models import Tournament, TournamentGame, User
# Create your tests here.


# class TournamentModelTest(TestCase):
#     def setUp(self):
#         self.owner = User.objects.create(username='owner')
    
            
#     def test_tournament_initial_round_settings(self):
        
#         #very small tournament
#         tournament = Tournament.objects.create(owner=self.owner, max_players=4)
#         self.assertEqual(tournament.current_round, 1)
        
#         tournament = Tournament.objects.create(owner=self.owner)

#         #default creation
#         self.assertEqual(tournament.max_players, 8)
#         self.assertEqual(tournament.current_round, 2)
#         self.assertEqual(tournament.owner, self.owner)
        
#         #medium tournament
#         tournament = Tournament.objects.create(owner=self.owner, max_players=16)
#         self.assertEqual(tournament.current_round, 3)
        
#         #big tournament
#         tournament = Tournament.objects.create(owner=self.owner, max_players=32)
#         self.assertEqual(tournament.current_round, 4)
        
#     def create_and_fill_tournament(self, size = 8):
#         tournament = Tournament.objects.create(owner=self.owner, is_public=True, max_players=size)
#         for i in range(tournament.max_players):
#             user, created = User.objects.get_or_create(username=f'user{i}')
#             tournament.add_player(user.pk)
#         tournament.save()
#         return tournament
    
        
#     def first_player_goal(self, tournament : Tournament):
#         for game in tournament.games.all():
#             if TournamentGame.objects.get(game=game).round == tournament.current_round:
#                 game.launch(self.owner.pk)
#                 while not game.is_over:
#                     game.score_goal(game.players.first().pk)
#                     game.refresh_from_db()
#                 self.assertEqual(game.is_over, True)
    
#     def give_up_all_current_games(self, tournament : Tournament):
#         for game in tournament.games.all():
#             if TournamentGame.objects.get(game=game).round == tournament.current_round:
#                 game.launch(self.owner.pk)
#                 game.give_up(game.players.last().pk)
        
    
#     def test_tournament_complete_execution_give_up(self):
#         tournament = self.create_and_fill_tournament()
        
#         #first round
#         tournament.launch(self.owner.pk)

#         exp_score = [(1 - i % 2) for i in range(8)]
#         self.check_round(tournament, 4, 1, 4, exp_score, lambda t : self.give_up_all_current_games(t))
        
#         #second round
#         exp_score = [exp_score[i] + (1 if i%4 == 0 else 0)  for i in range(8)]
#         self.check_round(tournament, 6, 0, 2, exp_score, self.give_up_all_current_games)
        
#         #last round
#         exp_score = [exp_score[i] + (1 if i%8 == 0 else 0)  for i in range(8)]
#         self.check_round(tournament, 7, 0, 1, exp_score, self.give_up_all_current_games)
#         self.assertEqual(tournament.is_over, True)
    
        
#     def test_big_tournament_complete_execution_goal(self):
#         tournament = self.create_and_fill_tournament(32)
#         tournament.launch(self.owner.pk)
        
#         #first round
#         exp_score = [(1 - i % 2) for i in range(32)]
#         self.check_round(tournament, 16, 3, 16, exp_score, self.first_player_goal)
        
#         #second round
#         exp_score = [exp_score[i] + (1 if i%4 == 0 else 0)  for i in range(32)]
#         self.check_round(tournament, 24, 2, 8, exp_score, self.first_player_goal)
        
#         #third round
#         exp_score = [exp_score[i] + (1 if i%8 == 0 else 0)  for i in range(32)]
#         self.check_round(tournament, 28, 1, 4, exp_score, self.first_player_goal)
        
#         #fourth round
#         exp_score = [exp_score[i] + (1 if i%16 == 0 else 0)  for i in range(32)]
#         self.check_round(tournament, 30, 0, 2, exp_score, self.first_player_goal)
        
#         #last round
#         exp_score = [exp_score[i] + (1 if i%32 == 0 else 0)  for i in range(32)]
#         self.check_round(tournament, 31, 0, 1, exp_score, self.first_player_goal)
#         self.assertEqual(tournament.is_over, True)
        

#     def check_round(self, tournament : Tournament, exp_game_count: int, exp_round: int, exp_qualified_count: int, exp_score: list, skip_foo ):
#         self.assertEqual(tournament.games.count(), exp_game_count)
#         if not tournament.current_round == 0:
#             self.assertEqual(tournament.current_round, exp_round + 1)
#         skip_foo(tournament)
#         tournament.refresh_from_db()
#         self.assertEqual(tournament.current_round, exp_round)
#         self.assertEqual(tournament.qualified_players.count(), exp_qualified_count)
#         for i, player in enumerate(tournament.event_players.all()):
#             self.assertEqual(player.score, exp_score[i])
        
        
