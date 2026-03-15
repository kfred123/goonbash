extends StaticBody2D

@export var health: float = 500.0
@export var max_health: float = 500.0
@export var team: String = "red"
@export var spawn_rate: float = 5.0
@export var attack_range: float = 300.0
@export var fire_rate: float = 1.5
@export var damage: float = 15.0

func get_team():
	return team

var lane_index: int = 0
var is_dead: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0

@onready var health_bar = $HealthBar
@onready var turret = $Turret

func _ready():
	add_to_group("bases")
	if team == "red":
		add_to_group("enemy_base")
		if has_node("Body"):
			$Body.color = Color(0.7, 0.1, 0.05)
		if has_node("Turret/Barrel"):
			$Turret/Barrel.color = Color(0.8, 0.15, 0.1)
		if has_node("Turret/TurretBase"):
			$Turret/TurretBase.color = Color(0.55, 0.08, 0.05)
	else:
		add_to_group("player_base")
		if has_node("Body"):
			$Body.color = Color(0.05, 0.1, 0.7)
		if has_node("Turret/Barrel"):
			$Turret/Barrel.color = Color(0.1, 0.15, 0.8)
		if has_node("Turret/TurretBase"):
			$Turret/TurretBase.color = Color(0.05, 0.08, 0.55)
	
	# Set initial turret facing direction
	if is_instance_valid(turret) and team == "red":
		turret.rotation = PI
	
	# Setup health bar
	if is_instance_valid(health_bar):
		health_bar.max_value = max_health
		health_bar.value = health
		health_bar.top_level = true
	
	# Create detection area for auto-targeting
	var detection = Area2D.new()
	detection.name = "DetectionArea"
	detection.collision_layer = 0
	detection.collision_mask = 2
	var shape = CollisionShape2D.new()
	var circle = CircleShape2D.new()
	circle.radius = attack_range
	shape.shape = circle
	detection.add_child(shape)
	add_child(detection)
	detection.body_entered.connect(_on_enemy_entered)
	detection.body_exited.connect(_on_enemy_exited)
		
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
		# Sync turret rotation
		var sync = MultiplayerSynchronizer.new()
		sync.name = "MultiplayerSync"
		var config = SceneReplicationConfig.new()
		if has_node("Turret"):
			config.add_property(NodePath("Turret:rotation"))
		sync.replication_config = config
		add_child(sync)

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-50, -65)

func _physics_process(delta):
	if is_dead:
		return
	
	# Only server runs combat logic
	if multiplayer.has_multiplayer_peer() and not multiplayer.is_server():
		return
	
	# Auto-shoot
	if is_instance_valid(current_target) and _is_valid_enemy(current_target):
		attack_timer -= delta
		if attack_timer <= 0:
			_shoot_at(current_target)
			attack_timer = fire_rate
	else:
		current_target = null
		attack_timer = 0.0
		_find_new_target()
	
	# Turret rotation
	if is_instance_valid(turret):
		if is_instance_valid(current_target) and _is_valid_enemy(current_target):
			var aim_dir = (current_target.global_position - global_position).normalized()
			turret.rotation = lerp_angle(turret.rotation, aim_dir.angle(), 5.0 * delta)
		else:
			var idle_angle = PI if team == "red" else 0.0
			turret.rotation = lerp_angle(turret.rotation, idle_angle, 2.0 * delta)

func _is_valid_enemy(body) -> bool:
	if not is_instance_valid(body):
		return false
	if body.is_queued_for_deletion():
		return false
	if not body.has_method("get_team"):
		return false
	if body.get_team() == team:
		return false
	if body.get("is_dead") == true:
		return false
	return true

func _find_new_target():
	var best: Node2D = null
	var best_dist: float = INF
	# Check minions, players, and towers
	for group_name in ["minions", "players", "towers"]:
		for body in get_tree().get_nodes_in_group(group_name):
			if _is_valid_enemy(body):
				var dist = global_position.distance_to(body.global_position)
				if dist <= attack_range and dist < best_dist:
					best_dist = dist
					best = body
	if best:
		current_target = best

func _on_enemy_entered(body):
	if _is_valid_enemy(body):
		if not is_instance_valid(current_target) or not _is_valid_enemy(current_target):
			current_target = body

func _on_enemy_exited(body):
	if body == current_target:
		current_target = null
		_find_new_target()

func _shoot_at(target: Node2D):
	var dir = (target.global_position - global_position).normalized()
	var spawn_pos = global_position + dir * 50
	_do_spawn_bullet_at(team, dir, spawn_pos)
	if multiplayer.has_multiplayer_peer():
		_rpc_base_shoot.rpc(team, dir, spawn_pos)

@rpc("authority", "reliable")
func _rpc_base_shoot(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	_do_spawn_bullet_at(bullet_team, dir, spawn_pos)

func _do_spawn_bullet_at(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var b = scene.instantiate()
	b.team = bullet_team
	b.direction = dir
	b.damage = damage
	b.rotation = dir.angle()
	b.global_position = spawn_pos
	get_parent().add_child(b)

var _spawn_counter: int = 0

func _on_spawn_timer_timeout():
	if is_dead:
		return
	var scene = ResourceManager.minion_scene
	if not scene:
		return

	var lanes = get_tree().get_nodes_in_group("lanes")
	if lanes.size() == 0:
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
