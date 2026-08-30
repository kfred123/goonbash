extends StaticBody2D

@export var health: float = 300.0
@export var max_health: float = 300.0
@export var team: String = "blue"
@export var attack_range: float = 250.0
@export var fire_rate: float = 1.2
@export var damage: float = 12.0

var is_dead: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0

@onready var health_bar = $HealthBar
@onready var turret = $Turret

func get_team():
	return team

func _ready():
	add_to_group("towers")
	
	# Apply team colors
	if team == "red":
		if has_node("Body"):
			$Body.color = Color(0.6, 0.15, 0.1)
		if has_node("Turret/Barrel"):
			$Turret/Barrel.color = Color(0.7, 0.2, 0.15)
		if has_node("Turret/TurretBase"):
			$Turret/TurretBase.color = Color(0.5, 0.1, 0.08)
	else:
		if has_node("Body"):
			$Body.color = Color(0.1, 0.15, 0.6)
		if has_node("Turret/Barrel"):
			$Turret/Barrel.color = Color(0.15, 0.2, 0.7)
		if has_node("Turret/TurretBase"):
			$Turret/TurretBase.color = Color(0.08, 0.1, 0.5)
	
	# Set initial turret facing direction
	if is_instance_valid(turret) and team == "red":
		turret.rotation = PI
	
	# Setup health bar
	if is_instance_valid(health_bar):
		health_bar.max_value = max_health
		health_bar.value = health
		health_bar.top_level = true
	
	# Connect detection signals
	if has_node("DetectionArea"):
		$DetectionArea.body_entered.connect(_on_enemy_entered)
		$DetectionArea.body_exited.connect(_on_enemy_exited)
	
	# Server is authority
	if multiplayer.has_multiplayer_peer():
		set_multiplayer_authority(1)
		var sync = MultiplayerSynchronizer.new()
		sync.name = "MultiplayerSync"
		var config = SceneReplicationConfig.new()
		if has_node("Turret"):
			config.add_property(NodePath("Turret:rotation"))
		sync.replication_config = config
		add_child(sync)

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-30, -45)

func _physics_process(delta):
	if is_dead:
		return
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
			turret.rotation = lerp_angle(turret.rotation, aim_dir.angle(), 6.0 * delta)
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
	for group_name in ["minions", "players"]:
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
	var spawn_pos = global_position + dir * 40
	_do_spawn_bullet(team, dir, spawn_pos)
	if multiplayer.has_multiplayer_peer():
		_rpc_tower_shoot.rpc(team, dir, spawn_pos)

@rpc("authority", "reliable")
func _rpc_tower_shoot(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	_do_spawn_bullet(bullet_team, dir, spawn_pos)

func _do_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
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

func take_damage(amount: float):
	if is_dead:
		return
	if multiplayer.has_multiplayer_peer() and not multiplayer.is_server():
		return
	health -= amount
	if is_instance_valid(health_bar):
		health_bar.value = health
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_tower_health.rpc(health)
	if health <= 0:
		_die()
		if multiplayer.has_multiplayer_peer():
			_rpc_sync_tower_death.rpc()

@rpc("authority", "reliable")
func _rpc_sync_tower_health(new_health: float):
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
	# Grant XP to nearby enemies
	for player in get_tree().get_nodes_in_group("players"):
		if player.get_team() == team:
			continue
		if player.get("is_dead") == true:
			continue
		var dist = global_position.distance_to(player.global_position)
		if dist <= 400.0:
			if player.has_method("gain_experience"):
				player.gain_experience(50.0)
	print("[%s] Tower destroyed!" % team)

@rpc("authority", "reliable")
func _rpc_sync_tower_death():
	is_dead = true
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	if is_instance_valid(health_bar):
		health_bar.visible = false
