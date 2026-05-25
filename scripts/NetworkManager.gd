extends Node

signal player_list_changed()
signal all_players_ready()
signal game_starting()
signal connection_failed()
signal connection_succeeded()

const PORT = 9999
const MAX_CLIENTS = 7  # + host = 8 players max

var player_name: String = ""
# Dictionary of peer_id -> { "name": String, "team": String, "role": String }
var players: Dictionary = {}

const ROLES = ["tank", "healer", "damagedealer"]

var is_dedicated_server: bool = false
var match_started: bool = false

func _ready():
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	
	var args = OS.get_cmdline_args()
	if "--server" in args:
		is_dedicated_server = true
		print("[Network] Headless server mode detected")
		var port = PORT
		var lobby_name = "Online Match"
		for arg in args:
			if arg.begins_with("--port="):
				port = arg.split("=")[1].to_int()
			elif arg.begins_with("--lobby-name="):
				lobby_name = arg.split("=")[1]
		
		host_dedicated_websocket(port, lobby_name)

func host_dedicated_websocket(port: int, host_name: String):
	player_name = host_name
	var peer = WebSocketMultiplayerPeer.new()
	var error = peer.create_server(port)
	if error:
		print("[Network] Failed to create WebSocket server: %s" % error)
		get_tree().quit()
		return false
	
	multiplayer.multiplayer_peer = peer
	print("[Network] Dedicated WebSocket Server started on port %d" % port)
	return true
	
func join_websocket_game(url: String, join_name: String):
	player_name = join_name
	var peer = WebSocketMultiplayerPeer.new()
	var error = peer.create_client(url)
	if error:
		print("[Network] Failed to connect WebSocket: %s" % error)
		connection_failed.emit()
		return false
	
	multiplayer.multiplayer_peer = peer
	print("[Network] Connecting WebSocket to %s as %s..." % [url, join_name])
	return true

func host_game(host_name: String):
	player_name = host_name
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_server(PORT, MAX_CLIENTS)
	if error:
		print("[Network] Failed to create server: %s" % error)
		return false
	
	multiplayer.multiplayer_peer = peer
	# Register host as player
	players[1] = { "name": host_name, "team": "blue", "role": "tank" }
	player_list_changed.emit()
	print("[Network] Server started. Host: %s" % host_name)
	return true

func join_game(ip: String, join_name: String):
	player_name = join_name
	var peer = ENetMultiplayerPeer.new()
	var error = peer.create_client(ip, PORT)
	if error:
		print("[Network] Failed to connect: %s" % error)
		connection_failed.emit()
		return false
	
	multiplayer.multiplayer_peer = peer
	print("[Network] Connecting to %s as %s..." % [ip, join_name])
	return true

func get_my_team() -> String:
	var my_id = multiplayer.get_unique_id()
	if players.has(my_id):
		return players[my_id]["team"]
	return "blue"

func is_host() -> bool:
	return multiplayer.is_server()

func switch_team(new_team: String):
	var my_id = multiplayer.get_unique_id()
	if players.has(my_id):
		players[my_id]["team"] = new_team
		_sync_players_to_all()

func switch_role(new_role: String):
	var my_id = multiplayer.get_unique_id()
	if players.has(my_id):
		players[my_id]["role"] = new_role
		_sync_players_to_all()

func cycle_role():
	var my_id = multiplayer.get_unique_id()
	if players.has(my_id):
		var current = players[my_id]["role"]
		var idx = ROLES.find(current)
		var next_role = ROLES[(idx + 1) % ROLES.size()]
		players[my_id]["role"] = next_role
		_sync_players_to_all()
		return next_role
	return "tank"

func get_team_players(team: String) -> Array:
	var result = []
	for pid in players:
		if players[pid]["team"] == team:
			result.append({ "id": pid, "name": players[pid]["name"], "role": players[pid]["role"] })
	return result

# --- RPCs ---

@rpc("any_peer", "reliable")
func _register_player(peer_name: String):
	var sender_id = multiplayer.get_remote_sender_id()
	players[sender_id] = { "name": peer_name, "team": "red", "role": "tank" }
	print("[Network] Player registered: %s (ID: %d)" % [peer_name, sender_id])
	# Sync updated list to everyone
	_sync_players_to_all()

@rpc("any_peer", "reliable")
func _request_team_change(new_team: String):
	var sender_id = multiplayer.get_remote_sender_id()
	if players.has(sender_id):
		players[sender_id]["team"] = new_team
		print("[Network] %s switched to %s" % [players[sender_id]["name"], new_team])
		_sync_players_to_all()

@rpc("any_peer", "reliable")
func _request_role_change(new_role: String):
	var sender_id = multiplayer.get_remote_sender_id()
	if players.has(sender_id):
		players[sender_id]["role"] = new_role
		print("[Network] %s switched to role %s" % [players[sender_id]["name"], new_role])
		_sync_players_to_all()

@rpc("authority", "reliable")
func _receive_player_list(serialized: String):
	var parsed = JSON.parse_string(serialized)
	if parsed == null:
		return
	# Convert string keys back to ints
	players.clear()
	for key in parsed:
		players[int(key)] = parsed[key]
	player_list_changed.emit()

@rpc("authority", "reliable")
func _start_game_rpc():
	game_starting.emit()
	get_tree().change_scene_to_file("res://scenes/MainMap.tscn")

func start_game():
	if not multiplayer.is_server():
		return
	match_started = true
	# Start on all clients
	_start_game_rpc.rpc()
	# Start locally (but dedicated server doesn't need to load the full scene if it doesn't want to, but we'll load it so it can host nodes)
	game_starting.emit()
	get_tree().change_scene_to_file("res://scenes/MainMap.tscn")

@rpc("any_peer", "reliable")
func request_start_game():
	if multiplayer.is_server():
		start_game()

func _sync_players_to_all():
	player_list_changed.emit()
	if multiplayer.is_server():
		# Serialize: convert int keys to strings for JSON
		var data = {}
		for pid in players:
			data[str(pid)] = players[pid]
		var json = JSON.stringify(data)
		_receive_player_list.rpc(json)

# --- Signal Handlers ---

func _on_peer_connected(id):
	print("[Network] Peer connected: %d" % id)

func _on_peer_disconnected(id):
	print("[Network] Peer disconnected: %d" % id)
	if players.has(id):
		players.erase(id)
		_sync_players_to_all()
	
	# Auto-shutdown logic for dedicated server
	if is_dedicated_server:
		if players.is_empty():
			print("[Network] All players left. Shutting down dedicated server.")
			get_tree().quit()

func _on_connected_to_server():
	var my_id = multiplayer.get_unique_id()
	print("[Network] Connected! My ID: %d" % my_id)
	connection_succeeded.emit()
	# Register with the host
	_register_player.rpc_id(1, player_name)

func _on_connection_failed():
	print("[Network] Connection failed!")
	connection_failed.emit()
