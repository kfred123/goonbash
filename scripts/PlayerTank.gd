extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0
@export var attack_range: float = 150.0
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

# --- Ability System ---
var ability_points: int = 0  # Points available to upgrade abilities

# Repair ability (healer only)
var repair_unlocked: bool = false
var repair_level: int = 0  # 0 = locked, 1+ = usable levels
const REPAIR_MAX_LEVEL: int = 4
const REPAIR_BASE_HEAL_RATE: float = 10.0  # HP/sec at level 1
const REPAIR_HEAL_PER_LEVEL: float = 5.0  # Extra HP/sec per upgrade
const REPAIR_DURATION: float = 10.0
const REPAIR_COOLDOWN: float = 30.0
const REPAIR_RANGE: float = 200.0

var repair_active: bool = false
var repair_timer: float = 0.0
var repair_cooldown_timer: float = 0.0
var wrench_node: Node2D = null
var repair_heal_sync_timer: float = 0.0

# Shield ability (tank only)
var shield_unlocked: bool = false
var shield_level: int = 0  # 0 = locked, 1+ = usable levels
const SHIELD_MAX_LEVEL: int = 10
const SHIELD_BASE_DURATION: float = 8.0
const SHIELD_DURATION_PER_LEVEL: float = 1.0  # +1s per level above 1
const SHIELD_COOLDOWN: float = 30.0
const SHIELD_BASE_REDUCTION: float = 0.20  # 20% at level 1
const SHIELD_REDUCTION_PER_LEVEL: float = 0.05  # +5% per level

var shield_active: bool = false
var shield_timer: float = 0.0
var shield_cooldown_timer: float = 0.0
var shield_node: Node2D = null
var shield_pulse_time: float = 0.0

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
			attack_range = 150.0
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
			attack_range = 200.0
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
	
	# Initialize ability state
	_init_abilities()
	
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
	# Apply shield damage reduction
	if shield_active and shield_level > 0:
		var reduction = get_shield_reduction()
		amount *= (1.0 - reduction)
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
	# Cancel any active repair
	if repair_active:
		repair_active = false
		repair_timer = 0.0
		_remove_wrench_visual()
	# Cancel any active shield
	if shield_active:
		shield_active = false
		shield_timer = 0.0
		_remove_shield_visual()
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
	# Reset ability cooldowns on respawn
	repair_cooldown_timer = 0.0
	shield_cooldown_timer = 0.0
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
	# Ability activation
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode == KEY_1:
			if role == "healer":
				_try_activate_repair()
			elif role == "tank":
				_try_activate_shield()

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
		
		# Repair ability active healing
		if repair_active:
			_process_repair_healing(delta)
			repair_timer -= delta
			if repair_timer <= 0:
				_deactivate_repair()
		
		# Repair cooldown countdown
		if repair_cooldown_timer > 0:
			repair_cooldown_timer -= delta
			if repair_cooldown_timer < 0:
				repair_cooldown_timer = 0.0
		
		# Shield ability active
		if shield_active:
			shield_timer -= delta
			if shield_timer <= 0:
				_deactivate_shield()
		
		# Shield cooldown countdown
		if shield_cooldown_timer > 0:
			shield_cooldown_timer -= delta
			if shield_cooldown_timer < 0:
				shield_cooldown_timer = 0.0
	
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
	
	# Rotate wrench visual if active
	if is_instance_valid(wrench_node) and repair_active:
		wrench_node.rotation += 4.0 * PI * delta  # ~2 revolutions/sec
	
	# Pulse shield visual if active
	if is_instance_valid(shield_node) and shield_active:
		shield_pulse_time += delta
		var pulse = 1.0 + 0.08 * sin(shield_pulse_time * 4.0)
		shield_node.scale = Vector2(pulse, pulse)

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
	var old_level = level
	while level < XP_THRESHOLDS.size() and experience >= XP_THRESHOLDS[level]:
		level += 1
		max_health += 20.0
		health = max_health
		damage += 2.0
		if is_instance_valid(health_bar):
			health_bar.max_value = max_health
			health_bar.value = health
		print("[%s] LEVEL UP! Now level %d (HP: %d, DMG: %d)" % [team, level, max_health, damage])
	# Grant ability points for each level gained
	var levels_gained = level - old_level
	if levels_gained > 0:
		# Grant 1 ability point per level gained
		ability_points += levels_gained
		print("[%s] Gained %d ability point(s)! Total: %d" % [team, levels_gained, ability_points])
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

# --- Ability System Implementation ---

func _init_abilities():
	# Reset ability state based on role
	repair_unlocked = false
	repair_level = 0
	repair_active = false
	repair_timer = 0.0
	repair_cooldown_timer = 0.0
	shield_unlocked = false
	shield_level = 0
	shield_active = false
	shield_timer = 0.0
	shield_cooldown_timer = 0.0
	ability_points = 0

func _try_activate_repair():
	if role != "healer":
		return
	if not repair_unlocked or repair_level <= 0:
		return
	if repair_active:
		return
	if repair_cooldown_timer > 0:
		return
	_activate_repair()
	# Sync to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_activate_repair.rpc()

func _activate_repair():
	repair_active = true
	repair_timer = REPAIR_DURATION
	repair_cooldown_timer = REPAIR_COOLDOWN
	_create_wrench_visual()
	print("[%s] Repair activated! Level %d, healing for %ds" % [team, repair_level, REPAIR_DURATION])

func _deactivate_repair():
	repair_active = false
	repair_timer = 0.0
	_remove_wrench_visual()
	print("[%s] Repair ended." % team)
	# Sync deactivation
	if multiplayer.has_multiplayer_peer() and is_multiplayer_authority():
		_rpc_deactivate_repair.rpc()

func _process_repair_healing(delta: float):
	var heal_rate = REPAIR_BASE_HEAL_RATE + (repair_level - 1) * REPAIR_HEAL_PER_LEVEL
	var heal_amount = heal_rate * delta
	
	# Heal self
	if health < max_health:
		health = min(health + heal_amount, max_health)
		if is_instance_valid(health_bar):
			health_bar.value = health
	
	# Heal nearby same-team units
	var groups_to_heal = ["players", "minions", "towers", "bases"]
	for group_name in groups_to_heal:
		for unit in get_tree().get_nodes_in_group(group_name):
			if unit == self:
				continue
			if not is_instance_valid(unit):
				continue
			if not unit.has_method("get_team") or unit.get_team() != team:
				continue
			if unit.get("is_dead") == true:
				continue
			var dist = global_position.distance_to(unit.global_position)
			if dist <= REPAIR_RANGE:
				_heal_unit(unit, heal_amount)
	
	# Sync health periodically
	repair_heal_sync_timer -= delta
	if repair_heal_sync_timer <= 0:
		repair_heal_sync_timer = 0.5
		if multiplayer.has_multiplayer_peer():
			_rpc_sync_health.rpc(health)

func _heal_unit(unit: Node, amount: float):
	if unit.has_method("receive_heal"):
		unit.receive_heal(amount)
	elif "health" in unit and "max_health" in unit:
		unit.health = min(unit.health + amount, unit.max_health)
		var hbar = unit.get("health_bar")
		if is_instance_valid(hbar):
			hbar.value = unit.health

func receive_heal(amount: float):
	if is_dead:
		return
	health = min(health + amount, max_health)
	if is_instance_valid(health_bar):
		health_bar.value = health

func upgrade_repair() -> bool:
	if role != "healer":
		return false
	if repair_level >= REPAIR_MAX_LEVEL:
		return false
	if ability_points <= 0:
		return false
	ability_points -= 1
	repair_level += 1
	if not repair_unlocked:
		repair_unlocked = true
		print("[%s] Repair ability UNLOCKED! (Level %d)" % [team, repair_level])
	else:
		print("[%s] Repair upgraded to level %d! Heal rate: %d HP/s" % [team, repair_level, REPAIR_BASE_HEAL_RATE + (repair_level - 1) * REPAIR_HEAL_PER_LEVEL])
	# Sync upgrade to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_ability_state.rpc(repair_level, shield_level, ability_points)
	return true

# --- Shield Ability (Tank) ---

func get_shield_reduction() -> float:
	return SHIELD_BASE_REDUCTION + (shield_level - 1) * SHIELD_REDUCTION_PER_LEVEL

func get_shield_duration() -> float:
	return SHIELD_BASE_DURATION + (shield_level - 1) * SHIELD_DURATION_PER_LEVEL

func _try_activate_shield():
	if role != "tank":
		return
	if not shield_unlocked or shield_level <= 0:
		return
	if shield_active:
		return
	if shield_cooldown_timer > 0:
		return
	_activate_shield()
	# Sync to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_activate_shield.rpc()

func _activate_shield():
	shield_active = true
	shield_timer = get_shield_duration()
	shield_cooldown_timer = SHIELD_COOLDOWN
	shield_pulse_time = 0.0
	_create_shield_visual()
	print("[%s] Shield activated! Level %d, reduction %d%%, duration %ds" % [team, shield_level, int(get_shield_reduction() * 100), int(get_shield_duration())])

func _deactivate_shield():
	shield_active = false
	shield_timer = 0.0
	_remove_shield_visual()
	print("[%s] Shield ended." % team)
	# Sync deactivation
	if multiplayer.has_multiplayer_peer() and is_multiplayer_authority():
		_rpc_deactivate_shield.rpc()

func upgrade_shield() -> bool:
	if role != "tank":
		return false
	if shield_level >= SHIELD_MAX_LEVEL:
		return false
	if ability_points <= 0:
		return false
	ability_points -= 1
	shield_level += 1
	if not shield_unlocked:
		shield_unlocked = true
		print("[%s] Shield ability UNLOCKED! (Level %d)" % [team, shield_level])
	else:
		print("[%s] Shield upgraded to level %d! Reduction: %d%%, Duration: %ds" % [team, shield_level, int(get_shield_reduction() * 100), int(get_shield_duration())])
	# Sync upgrade to all peers
	if multiplayer.has_multiplayer_peer():
		_rpc_sync_ability_state.rpc(repair_level, shield_level, ability_points)
	return true

# --- Shield Visual Effect ---

func _create_shield_visual():
	if is_instance_valid(shield_node):
		return
	
	shield_node = Node2D.new()
	shield_node.name = "ShieldEffect"
	shield_node.z_index = 4
	
	# Hexagonal shield shape
	var shield_poly = Polygon2D.new()
	var points = PackedVector2Array()
	var radius = 38.0
	for i in range(6):
		var angle = i * TAU / 6.0 - PI / 6.0
		points.append(Vector2(cos(angle) * radius, sin(angle) * radius))
	shield_poly.polygon = points
	
	# Team-colored semi-transparent
	if team == "blue":
		shield_poly.color = Color(0.3, 0.6, 1.0, 0.2)
	else:
		shield_poly.color = Color(1.0, 0.4, 0.3, 0.2)
	shield_node.add_child(shield_poly)
	
	# Shield border ring (Line2D for outline)
	var border = Line2D.new()
	for i in range(7):  # 7 points to close the hexagon
		var angle = i * TAU / 6.0 - PI / 6.0
		border.add_point(Vector2(cos(angle) * radius, sin(angle) * radius))
	border.width = 2.0
	if team == "blue":
		border.default_color = Color(0.4, 0.7, 1.0, 0.6)
	else:
		border.default_color = Color(1.0, 0.5, 0.4, 0.6)
	shield_node.add_child(border)
	
	add_child(shield_node)

func _remove_shield_visual():
	if is_instance_valid(shield_node):
		shield_node.queue_free()
		shield_node = null

# --- Wrench Visual Effect ---

func _create_wrench_visual():
	if is_instance_valid(wrench_node):
		return
	
	wrench_node = Node2D.new()
	wrench_node.name = "WrenchEffect"
	wrench_node.position = Vector2(0, -50)
	wrench_node.z_index = 5
	
	# Wrench head (open-end wrench shape)
	var head = Polygon2D.new()
	head.polygon = PackedVector2Array([
		Vector2(-8, -3), Vector2(-4, -7), Vector2(0, -7), Vector2(2, -5),
		Vector2(2, -3), Vector2(8, -3), Vector2(8, 3),
		Vector2(2, 3), Vector2(2, 5), Vector2(0, 7), Vector2(-4, 7), Vector2(-8, 3)
	])
	head.color = Color(0.75, 0.75, 0.8, 0.9)  # Silver metallic
	wrench_node.add_child(head)
	
	# Wrench handle
	var handle = Polygon2D.new()
	handle.polygon = PackedVector2Array([
		Vector2(-3, -2), Vector2(14, -2), Vector2(14, 2), Vector2(-3, 2)
	])
	handle.color = Color(0.6, 0.6, 0.65, 0.9)
	handle.position = Vector2(6, 0)
	wrench_node.add_child(handle)
	
	# Green heal glow circle behind wrench
	var glow = Polygon2D.new()
	var glow_points = PackedVector2Array()
	for i in range(16):
		var angle = i * TAU / 16.0
		glow_points.append(Vector2(cos(angle) * 14, sin(angle) * 14))
	glow.polygon = glow_points
	glow.color = Color(0.2, 0.9, 0.4, 0.25)
	glow.z_index = -1
	wrench_node.add_child(glow)
	
	add_child(wrench_node)

func _remove_wrench_visual():
	if is_instance_valid(wrench_node):
		wrench_node.queue_free()
		wrench_node = null

# --- Ability RPCs ---

@rpc("any_peer", "reliable")
func _rpc_activate_repair():
	_activate_repair()

@rpc("any_peer", "reliable")
func _rpc_deactivate_repair():
	repair_active = false
	repair_timer = 0.0
	_remove_wrench_visual()

@rpc("any_peer", "reliable")
func _rpc_activate_shield():
	_activate_shield()

@rpc("any_peer", "reliable")
func _rpc_deactivate_shield():
	shield_active = false
	shield_timer = 0.0
	_remove_shield_visual()

@rpc("any_peer", "reliable")
func _rpc_sync_ability_state(new_repair_level: int, new_shield_level: int, new_ability_points: int):
	repair_level = new_repair_level
	repair_unlocked = repair_level > 0
	shield_level = new_shield_level
	shield_unlocked = shield_level > 0
	ability_points = new_ability_points
