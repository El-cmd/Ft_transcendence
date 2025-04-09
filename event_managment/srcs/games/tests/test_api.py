from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from ..models import Game, EventPlayer
from ..errors import *
from django.test import TestCase
from events.accounts_request import AuthorisedRequest

def test_smtg():
    assert 1 == 2
    
class GameTestCase(TestCase):
    def setUp(self):
        self.client = AuthorisedRequest.get_instance().login_for_tests('neutral0')
        self.client_id = 6
        self.opponnent = AuthorisedRequest.get_instance().login_for_tests('neutral1')
        self.opponnent_id = 7
        return super().setUp()
    
    def create_game(self):
        response = self.client.post(reverse('game-list'), {
            'name': 'game',
            'description': 'game description',
            'max_players': 2,
            'score_to_win': 7,
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.game = Game.objects.get(id = response.json()['id'])
    
    def test_create_game(self):
        self.create_game()
        response = self.client.get(reverse('game-detail', args=[self.game.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        response = self.client.get(reverse('game-list'))
        self.assertEqual(len(response.json()), 1)
        rsp_game = response.json()[0]
        self.assertEqual(rsp_game['max_players'], 2)
        self.assertEqual(rsp_game['score_to_win'], 7)
        self.assertEqual(rsp_game['owner']['username'], 'neutral0')
        self.assertEqual(rsp_game['description'], 'game description')
        
    def test_join_game(self):
        self.create_game()
        
        response = self.opponnent.get(reverse('event-join', args=[self.game.id]))
        self.assertContains(response, NotPublicNotInvitedError.message, status_code=status.HTTP_400_BAD_REQUEST)
        self.game.refresh_from_db()
        print(self.game.players, self.game.invited_players)
        response = self.client.get(reverse('event-invite', args=[self.game.id]), {'user_pk': self.opponnent_id})
        # print(response, response.json())
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        response = self.client.get(reverse('game-detail', args=[self.game.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['players']), 1)
        self.assertEqual(response.json()['inviteds'][0]['user']['username'], 'neutral1')
        
        response = self.opponnent.get(reverse('event-join', args=[self.game.id]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        
        response = self.client.get(reverse('game-detail', args=[self.game.id]))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.json()['players']), 2)
        self.assertEqual(response.json()['id'], self.game.id)
        
    def opponnent_join(self):
        self.client.get(reverse('event-invite', args=[self.game.id]), {'user_pk': self.opponnent_id})
        self.opponnent.get(reverse('event-join', args=[self.game.id]))

    def test_game_start(self):
        self.create_game()
        self.opponnent_join()
        response = self.client.get(reverse('game-detail', args=[self.game.id]))
        
        self.assertEqual(response.json()['players'][0]['user']['username'], 'neutral0')
        self.assertEqual(response.json()['players'][1]['user']['username'], 'neutral1')

        self.assertEqual(response.json()['has_begin'], True)
        
        for i in range(4):
            rsp = self.client.get(reverse('game-score-goal', args=[self.game.id]))
            self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
            rsp = self.opponnent.get(reverse('game-score-goal', args=[self.game.id]))
            self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
            
            self.game.refresh_from_db()
            print(self.game.players)
            rsp = self.client.get(reverse('game-detail', args=[self.game.id]))
            self.assertEqual(rsp.json()['players'][0]['score'], i+1)
            self.assertEqual(rsp.json()['players'][1]['score'], i+1)
        rsp = self.client.get(reverse('game-score-goal', args=[self.game.id]))
        self.assertEqual(rsp.status_code, status.HTTP_204_NO_CONTENT)
        rsp = self.client.get(reverse('game-detail', args=[self.game.id]))
        self.assertEqual(rsp.json()['players'][0]['score'], 5)
        self.assertEqual(rsp.json()['players'][1]['score'], 4)
        self.assertEqual(rsp.json()['is_over'], True)
        # self.assertEqual(rsp.json()['user_score'], 5)
        self.assertEqual(rsp.json()['players'][0]['rank'], 1)
        self.assertEqual(rsp.json()['players'][1]['rank'], 2)
        
        
        
        
        
        