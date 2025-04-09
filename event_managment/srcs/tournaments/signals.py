from django.dispatch import Signal

tournament_game_is_over_signal = Signal('tournament_game')
skiped_game_signal = Signal(['tournament_id', 'skiped_game_id', 'user_to_prevent'])
round_launch_signal = Signal(['user_id'])