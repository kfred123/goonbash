extends StaticBody2D

@export var health: float = 500.0
@export var max_health: float = 500.0
@export var team: String = "red"

func get_team():
	return team
@export var spawn_rate: float = 5.0
var lane_index: int = 0
var is_dead: bool = false

@onready var health_bar = $HealthBar

func _ready():
	add_to_group("bases")
	if team == "red":
		add_to_group("enemy_base")
		$Polygon2D.color = Color(0.8, 0, 0)
	else:
		add_to_group("player_base")
		$Polygon2D.color = Color(0, 0, 0.8)
	
	# Setup health bar
	if is_instance_valid(health_bar):
		health_bar.max_value = max_health
		health_bar.value = health
		health_bar.top_level = true
		
	# Only the server spawns minions
	if not multiplayer.has_multiplayer_peer() or multiplayer.is_server():
		call_deferred("_on_spawn_timer_timeout")
	
	# Only the server runs the spawn timer
	if not multiplayer.has_multiplayer_peer() or multiplayer.is_server():
		var timer = Timer.new()
		timer.wait_time = spawn_rate
		timer.autostart = true
		timer.timeout.connect(_on_spawn_timer_timeout)
		add_child(timer)
	
	# Server is authority for bases
	if multiplayer.has_multiplayer_peer():
		set_multiplayer_authority(1)

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-50, -65)

var _spawn_counter: int = 0

func _on_spawn_timer_timeout():
	if is_dead:
		return
	var scene = ResourceManager.minion_scene
	if not scene:
		print("[%s] ERROR: ResourceManager minion_scene is NULL" % team)
		return

	var lanes = get_tree().get_nodes_in_group("lanes")
	if lanes.size() == 0:
		print("[%s] ERROR: No lanes found in group 'lanes'" % team)
		return
		
	var chosen_lane_index = lane_index % lanes.size()
	lane_index += 1
	_spawn_counter += 1
	
	var minion_name = "%s_minion_%d" % [team, _spawn_counter]
	
	# Spawn locally (server)
	_do_spawn_minion(minion_name, chosen_lane_index, team, global_position)
	
	# Spawn on all clients
	if multiplayer.has_multiplayer_peer():
		_rpc_spawn_minion.rpc(minion_name, chosen_lane_index, team, global_position)

@rpc("authority", "reliable")
func _rpc_spawn_minion(minion_name: String, lane_idx: int, minion_team: String, spawn_pos: Vector2):
	_do_spawn_minion(minion_name, lane_idx, minion_team, spawn_pos)

func _do_spawn_minion(minion_name: String, lane_idx: int, minion_team: String, spawn_pos: Vector2):
	var scene = ResourceManager.minion_scene
	if not scene:
		return
	
	var lanes = get_tree().get_nodes_in_group("lanes")
	if lane_idx >= lanes.size():
		return
	
	var chosen_lane = lanes[lane_idx]
	var minion = scene.instantiate()
	minion.name = minion_name
	minion.global_position = spawn_pos
	minion.setup_lane(chosen_lane, minion_team)
	get_parent().add_child(minion)

func take_damage(amount: float):
	if is_dead:
		return
	# Only server processes base damage
	if multiplayer.has_multiplayer_peer() and not multiplayer.is_server():
		return
	health -= amount
	if is_instance_valid(health_bar):
		health_bar.value = health
	# Sync health to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_base_health.rpc(health)
	if health <= 0:
		_die()
		if multiplayer.has_multiplayer_peer():
			_rpc_sync_base_death.rpc()

@rpc("authority", "reliable")
func _rpc_sync_base_health(new_health: float):
	health = new_health
	if is_instance_valid(health_bar):
		health_bar.value = health

func _die():
	is_dead = true
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	if is_instance_valid(health_bar):
		health_bar.visible = false
	print("[%s] BASE DESTROYED!" % team)
	# Notify MainMap that the game is over
	var winning_team = "red" if team == "blue" else "blue"
	_trigger_game_over(winning_team)

@rpc("authority", "reliable")
func _rpc_sync_base_death():
	is_dead = true
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	if is_instance_valid(health_bar):
		health_bar.visible = false
	var winning_team = "red" if team == "blue" else "blue"
	_trigger_game_over(winning_team)

func _trigger_game_over(winning_team: String):
	var main_map = get_parent()
	if main_map and main_map.has_method("on_game_over"):
		main_map.on_game_over(winning_team)
