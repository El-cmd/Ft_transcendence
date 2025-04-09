import random
from accounts.models import User, Profile, RelationsUpdate, RelationsType
from django.core.management.base import BaseCommand, CommandError

USER_PER_RELATION = 5

class DbUserPopulator():
    def update_rel_todemo(self, lst, update, by_demo = True):
        for demo in self.demo_profiles:
            for user in lst:
                if by_demo:
                    demo.update_relations(user, update.value)
                else:
                    user.update_relations(demo, update.value)
        
    def create_profile_lst(self, base_name : str) -> list:
        """
        create and return a list of five user created (username = {basename}{indice}, password = pass)
        """
        return [User.objects.create_user(username=f'{base_name}{i}', password=f'{base_name}{i}').profile for i in range(USER_PER_RELATION)]
    
    def create_demo_profiles(self):
        self.demo_profiles = [
            User.objects.create_superuser(username='super', password='super').profile,
            User.objects.create_superuser(username='lol',password='lol' ).profile,
            User.objects.create_user(username='demo', password='demo').profile,
        ]
        
    def create_neutrals(self):
        self.neutrals = self.create_profile_lst('neutral')
        self.update_rel_todemo(self.neutrals, RelationsUpdate.BLOCK, False)
        self.update_rel_todemo(self.neutrals, RelationsUpdate.UNBLOCK, False)
        self.update_rel_todemo(self.neutrals, RelationsUpdate.BLOCK, )
        self.update_rel_todemo(self.neutrals, RelationsUpdate.UNBLOCK, )
        self.update_rel_todemo(self.neutrals, RelationsUpdate.CREATE_REQUEST, False)
        self.update_rel_todemo(self.neutrals, RelationsUpdate.DELETE_REQUEST, False)
        self.update_rel_todemo(self.neutrals, RelationsUpdate.CREATE_REQUEST, )
        self.update_rel_todemo(self.neutrals, RelationsUpdate.DELETE_REQUEST, )

    def create_requested_by(self):
        self.pending_request_from_demo = self.create_profile_lst('request_by_demo')
        self.update_rel_todemo(self.pending_request_from_demo, RelationsUpdate.CREATE_REQUEST)
        
    def create_requested_from(self):
        self.pending_request_from_other = self.create_profile_lst('request_to_demo')
        self.update_rel_todemo(self.pending_request_from_other, RelationsUpdate.CREATE_REQUEST, False)
    
    def create_friends(self, name='friend_with_demo'):
        self.friends = self.create_profile_lst(name)
        for lst in [self.friends]:
            self.update_rel_todemo(lst, RelationsUpdate.CREATE_REQUEST, False)
            self.update_rel_todemo(lst, RelationsUpdate.ACCEPT_FRIEND, )
        
    def create_bloqueds_by_demo(self):
        self.bloqueds_by_demo = self.create_profile_lst('bloked_by_demo')
        self.update_rel_todemo(self.bloqueds_by_demo, RelationsUpdate.BLOCK, )
        
    def create_block_demo_profiles(self):
        self.bloqueds_demo = self.create_profile_lst('bloked_demo')
        self.update_rel_todemo(self.bloqueds_demo, RelationsUpdate.BLOCK, False)

    def create_all(self):
        self.create_demo_profiles()
        self.create_neutrals()
        self.create_friends()
        self.create_block_demo_profiles()
        self.create_bloqueds_by_demo()
        self.create_requested_by()
        self.create_requested_from()
# from games.models import Game

# class DbGameHistoryPopulator():
#     def __init__(self, user_pop : DbUserPopulator):
#         self.users = [u.user for u in user_pop.demo_profiles]
#         pass
    
#     def create_game(self, winner : User, loser : User):
#         game = Game.objects.create(max_players=2, score_to_win=5, owner=winner, is_public=True)
#         game.add_player(winner.pk)
#         game.add_player(loser.pk)
#         game.launch(winner.pk)
#         for i in range(random.randint(0, 4)):
#             game.score_goal(loser.pk)
#         for i in range(5):
#             game.score_goal(winner.pk)
#         return game
    
#     def create_games(self):
#         # create oponnent 3 games win by demos, 2win by oponnent
#         self.games = []
#         opponent_user = User.objects.create_user(username='opponent3w2l', password='pass')
#         for user in self.users:
#             for i in range(3):
#                 self.games.append(self.create_game(user, opponent_user))
#             for i in range(2):
#                 self.games.append(self.create_game(opponent_user, user))
#         #create opoonent 1 game win by demo, 5 win by oponnent
#         opponent_user = User.objects.create_user(username='opponent1w5l', password='pass')
#         for user in self.users:
#             self.games.append(self.create_game(user, opponent_user))
#             for i in range(5):
#                 self.games.append(self.create_game(opponent_user, user))
#             self.games.append(self.create_game(user, opponent_user))
#         #creating 10 games between demo and super in order to make super be the first in the ranking and demo the last
#         super_user = User.objects.get(username='super')
#         demo_user = User.objects.get(username='demo')
#         for i in range(10):
#             self.games.append(self.create_game(super_user, demo_user))
            
            
# class DbAccessibleGamePopulator():
#     def __init__(self, user_pop : DbUserPopulator):
#         self.users = [u.user for u in user_pop.demo_profiles]
        
        
#     def create_all(self):
#         self.opponents = [User.objects.create_user(username=f'inviter{i}', password='pass') for i in range(3)]
#         self.games = []
#         for opponent in self.opponents:
#             game = Game.objects.create(max_players=2, score_to_win=5, owner=opponent, is_public=False)
#             game.add_player(opponent.pk)
#             self.games.append(game)
#             for user in self.users:
#                 game.invite_player(user.pk)
#             pub_game = Game.objects.create(max_players=2, score_to_win=5, owner=opponent, is_public=True)
                
    
    
        
class Command(BaseCommand):
    
    def handle(self, *args, **options):
        User.objects.create_superuser(username='event_backend', password='event_backend')
        User.objects.create_superuser(username='chat_backend', password='chat_backend')
        user_pop = DbUserPopulator()
        user_pop.create_all()
        # game_pop = DbGameHistoryPopulator(user_pop)
        # game_pop.create_games()
        # new_game_pop = DbAccessibleGamePopulator(user_pop)
        # new_game_pop.create_all()

            
                
                
                
                