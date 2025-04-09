from django.utils.deprecation import MiddlewareMixin
from rest_framework_simplejwt.tokens import AccessToken
from .accounts_request import AuthorisedRequest
class SetAuthorizationTokenMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Generate or retrieve the token
        if request.headers.get("Authorization") is not None:
            AuthorisedRequest.set_request_token(request)
        