extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0
@export var attack_range: float = 250.0
@export var fire_rate: float = 0.5
@export var max_health: float = 100.0

var team: String = "blue"
var role: String = "tank"
var health: float = 100.0
var damage: float = 10.0
var target_position: Vector2 = Vector2.ZERO
var moving: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0
var spawn_position: Vector2 = Vector2.ZERO
var is_dead: bool = false
var respawn_timer: float = 0.0
const RESPAWN_TIME: float = 3.0
var health_regen_rate: float = 2.0  # HP per second (very slow)
var regen_sync_timer: float = 0.0
const REGEN_SYNC_INTERVAL: float = 1.0

# Leveling
var level: int = 1
var experience: float = 0.0
const XP_THRESHOLDS = [0, 100, 250, 500, 850, 1300]
const XP_PER_MINION: float = 30.0
const XP_PER_PLAYER: float = 100.0
const XP_PER_TOWER: float = 50.0

@onready var health_bar = $HealthBar
@onready var turret = $Turret
@onready var level_label = $LevelLabel

func get_team():
	return team

# --- Tank body shapes per role ---
const TANK_BODY = [Vector2(-20, -15), Vector2(20, -15), Vector2(25, -10), Vector2(25, 10), Vector2(20, 15), Vector2(-20, 15), Vector2(-25, 10), Vector2(-25, -10)]
const TANK_BARREL = [Vector2(-3, -5), Vector2(35, -4), Vector2(35, 4), Vector2(-3, 5)]
const TANK_TURRET_BASE = [Vector2(-10, -10), Vector2(10, -10), Vector2(10, 10), Vector2(-10, 10)]

const HEALER_BODY = [Vector2(-15, -12), Vector2(15, -12), Vector2(18, -6), Vector2(18, 6), Vector2(15, 12), Vector2(-15, 12), Vector2(-18, 6), Vector2(-18, -6)]
const HEALER_BARREL = [Vector2(-2, -3), Vector2(30, -2), Vector2(30, 2), Vector2(-2, 3)]
const HEALER_TURRET_BASE = [Vector2(-7, -7), Vector2(7, -7), Vector2(7, 7), Vector2(-7, 7)]

func set_role(r: String):
	role = r
	match role:
		"tank":
			max_health = 200.0
			speed = 250.0
			fire_rate = 0.8
			attack_range = 200.0
			damage = 12.0
			if has_node("Body"):
				$Body.polygon = TANK_BODY
			if has_node("CollisionPolygon2D"):
				$CollisionPolygon2D.polygon = TANK_BODY
			if has_node("Turret/Barrel"):
				$Turret/Barrel.polygon = TANK_BARREL
			if has_node("Turret/TurretBase"):
				$Turret/TurretBase.polygon = TANK_TURRET_BASE
		"healer":
			max_health = 60.0
			speed = 350.0
			fire_rate = 1.0
			attack_range = 300.0
			damage = 8.0
			if has_node("Body"):
				$Body.polygon = HEALER_BODY
			if has_node("CollisionPolygon2D"):
				$CollisionPolygon2D.polygon = HEALER_BODY
			if has_node("Turret/Barrel"):
				$Turret/Barrel.polygon = HEALER_BARREL
			if has_node("Turret/TurretBase"):
				$Turret/TurretBase.polygon = HEALER_TURRET_BASE
	health = max_health
	_apply_team_color()

func set_team(t: String):
	team = t
	_apply_team_color()

func _apply_team_color():
	var body_color: Color
	var turret_color: Color
	var turret_base_color: Color
	if team == "blue":
		match role:
			"tank":
				body_color = Color(0.15, 0.4, 0.9)
				turret_color = Color(0.2, 0.5, 0.95)
				turret_base_color = Color(0.1, 0.3, 0.7)
			"healer":
				body_color = Color(0.2, 0.75, 0.55)
				turret_color = Color(0.25, 0.85, 0.65)
				turret_base_color = Color(0.15, 0.6, 0.45)
	else:
		match role:
			"tank":
				body_color = Color(0.9, 0.2, 0.15)
				turret_color = Color(0.95, 0.3, 0.2)
				turret_base_color = Color(0.7, 0.15, 0.1)
			"healer":
				body_color = Color(0.9, 0.55, 0.15)
				turret_color = Color(0.95, 0.65, 0.2)
				turret_base_color = Color(0.7, 0.45, 0.1)
	if has_node("Body"):
		$Body.color = body_color
	if has_node("Turret/Barrel"):
		$Turret/Barrel.color = turret_color
	if has_node("Turret/TurretBase"):
		$Turret/TurretBase.color = turret_base_color

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
	
	# Setup level label
	_update_level_label()
	
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
	
	# Setup multiplayer sync for position, body rotation, and turret rotation
	if multiplayer.has_multiplayer_peer():
		var sync = MultiplayerSynchronizer.new()
		sync.name = "MultiplayerSync"
		var config = SceneReplicationConfig.new()
		config.add_property(NodePath(".:position"))
		config.add_property(NodePath(".:rotation"))
		if has_node("Turret"):
			config.add_property(NodePath("Turret:rotation"))
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
		# Grant XP to nearby enemy players
		_grant_xp_to_nearby_enemies(XP_PER_PLAYER)

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
	rotation = PI if team == "red" else 0.0
	if is_instance_valid(turret):
		turret.rotation = 0.0
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

func _on_enemy_exited(body):
	if body == current_target:
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
	
	# Scan all towers
	for body in get_tree().get_nodes_in_group("towers"):
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
	# Spawn bullet from turret tip
	var barrel_length = 35.0 if role == "tank" else 30.0
	var spawn_pos = global_position + dir * barrel_length
	_do_spawn_bullet(team, dir, spawn_pos, damage)
	if multiplayer.has_multiplayer_peer():
		_rpc_spawn_bullet.rpc(team, dir, spawn_pos, damage)

@rpc("any_peer", "reliable")
func _rpc_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos_arg: Vector2, bullet_damage: float):
	_do_spawn_bullet(bullet_team, dir, spawn_pos_arg, bullet_damage)

func _do_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos_arg: Vector2, bullet_damage: float):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var bullet = scene.instantiate()
	bullet.team = bullet_team
	bullet.direction = dir
	bullet.damage = bullet_damage
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
		
		# Movement — body rotates with movement direction
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
		
		# Passive health regeneration
		if health < max_health:
			health = min(health + health_regen_rate * delta, max_health)
			if is_instance_valid(health_bar):
				health_bar.value = health
			regen_sync_timer -= delta
			if regen_sync_timer <= 0:
				regen_sync_timer = REGEN_SYNC_INTERVAL
				if multiplayer.has_multiplayer_peer():
					_rpc_sync_health.rpc(health)
	
	# Turret rotation — always aims at current target (runs on all peers for visual)
	if is_instance_valid(turret):
		if is_instance_valid(current_target) and _is_valid_enemy(current_target):
			var aim_dir = (current_target.global_position - global_position).normalized()
			var aim_angle = aim_dir.angle()
			# Turret rotation is relative to body, so subtract body rotation
			var relative_angle = aim_angle - rotation
			turret.rotation = lerp_angle(turret.rotation, relative_angle, 8.0 * delta)
		elif not moving:
			# Return turret to forward position when idle
			turret.rotation = lerp_angle(turret.rotation, 0.0, 3.0 * delta)

# --- Leveling System ---

func gain_experience(amount: float):
	if is_dead:
		return
	experience += amount
	_check_level_up()
	# Sync to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_xp.rpc(experience, level)

func _check_level_up():
	while level < XP_THRESHOLDS.size() and experience >= XP_THRESHOLDS[level]:
		level += 1
		max_health += 20.0
		health = max_health
		damage += 2.0
		if is_instance_valid(health_bar):
			health_bar.max_value = max_health
			health_bar.value = health
		print("[%s] LEVEL UP! Now level %d (HP: %d, DMG: %d)" % [team, level, max_health, damage])
	_update_level_label()

func _update_level_label():
	if is_instance_valid(level_label):
		if level > 1:
			level_label.text = "Lv%d" % level
			level_label.add_theme_font_size_override("font_size", 10)
			if team == "blue":
				level_label.add_theme_color_override("font_color", Color(0.6, 0.8, 1.0))
			else:
				level_label.add_theme_color_override("font_color", Color(1.0, 0.7, 0.6))
		else:
			level_label.text = ""

@rpc("any_peer", "reliable")
func _rpc_sync_xp(new_xp: float, new_level: int):
	experience = new_xp
	level = new_level
	_update_level_label()
	if is_instance_valid(health_bar):
		health_bar.max_value = max_health
		health_bar.value = health

func _grant_xp_to_nearby_enemies(xp_amount: float):
	# Called when this entity dies — grant XP to enemy players in range
	for player in get_tree().get_nodes_in_group("players"):
		if player == self:
			continue
		if player.get_team() == team:
			continue
		if player.get("is_dead") == true:
			continue
		var dist = global_position.distance_to(player.global_position)
		if dist <= 400.0:  # XP grant range
			if player.has_method("gain_experience"):
				player.gain_experience(xp_amount)

func get_xp_progress() -> float:
	if level >= XP_THRESHOLDS.size():
		return 1.0
	var current_threshold = XP_THRESHOLDS[level - 1] if level > 1 else 0.0
	var next_threshold = XP_THRESHOLDS[level] if level < XP_THRESHOLDS.size() else current_threshold
	if next_threshold == current_threshold:
		return 1.0
	return (experience - current_threshold) / (next_threshold - current_threshold)
