from django.dispatch import Signal

# Define a custom signal
stop_signal = Signal(["event"])
player_ready_signal = Signal(["event"])

# broadcast to front-end signals

# broadcast through the event channel
new_player_signal = Signal(["event", "user_id"]) # add player to the event channel
event_launch_signal = Signal(["event"])
event_over_signal = Signal(["event"])
rank_update_signal = Signal(["event"])

# broadcast through the user channel and the event channel
invite_signal = Signal(["event", "user_id", "invited_by_id"])

#  broadcast through the user channel
player_status_update = Signal(["user_id"])
# -> # noevents # notready # notbegin # notend

# broadcast through the main channel
new_public_signal = Signal(["event"])
player_give_up = Signal(["event_player"])


