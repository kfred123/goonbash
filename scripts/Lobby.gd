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
@onready var join_blue_btn = $LobbyScreen/TeamButtons/JoinBlueButton
@onready var join_red_btn = $LobbyScreen/TeamButtons/JoinRedButton
@onready var start_button = $LobbyScreen/StartButton
@onready var role_cards_container = $LobbyScreen/RoleCards
@onready var lobby_status = $LobbyScreen/LobbyStatus

var role_cards: Dictionary = {}  # role_name -> card panel

# Role definitions for card rendering
const ROLE_DATA = {
	"tank": {
		"label": "TANK",
		"icon": "🛡️",
		"desc": "High HP • Slow • Close range",
		"color": Color(0.2, 0.35, 0.6),
		"highlight": Color(0.3, 0.5, 0.85),
		"poly": [Vector2(-25, 0), Vector2(0, -18), Vector2(25, 0), Vector2(0, 18)],
		"poly_color": Color(0.4, 0.6, 1.0),
	},
	"healer": {
		"label": "HEALER",
		"icon": "💚",
		"desc": "Low HP • Fast • Long range",
		"color": Color(0.15, 0.45, 0.3),
		"highlight": Color(0.2, 0.7, 0.45),
		"poly": [Vector2(-5, -15), Vector2(5, -15), Vector2(5, -5), Vector2(15, -5), Vector2(15, 5), Vector2(5, 5), Vector2(5, 15), Vector2(-5, 15), Vector2(-5, 5), Vector2(-15, 5), Vector2(-15, -5), Vector2(-5, -5)],
		"poly_color": Color(0.3, 0.9, 0.5),
	},
	"damagedealer": {
		"label": "DAMAGE",
		"icon": "🚀",
		"desc": "Low HP • Fast • Rockets",
		"color": Color(0.6, 0.2, 0.2),
		"highlight": Color(0.85, 0.3, 0.3),
		"poly": [Vector2(0, -25), Vector2(15, 15), Vector2(0, 5), Vector2(-15, 15)],
		"poly_color": Color(1.0, 0.4, 0.2),
	}
}

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
	
	# --- Dynamic Online UI ---
	var mode_btn = Button.new()
	mode_btn.text = "Switch to Online Mode"
	mode_btn.pressed.connect(_on_mode_switch)
	$ConnectScreen/VBox.add_child(mode_btn)
	$ConnectScreen/VBox.move_child(mode_btn, 0)
	
	lobby_vbox = VBoxContainer.new()
	$ConnectScreen/VBox.add_child(lobby_vbox)
	lobby_vbox.hide()
	
	http_request = HTTPRequest.new()
	add_child(http_request)
	http_request.request_completed.connect(_on_http_request_completed)

func _get_player_name() -> String:
	var n = name_input.text.strip_edges()
	if n == "":
		n = "Player_%d" % randi_range(100, 999)
	return n

# --- Connect Screen ---
var mode = "local"
var lobby_vbox: VBoxContainer
var online_lobbies: Array = []
var http_request: HTTPRequest
const API_URL = "http://localhost:5031/api/lobbies"

func _on_mode_switch():
	if mode == "local":
		mode = "online"
		$ConnectScreen/VBox.get_child(0).text = "Switch to Local Mode"
		ip_input.hide()
		host_button.text = "Create Online Game"
		join_button.text = "Refresh Lobbies"
		lobby_vbox.show()
		_fetch_lobbies()
	else:
		mode = "local"
		$ConnectScreen/VBox.get_child(0).text = "Switch to Online Mode"
		ip_input.show()
		host_button.text = "Host Local Game"
		join_button.text = "Join Local Game"
		lobby_vbox.hide()

func _fetch_lobbies():
	connect_status.text = "Fetching lobbies..."
	http_request.request(API_URL)

func _on_http_request_completed(result, response_code, headers, body):
	if response_code == 200:
		connect_status.text = "Lobbies fetched."
		var text = body.get_string_from_utf8()
		var json = JSON.parse_string(text)
		if typeof(json) == TYPE_ARRAY:
			online_lobbies = json
			_update_lobby_ui()
	else:
		connect_status.text = "Failed to fetch lobbies."

func _update_lobby_ui():
	for c in lobby_vbox.get_children():
		c.queue_free()
	
	for lobby in online_lobbies:
		var btn = Button.new()
		# Expecting Lobby(string Id, string Name, string Ip, int Port)
		btn.text = "%s (%s:%d)" % [lobby.name, lobby.ip, lobby.port]
		btn.pressed.connect(func():
			_join_online_lobby(lobby)
		)
		lobby_vbox.add_child(btn)

func _join_online_lobby(lobby: Dictionary):
	var pname = _get_player_name()
	connect_status.text = "Connecting to %s..." % lobby.name
	var url = "ws://%s:%d" % [lobby.ip, lobby.port]
	if not NetworkManager.join_websocket_game(url, pname):
		connect_status.text = "Failed to connect to online game!"

func _on_host_pressed():
	var pname = _get_player_name()
	if mode == "local":
		connect_status.text = "Starting server as %s..." % pname
		if NetworkManager.host_game(pname):
			_show_lobby()
		else:
			connect_status.text = "Failed to start server!"
	else:
		connect_status.text = "Creating online game..."
		var create_req = HTTPRequest.new()
		add_child(create_req)
		create_req.request_completed.connect(func(res, code, headers, body):
			create_req.queue_free()
			if code == 200:
				var lobby = JSON.parse_string(body.get_string_from_utf8())
				_join_online_lobby(lobby)
			else:
				connect_status.text = "Failed to create online game."
		)
		var data = JSON.stringify({"name": pname + "'s Game"})
		var headers = ["Content-Type: application/json"]
		create_req.request(API_URL + "/create", headers, HTTPClient.METHOD_POST, data)

func _on_join_pressed():
	if mode == "local":
		var pname = _get_player_name()
		var ip = ip_input.text.strip_edges()
		if ip == "":
			ip = "127.0.0.1"
		connect_status.text = "Connecting to %s..." % ip
		if not NetworkManager.join_game(ip, pname):
			connect_status.text = "Failed to connect!"
	else:
		_fetch_lobbies()

func _on_connection_succeeded():
	_show_lobby()

func _on_connection_failed():
	connect_status.text = "Connection failed! Try again."

# --- Team Lobby ---

func _show_lobby():
	connect_screen.visible = false
	lobby_screen.visible = true
	start_button.visible = true
	_build_role_cards()
	_update_player_lists()

func _build_role_cards():
	# Clear existing
	for child in role_cards_container.get_children():
		child.queue_free()
	role_cards.clear()
	
	for role_name in NetworkManager.ROLES:
		var data = ROLE_DATA[role_name]
		var card = _create_role_card(role_name, data)
		role_cards_container.add_child(card)
		role_cards[role_name] = card

func _create_role_card(role_name: String, data: Dictionary) -> PanelContainer:
	var panel = PanelContainer.new()
	panel.custom_minimum_size = Vector2(140, 160)
	
	# Style
	var style = StyleBoxFlat.new()
	style.bg_color = data["color"]
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.border_width_left = 3
	style.border_width_right = 3
	style.border_width_top = 3
	style.border_width_bottom = 3
	style.border_color = Color(0.3, 0.3, 0.3, 0.5)
	panel.add_theme_stylebox_override("panel", style)
	
	var vbox = VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 8)
	panel.add_child(vbox)
	
	# Character preview using a SubViewport with Polygon2D
	var preview_container = SubViewportContainer.new()
	preview_container.custom_minimum_size = Vector2(80, 80)
	preview_container.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	preview_container.stretch = true
	vbox.add_child(preview_container)
	
	var viewport = SubViewport.new()
	viewport.size = Vector2i(80, 80)
	viewport.transparent_bg = true
	viewport.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	preview_container.add_child(viewport)
	
	var poly = Polygon2D.new()
	poly.polygon = data["poly"]
	poly.color = data["poly_color"]
	poly.position = Vector2(40, 40)  # Center in viewport
	viewport.add_child(poly)
	
	# Role name
	var name_label = Label.new()
	name_label.text = data["label"]
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 16)
	vbox.add_child(name_label)
	
	# Description
	var desc_label = Label.new()
	desc_label.text = data["desc"]
	desc_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	desc_label.add_theme_font_size_override("font_size", 10)
	desc_label.modulate = Color(0.8, 0.8, 0.8)
	vbox.add_child(desc_label)
	
	# Click handler
	panel.gui_input.connect(func(event):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_select_role(role_name)
	)
	
	return panel

func _select_role(role_name: String):
	if NetworkManager.is_host():
		NetworkManager.switch_role(role_name)
	else:
		NetworkManager._request_role_change.rpc_id(1, role_name)
	_update_role_card_highlights()

func _update_role_card_highlights():
	var my_id = multiplayer.get_unique_id()
	var my_role = "tank"
	if NetworkManager.players.has(my_id):
		my_role = NetworkManager.players[my_id]["role"]
	
	for role_name in role_cards:
		var panel = role_cards[role_name]
		var style = panel.get_theme_stylebox("panel") as StyleBoxFlat
		if style:
			var data = ROLE_DATA[role_name]
			if role_name == my_role:
				style.border_color = data["highlight"]
				style.bg_color = data["highlight"].darkened(0.2)
			else:
				style.border_color = Color(0.3, 0.3, 0.3, 0.5)
				style.bg_color = data["color"]

func _get_role_icon(role: String) -> String:
	if ROLE_DATA.has(role):
		return ROLE_DATA[role]["icon"]
	return "❓"

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
		label.text = "%s %s" % [_get_role_icon(p["role"]), p["name"]]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		if p["id"] == multiplayer.get_unique_id():
			label.text += " (You)"
			label.add_theme_color_override("font_color", Color(0.4, 0.8, 1.0))
		blue_list.add_child(label)
	
	for p in red_players:
		var label = Label.new()
		label.text = "%s %s" % [_get_role_icon(p["role"]), p["name"]]
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		if p["id"] == multiplayer.get_unique_id():
			label.text += " (You)"
			label.add_theme_color_override("font_color", Color(1.0, 0.5, 0.5))
		red_list.add_child(label)
	
	_update_role_card_highlights()
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
