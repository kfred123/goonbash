extends StaticBody2D

@export var health: float = 500.0
@export var team: String = "red"

func get_team():
	return team
@export var spawn_rate: float = 5.0
var lane_index: int = 0

func _ready():
	if team == "red":
		add_to_group("enemy_base")
		$Polygon2D.color = Color(0.8, 0, 0)
	else:
		add_to_group("player_base")
		$Polygon2D.color = Color(0, 0, 0.8)
		
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

var _spawn_counter: int = 0

func _on_spawn_timer_timeout():
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
	health -= amount
	if health <= 0:
		print("Base Destroyed!")
		# Handle game over logic
