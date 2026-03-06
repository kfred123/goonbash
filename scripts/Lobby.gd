extends Control

# --- Connect Screen ---
@onready var connect_screen = $ConnectScreen
@onready var name_input = $ConnectScreen/VBox/NameInput
@onready var host_button = $ConnectScreen/VBox/HostButton
@onready var ip_input = $ConnectScreen/VBox/IPInput
@onready var join_button = $ConnectScreen/VBox/JoinButton
@onready var connect_status = $ConnectScreen/VBox/StatusLabel

# --- Team Lobby Screen ---
@onready var lobby_screen = $LobbyScreen
@onready var blue_list = $LobbyScreen/Teams/BluePanel/BlueVBox/BlueList
@onready var red_list = $LobbyScreen/Teams/RedPanel/RedVBox/RedList
@onready var join_blue_btn = $LobbyScreen/Buttons/JoinBlueButton
@onready var join_red_btn = $LobbyScreen/Buttons/JoinRedButton
@onready var start_button = $LobbyScreen/Buttons/StartButton
@onready var lobby_status = $LobbyScreen/LobbyStatus

func _ready():
	lobby_screen.visible = false
	connect_screen.visible = true
	
	host_button.pressed.connect(_on_host_pressed)
	join_button.pressed.connect(_on_join_pressed)
	join_blue_btn.pressed.connect(_on_join_blue)
	join_red_btn.pressed.connect(_on_join_red)
	start_button.pressed.connect(_on_start_pressed)
	
	NetworkManager.connection_succeeded.connect(_on_connection_succeeded)
	NetworkManager.connection_failed.connect(_on_connection_failed)
	NetworkManager.player_list_changed.connect(_update_player_lists)

func _get_player_name() -> String:
	var n = name_input.text.strip_edges()
	if n == "":
		n = "Player_%d" % randi_range(100, 999)
	return n

# --- Connect Screen ---

func _on_host_pressed():
	var pname = _get_player_name()
	connect_status.text = "Starting server as %s..." % pname
	if NetworkManager.host_game(pname):
		_show_lobby()
	else:
		connect_status.text = "Failed to start server!"

func _on_join_pressed():
	var pname = _get_player_name()
	var ip = ip_input.text.strip_edges()
	if ip == "":
		ip = "127.0.0.1"
	connect_status.text = "Connecting to %s..." % ip
	if not NetworkManager.join_game(ip, pname):
		connect_status.text = "Failed to connect!"

func _on_connection_succeeded():
	_show_lobby()

func _on_connection_failed():
	connect_status.text = "Connection failed! Try again."

# --- Team Lobby ---

func _show_lobby():
	connect_screen.visible = false
	lobby_screen.visible = true
	start_button.visible = NetworkManager.is_host()
	_update_player_lists()

func _update_player_lists():
	# Clear lists
	for child in blue_list.get_children():
		child.queue_free()
	for child in red_list.get_children():
		child.queue_free()
	
	var blue_players = NetworkManager.get_team_players("blue")
	var red_players = NetworkManager.get_team_players("red")
	
	for p in blue_players:
		var label = Label.new()
		label.text = p["name"]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		if p["id"] == multiplayer.get_unique_id():
			label.text += " (You)"
			label.add_theme_color_override("font_color", Color(0.4, 0.8, 1.0))
		blue_list.add_child(label)
	
	for p in red_players:
		var label = Label.new()
		label.text = p["name"]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		if p["id"] == multiplayer.get_unique_id():
			label.text += " (You)"
			label.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))
		red_list.add_child(label)
	
	lobby_status.text = "%d Blue vs %d Red" % [blue_players.size(), red_players.size()]

func _on_join_blue():
	if NetworkManager.is_host():
		NetworkManager.switch_team("blue")
	else:
		NetworkManager._request_team_change.rpc_id(1, "blue")

func _on_join_red():
	if NetworkManager.is_host():
		NetworkManager.switch_team("red")
	else:
		NetworkManager._request_team_change.rpc_id(1, "red")

func _on_start_pressed():
	if NetworkManager.is_host():
		NetworkManager.start_game()
