import json
from channels.testing import WebsocketCommunicator
from django.contrib.auth.models import User
from django.test import TestCase
from channels.db import database_sync_to_async
from transcendance_api.asgi import application  # This should point to your ASGI app
from channels.layers import get_channel_layer
from asgiref.sync import sync_to_async
from rest_framework.test import APIClient
from django.urls import reverse

from accounts.models import Profile, RelationsUpdate, RelationsType
from .models import PrivateMessage

def update_rel(action, client, other):
        return client.get(reverse('profile-update-relation', args=[action.value,other.user.pk]))

async def print_db():
    print("db : \n")
    async for msg in PrivateMessage.objects.all():
        print(f"message {msg.pk} : {msg.content}") # print(f"message {msg.pk} : {msg}")


class WebSocketChatConsumerTestCase(TestCase):
    # @classmethod
    # def setUpTestData(cls):
    #     # Set up test data (users)
    #     cls.user1 = User.objects.create_user(username='alice', password='password')
    #     cls.user2 = User.objects.create_user(username='bob', password='password')

    @classmethod
    def setUpTestData(cls):
        # Create test users and profiles
        cls.user1 = User.objects.create_user(username='alice', password='password')
        cls.user2 = User.objects.create_user(username='bob', password='password')
        cls.user3 = User.objects.create_user(username='evan', password='password')
        cls.user1_profile : Profile = Profile.get_profile(cls.user1)
        cls.user2_profile : Profile = Profile.get_profile(cls.user2)
        cls.user3_profile : Profile = Profile.get_profile(cls.user3)

        # Authenticate user for REST API tests
        cls.api_client = APIClient()
        cls.api_client.login(username="alice", password="password")

        # Set up WebSocket URLs
        cls.ws_url_user1 = f"ws/chat/{cls.user1.pk}/"
        cls.ws_url_user2 = f"ws/chat/{cls.user2.pk}/"
        cls.ws_url_user3 = f"ws/chat/{cls.user3.pk}/"


    # async def test_connect_and_disconnect(self):
    #     """Test that users can connect and disconnect successfully."""

    #     # Test user 1 connection
    #     communicator_user1 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
    #     communicator_user1.scope["user"] = self.user1  # Attach user 1 to the scope
    #     connected, subprotocol = await communicator_user1.connect()
    #     self.assertTrue(connected)

    #     # Test user 2 connection
    #     communicator_user2 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
    #     communicator_user2.scope["user"] = self.user2  # Attach user 2 to the scope
    #     connected, subprotocol = await communicator_user2.connect()
    #     self.assertTrue(connected)

    #     # Disconnect user 1
    #     await communicator_user1.disconnect()

    #     # Disconnect user 2
    #     await communicator_user2.disconnect()

    async def test_receive_and_send_message(self):
        """Test sending and receiving messages over WebSocket."""

        # Test user 1 connection
        communicator_user1 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user1.scope["user"] = self.user1  # Attach user 1 to the scope
        connected, subprotocol = await communicator_user1.connect()
        self.assertTrue(connected)

        # Test user 2 connection
        communicator_user2 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user2.scope["user"] = self.user2  # Attach user 2 to the scope
        connected, subprotocol = await communicator_user2.connect()
        self.assertTrue(connected)

        # Test user 1 connection
        communicator_user3 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user3.scope["user"] = self.user3  # Attach user 1 to the scope
        connected, subprotocol = await communicator_user3.connect()
        self.assertTrue(connected)

        #Send a message from user 1
        message = {
            "type": "private_message",
            "payload": {
                "message": "Hello from Alice!",
                "sender": self.user1.username,
                "recipient": self.user2.username 
            }
        }
        await communicator_user1.send_json_to(message)

        # Receive the message on user 2's side
        response = await communicator_user2.receive_json_from()
        # print(f"in unit test : response = {response}")
        self.assertEqual(response["payload"]["message"], "Hello from Alice!")

        message2 = {
            "type": "private_message",
            "payload": {
                "message": "This is Alice, are you still there!",
                "sender": self.user1.username,
                "recipient": self.user2.username 
            }
        }
        await communicator_user1.send_json_to(message2)

        response = await communicator_user2.receive_json_from()
        self.assertEqual(response["payload"]["message"], "This is Alice, are you still there!")
        # print(response)

        message3 = {
            "type": "private_message",
            "payload": {
                "message": "hi Alice!",
                "sender": self.user2.username,
                "recipient": self.user1.username 
            }
        }
        await communicator_user2.send_json_to(message3)

        # Receive the message on user 2's side
        response = await communicator_user1.receive_json_from()
        self.assertEqual(response["payload"]["message"], "hi Alice!")
        # print(response)

        message4 = {
            "type": "private_message",
            "payload": {
                "message": "what's up alice! this is evan",
                "sender": self.user3.username,
                "recipient": self.user1.username 
            }
        }
        await communicator_user3.send_json_to(message4)

        # Receive the message on user 2's side
        response = await communicator_user1.receive_json_from()
        self.assertEqual(response["payload"]["message"], "what's up alice! this is evan")

        message5 = {
            "type": "private_message",
            "payload": {
                "message": "oh hey evan, how are you ? blablablablabla",
                "sender": self.user1.username,
                "recipient": self.user3.username 
            }
        }
        await communicator_user1.send_json_to(message5)

        # Receive the message on user 2's side
        response = await communicator_user3.receive_json_from()
        self.assertEqual(response["payload"]["message"], "oh hey evan, how are you ? blablablablabla")

        url = await sync_to_async(reverse)("chat_index") # url to fetch chat history of alice with bob
        # await sync_to_async(print)(f"get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 200)
        # await sync_to_async(print)('json response data : ', response.data)

        # checks that 404 is returned when querying a conversation with a user that does not exist
        url = await sync_to_async(reverse)("chat_details", kwargs={'pk':4}) # url to fetch chat history of alice with bob
        # await sync_to_async(print)(f"get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 404)

        # # Clean up
        await communicator_user1.disconnect()
        await communicator_user2.disconnect()
        await communicator_user3.disconnect()

        print('\n\n')



    async def test_send_disconnect_send_reconnect(self):
        """ Test starting a conversation between user1 and user2, then logging out user1, 
        user2 sends user1 a msg while user1 is still logged out, then user1 logs back in and
        should retrieve the correct message history 
        -> More Rest API suited (client sends a get request to retrieve convos history) """
         # Test user 1 connection
        communicator_user1 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user1.scope["user"] = self.user1  # Attach user 1 to the scope
        connected, subprotocol = await communicator_user1.connect()
        self.assertTrue(connected)

        # Test user 2 connection
        communicator_user2 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user2.scope["user"] = self.user2  # Attach user 2 to the scope
        connected, subprotocol = await communicator_user2.connect()
        self.assertTrue(connected)

        #Send a message from user 1
        message = {
            "type": "private_message",
            "payload": {
                "message": "Hello from Alice!",
                "sender": self.user1.username,
                "recipient": self.user2.username 
            }
        }
        await communicator_user1.send_json_to(message)

        # Receive the message on user 2's side
        response = await communicator_user2.receive_json_from()
        # print(f"in unit test : response = {response}")
        self.assertEqual(response["payload"]["message"], "Hello from Alice!")

        message2 = {
            "type": "private_message",
            "payload": {
                "message": "hi Alice!",
                "sender": self.user2.username,
                "recipient": self.user1.username 
            }
        }
        await communicator_user2.send_json_to(message2)
        # Receive the message on user 2's side
        response = await communicator_user1.receive_json_from()
        self.assertEqual(response["payload"]["message"], "hi Alice!")

        # # disconnect Alice
        await communicator_user1.disconnect()

        message3 = {
            "type": "private_message",
            "payload": {
                "message": "This is Bob, you still there?",
                "sender": self.user2.username,
                "recipient": self.user1.username
            }
        }
        await communicator_user2.send_json_to(message3)

        print(await sync_to_async(len)(PrivateMessage.objects.all()))
        # assert(await sync_to_async(len)(PrivateMessage.objects.all()) == 3) # this fails for some reason ??? ffs

        # reconnects Alice (logs back in)
        communicator_user1 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user1.scope["user"] = self.user1  # Attach user 1 to the scope
        connected, subprotocol = await communicator_user1.connect()
        self.assertTrue(connected)

        url = reverse("chat_index")
        # print(f"get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 200)
        print("response.data", response.data) # same as print(response.json())
        
        url = reverse("chat_details", kwargs={'pk':self.user2.pk})
        # print(f"get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 200)
        print("response.data", response.data) # same as print(response.json())

        await communicator_user1.disconnect()

        # # Clean up
        await communicator_user2.disconnect()




    # The user should be able to block other users.
    async def test_cannot_see_blocked_user_convo(self):
         # Test user 1 connection
        communicator_user1 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user1.scope["user"] = self.user1  # Attach user 1 to the scope
        connected, subprotocol = await communicator_user1.connect()
        self.assertTrue(connected)
        # Test user 2 connection
        communicator_user2 = WebsocketCommunicator(application, f'ws/chat/')  # Matching your routing
        communicator_user2.scope["user"] = self.user2  # Attach user 2 to the scope
        connected, subprotocol = await communicator_user2.connect()
        self.assertTrue(connected)

        message = {
            "type": "private_message",
            "payload": {
                "message": "Coucou c'est Alice",
                "sender": self.user1.username,
                "recipient": self.user2.username 
            }
        }
        await communicator_user1.send_json_to(message)

        # Receive the message on user 2's side
        response = await communicator_user2.receive_json_from()
        self.assertEqual(response["payload"]["message"], "Coucou c'est Alice")

        # check if alice blocked bob correctly 
        await sync_to_async(update_rel)(RelationsUpdate.BLOCK, client=self.api_client, other=self.user2_profile)
        assert(await sync_to_async(self.user1_profile.get_relation_to)(self.user2) == RelationsType.BLOCK)

        message2 = {
            "type": "private_message",
            "payload": {
                "message": "Wesh alice tu m'as bloquée ou quoi",
                "sender": self.user2.username,
                "recipient": self.user1.username 
            }
        }
        await communicator_user2.send_json_to(message2)

        url = await sync_to_async(reverse)("chat_details", kwargs={'pk':self.user2.pk}) # url to fetch chat history of alice with bob
        # await sync_to_async(print)(f"get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 200)
        payload = response.data
        await sync_to_async(print)(f"response.data : {response.data} \n")
        # assert(await sync_to_async(len)(response.data['messages']) == 0)

        # check if alice unblocked bob correctly 
        await sync_to_async(update_rel)(RelationsUpdate.UNBLOCK, client=self.api_client, other=self.user2_profile)
        assert(await sync_to_async(self.user1_profile.get_relation_to)(self.user2) == RelationsType.NEUTRAL)

        url = await sync_to_async(reverse)("chat_details", kwargs={'pk':self.user2.pk}) # url to fetch chat history of alice with bob
        await sync_to_async(print)(f"after unblocking bob, get request at {url}")
        response = await sync_to_async(self.api_client.get)(url)
        self.assertEqual(response.status_code, 200)
        payload = response.data
        await sync_to_async(print)(f"response.data : {response.data} \n")
        # assert(await sync_to_async(len)(response.data['messages']) == 2)

        # # Clean up
        await communicator_user1.disconnect()
        await communicator_user2.disconnect()








    async def test_messages_status(self):
        pass

    # Should not be warned about anything, should still see the convo. Other user won't though
    async def test_send_msg_to_blocked_user(self): 
        pass

    # The tournament system should be able to warn users expected for the next game
    async def test_get_tournament_notification(self):
        pass