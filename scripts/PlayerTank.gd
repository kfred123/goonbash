extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0
@export var attack_range: float = 250.0
@export var fire_rate: float = 0.5
@export var max_health: float = 100.0

var team: String = "blue"
var role: String = "tank"
var health: float = 100.0
var target_position: Vector2 = Vector2.ZERO
var moving: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0
var spawn_position: Vector2 = Vector2.ZERO
var is_dead: bool = false
var respawn_timer: float = 0.0
const RESPAWN_TIME: float = 3.0

@onready var health_bar = $HealthBar

func get_team():
	return team

func set_role(r: String):
	role = r
	var tank_poly = [Vector2(-25, 0), Vector2(0, -18), Vector2(25, 0), Vector2(0, 18)]
	var healer_poly = [Vector2(-5, -15), Vector2(5, -15), Vector2(5, -5), Vector2(15, -5), Vector2(15, 5), Vector2(5, 5), Vector2(5, 15), Vector2(-5, 15), Vector2(-5, 5), Vector2(-15, 5), Vector2(-15, -5), Vector2(-5, -5)]
	
	match role:
		"tank":
			max_health = 200.0
			speed = 250.0
			fire_rate = 0.8
			attack_range = 200.0
			if has_node("Polygon2D"):
				$Polygon2D.polygon = tank_poly
			if has_node("CollisionPolygon2D"):
				$CollisionPolygon2D.polygon = tank_poly
		"healer":
			max_health = 60.0
			speed = 350.0
			fire_rate = 1.0
			attack_range = 300.0
			if has_node("Polygon2D"):
				$Polygon2D.polygon = healer_poly
			if has_node("CollisionPolygon2D"):
				$CollisionPolygon2D.polygon = healer_poly
	health = max_health
	_apply_team_color()

func set_team(t: String):
	team = t
	_apply_team_color()

func _apply_team_color():
	if has_node("Polygon2D"):
		if team == "blue":
			match role:
				"tank": $Polygon2D.color = Color(0.15, 0.4, 0.9, 1.0)
				"healer": $Polygon2D.color = Color(0.2, 0.8, 0.6, 1.0)
		else:
			match role:
				"tank": $Polygon2D.color = Color(0.9, 0.2, 0.2, 1.0)
				"healer": $Polygon2D.color = Color(0.9, 0.6, 0.2, 1.0)

func _ready():
	add_to_group("players")
	target_position = global_position
	spawn_position = global_position
	health = max_health
	
	# Setup health bar
	if is_instance_valid(health_bar):
		health_bar.max_value = max_health
		health_bar.value = health
		health_bar.top_level = true
	
	# Create detection area in code
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
	
	# Setup multiplayer sync for position and rotation
	if multiplayer.has_multiplayer_peer():
		var sync = MultiplayerSynchronizer.new()
		sync.name = "MultiplayerSync"
		var config = SceneReplicationConfig.new()
		config.add_property(NodePath(".:position"))
		config.add_property(NodePath(".:rotation"))
		sync.replication_config = config
		add_child(sync)

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-25, -35)

func take_damage(amount: float):
	# Forward damage to the authority if we're not it
	if multiplayer.has_multiplayer_peer() and not is_multiplayer_authority():
		_rpc_take_damage.rpc_id(get_multiplayer_authority(), amount)
		return
	_apply_damage(amount)

@rpc("any_peer", "reliable")
func _rpc_take_damage(amount: float):
	_apply_damage(amount)

func _apply_damage(amount: float):
	if is_dead:
		return
	health -= amount
	if is_instance_valid(health_bar):
		health_bar.value = health
	# Sync health to all peers so their health bars update
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_health.rpc(health)
	if health <= 0:
		_die()
		# Sync death to all peers
		if multiplayer.has_multiplayer_peer():
			_rpc_sync_death.rpc()

@rpc("any_peer", "reliable")
func _rpc_sync_health(new_health: float):
	health = new_health
	if is_instance_valid(health_bar):
		health_bar.value = health

func _die():
	is_dead = true
	respawn_timer = RESPAWN_TIME
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	current_target = null
	moving = false
	velocity = Vector2.ZERO
	if is_instance_valid(health_bar):
		health_bar.visible = false
	print("[%s] Player died! Respawning in %ds..." % [team, RESPAWN_TIME])

func _respawn():
	is_dead = false
	health = max_health
	global_position = spawn_position
	target_position = spawn_position
	visible = true
	current_target = null
	attack_timer = fire_rate
	rotation = 0.0
	set_collision_layer_value(2, true)
	if is_instance_valid(health_bar):
		health_bar.value = health
		health_bar.visible = true
	print("[%s] Player respawned!" % team)
	# Sync respawn to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_respawn.rpc()

@rpc("any_peer", "reliable")
func _rpc_sync_death():
	is_dead = true
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	current_target = null
	if is_instance_valid(health_bar):
		health_bar.visible = false

@rpc("any_peer", "reliable")
func _rpc_sync_respawn():
	is_dead = false
	health = max_health
	visible = true
	set_collision_layer_value(2, true)
	if is_instance_valid(health_bar):
		health_bar.value = health
		health_bar.visible = true

func _on_enemy_entered(body):
	if not is_multiplayer_authority():
		return
	if _is_valid_enemy(body):
		if not is_instance_valid(current_target) or not _is_valid_enemy(current_target):
			current_target = body
			print("[%s] Player target acquired: %s" % [team, body.name])

func _on_enemy_exited(body):
	if body == current_target:
		print("[%s] Target left detection range: %s" % [team, body.name])
		current_target = null
		_find_new_target()

# Check if a body is a valid enemy (no distance check)
func _is_valid_enemy(body) -> bool:
	if body == self:
		return false
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

# Check if a body is a valid enemy within attack range
func _is_valid_target(body) -> bool:
	if not _is_valid_enemy(body):
		return false
	if global_position.distance_to(body.global_position) > attack_range:
		return false
	return true

func _find_new_target():
	current_target = null
	var best_dist = attack_range + 1
	
	# Scan all minions
	for body in get_tree().get_nodes_in_group("minions"):
		if _is_valid_target(body):
			var dist = global_position.distance_to(body.global_position)
			if dist < best_dist:
				best_dist = dist
				current_target = body
	
	# Scan all players
	for body in get_tree().get_nodes_in_group("players"):
		if _is_valid_target(body):
			var dist = global_position.distance_to(body.global_position)
			if dist < best_dist:
				best_dist = dist
				current_target = body
	
	# Scan all bases
	for body in get_tree().get_nodes_in_group("bases"):
		if _is_valid_target(body):
			var dist = global_position.distance_to(body.global_position)
			if dist < best_dist:
				best_dist = dist
				current_target = body

func _input(event):
	if not is_multiplayer_authority() or is_dead:
		return
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			target_position = get_global_mouse_position()
			moving = true
	elif event is InputEventScreenTouch:
		if event.pressed:
			target_position = event.position
			moving = true

func shoot_at(target: Node2D):
	var dir = (target.global_position - global_position).normalized()
	var spawn_pos = global_position + dir * 25
	_do_spawn_bullet(team, dir, spawn_pos)
	if multiplayer.has_multiplayer_peer():
		_rpc_spawn_bullet.rpc(team, dir, spawn_pos)

@rpc("any_peer", "reliable")
func _rpc_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos_arg: Vector2):
	_do_spawn_bullet(bullet_team, dir, spawn_pos_arg)

func _do_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos_arg: Vector2):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var bullet = scene.instantiate()
	bullet.team = bullet_team
	bullet.direction = dir
	bullet.rotation = dir.angle()
	bullet.global_position = spawn_pos_arg
	get_parent().add_child(bullet)

func _physics_process(delta):
	# Handle respawn timer
	if is_dead:
		if is_multiplayer_authority():
			respawn_timer -= delta
			if respawn_timer <= 0:
				_respawn()
		return
	
	# Auto-shoot at current target (authority only)
	if is_multiplayer_authority():
		if is_instance_valid(current_target) and _is_valid_enemy(current_target):
			attack_timer -= delta
			if attack_timer <= 0:
				shoot_at(current_target)
				attack_timer = fire_rate
		else:
			current_target = null
			attack_timer = 0.0
			_find_new_target()
		
		# Movement
		if moving:
			var direction = (target_position - global_position).normalized()
			var distance = global_position.distance_to(target_position)
			
			if distance > 5:
				velocity = direction * speed
				var target_angle = direction.angle()
				rotation = lerp_angle(rotation, target_angle, rotation_speed * delta)
				move_and_slide()
			else:
				moving = false
				velocity = Vector2.ZERO
		elif is_instance_valid(current_target):
			var dir = (current_target.global_position - global_position).normalized()
			rotation = lerp_angle(rotation, dir.angle(), rotation_speed * delta)
