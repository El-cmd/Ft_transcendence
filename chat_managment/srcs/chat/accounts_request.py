import requests
from requests.exceptions import ConnectionError
from rest_framework import status
from .errors import TokenExpiredException
from .utils_consumers import *

ACCOUNT_URL = 'http://api_gateway:80/api/accounts/'

class AuthorisedRequest(): 
    instance = None
    
    def __init__(self, token):
        self.user_token = token
        if AuthorisedRequest.instance:
            raise Exception('AuthorisedRequest already instantiated')
        
    @staticmethod
    def get_instance(token): # faire autrement, va pas passer le token a chaquel appel a AuthorisedRequest, si ?
        if not AuthorisedRequest.instance:
            AuthorisedRequest.instance = AuthorisedRequest(token)
        else :
            AuthorisedRequest.instance.user_token = token
        if not 'Bearer' in AuthorisedRequest.instance.user_token :
            AuthorisedRequest.instance.user_token = f'Bearer {AuthorisedRequest.instance.user_token}'
        return AuthorisedRequest.instance

    def login_for_tests(self, username):
        response = requests.post('http://api_gateway:80/api/accounts/login/', json={
            'username': username, 
            'password': username
        })
        from rest_framework.test import APIClient
        c = APIClient()
        c.credentials(HTTP_AUTHORIZATION=f'Bearer {response.json()["access"]}')
        return c
        
    
    def user_headers(self):
        if not self.user_token:
            raise Exception('Unable to get requesting user\'s access token')
        return {
            'Authorization': f'{self.user_token}'
        }
    
    def do_request_as_auth_user(self, lamdba_request, url, headers={}):
        headers.update(self.user_headers())
        response = lamdba_request(url, headers=headers)
        return response # if response.status_code == 401, the calling view will also return 401, and the front end will refresh the token and make the request again

        
    def get_user(self, pk : int):
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/accounts/profiles/{pk}/user_short/')
        if response.status_code == 200:
            return response #.json()
        elif response.status_code == 401:
            raise TokenExpiredException
        else:
            raise Exception(f'Error in get_users {response.status_code}')
    
    def get_profiles(self):
        response = self.do_request_as_auth_user(requests.get, 'http://api_gateway:80/api/accounts/profiles/')
        if response.status_code == 200:
            return response
        elif response.status_code == 401:
            return response
        else:
            raise Exception(f'Error in get_profiles {response.status_code}')
    
    def get_connected_friends(self):
        response = self.do_request_as_auth_user(requests.get, 'http://api_gateway:80/api/accounts/profiles/relation/friends/')
        if response.status_code == 200:
            friends = response.json()
            for friend in friends:
                key = f'user:{friend["id"]}:connectedCount'
                print(f'friend id : {friend["id"]}, connected count : {cache.get(key, 0)}')
            return [friend['id'] for friend in friends if is_user_connected(friend['id'])]
        elif response.status_code == 401:
            raise TokenExpiredException
        else:
            raise Exception(f'Error in get_connected_friends {response.status_code}')


    # returns a list of the profiles the current user has a conversation with 
    def get_convo_profiles(self, pks : list[int]):
        response = self.get_profiles()
        if response.status_code == 401:
            raise TokenExpiredException
        profiles = response.json()
        if not profiles:
            return []
        # Convert profiles list into a dictionary for quick lookup
        profiles_dict = {profile['id']: profile for profile in profiles}
        # Return profiles in the exact order of pks
        return [profiles_dict[pk] for pk in pks if pk in profiles_dict]
        
    
    def get_relation_to(self, pk : int, other_pk : int):
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/accounts/profiles/{pk}/relation_to/{other_pk}/')
        if response.status_code == 200:
            return response #.json()
        elif response.status_code == 401:
            raise TokenExpiredException
        else:
            raise Exception(f'Error in get_relation_to : {response.status_code} : {response.text}')

    def blocked_by_other(self, pk : int, other_pk : int) ->bool:
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/accounts/profiles/{pk}/other_pov/{other_pk}/')
        print('------- in AuthorisedRequest.blocked_by_other, other pov response = ', response.json())
        if response.status_code == 200:
            status = response.json()['relation']
            if status == 'blockeds':
                print(f'------- {other_pk} blocked {pk}')
                return True
            if 'blockeds' in response.json(): # 'blocked' a la mano c moche -> todo modifier 
                print(f'------- {other_pk} blocked {pk}')
                return True
            return False
        elif response.status_code == 401:
            raise TokenExpiredException
        else:
            raise Exception(f'Error in blocked_by_other : {response.status_code} : {response.text}')

    def get_profile(self, pk : int):
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/accounts/profiles/{pk}/') # profile
        if response.status_code == 200:
            return response #.json()
        elif response.status_code == 401:
            raise TokenExpiredException
        else:
            raise Exception(f'Error in get_profile {response.status_code}')
    
    def invite_user_to_game(self, other_pk : int):
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/events/events/invite/{other_pk}/')
        if response.status_code == 401:
            raise TokenExpiredException
        return response
    
    @staticmethod
    def sget_user(pk : int, token):
        return AuthorisedRequest.get_instance(token).get_user(pk)