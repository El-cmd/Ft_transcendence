import requests
from requests.exceptions import ConnectionError
from rest_framework import status
import time
from django.core.exceptions import PermissionDenied
# from django.core.exceptions import 
import requests
from requests.exceptions import ConnectionError
from rest_framework import status
import time
import logging

ACCOUNT_URL = 'http://api_gateway:80/api/accounts/'

class TokenExpired(Exception):
    def __init__(self):
        print('Token expired')
        super().__init__('Token expired')


class AuthorisedRequest(): 
    instance = None
    
    def __init__(self):
        self.user_token = None
        if AuthorisedRequest.instance:
            raise Exception('AuthorisedRequest already instantiated')
        
    @staticmethod
    def set_request_token(request):
        AuthorisedRequest.get().user_token = request.headers.get("Authorization")
        # print('token set', AuthorisedRequest.get().user_token)
        
    @staticmethod
    def set_token(token):
        AuthorisedRequest.get().user_token = token

    @staticmethod
    def get(): # faire autrement, va pas passer le token a chaquel appel a AuthorisedRequest, si ?
        # logging.info('getting instance')
        
        if AuthorisedRequest.instance is None:
            AuthorisedRequest.instance = AuthorisedRequest()
        return AuthorisedRequest.instance


    
    def user_headers(self):
        if not self.user_token:
            raise Exception('Unable to get requesting user\'s access token')
        return {
            'Authorization': self.user_token
        }
    
    def do_request_as_auth_user(self, lamdba_request, url, headers={}, data=None):
        headers.update(self.user_headers())
        if data is None:
            response = lamdba_request(url, headers=headers)
        else:

            response = lamdba_request(url, headers=headers, json=data)
        if response.status_code == 401:
            raise TokenExpired()
        
        return response # if response.status_code == 401, the calling view will also return 401, and the front end will refresh the token and make the request again

    def get_user(self, pk : int):
        response = self.do_request_as_auth_user(requests.get, f'http://api_gateway:80/api/accounts/profiles/{pk}/user_short/')
        if response.status_code == 200:
            return response.json()
        # elif response.status_code == 204:
            # return []
        else:
            raise Exception(f'Error in get_users {response.status_code}')
    
    def update_ranks(self, data):
        response = self.do_request_as_auth_user(requests.post, f'http://api_gateway:80/api/accounts/profiles/update_ranks/', data=data)
        if response.status_code != 204:
            print("!!!!!!!!!!!!!!!!!!!!!!!!!!!1Unable to update ranks!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
            # raise Exception(f'Error in update_ranks {response.status_code}')
