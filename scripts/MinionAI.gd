extends CharacterBody2D

@export var speed: float = 150.0
@export var health: float = 50.0
@export var attack_range: float = 200.0
@export var fire_rate: float = 1.0
var bullet_scene: PackedScene = null

enum State { MOVING, ATTACKING }
var current_state: State = State.MOVING

var target_lane: Path2D = null
var team: String = ""
var path_offset: float = 0.0
var direction_multiplier: float = 1.0

var current_target: Node2D = null
var attack_timer: float = 0.0
var is_dead: bool = false

func setup_lane(lane: Path2D, t: String):
	target_lane = lane
	team = t
	if team == "red":
		path_offset = target_lane.curve.get_baked_length()
		direction_multiplier = -1.0
		$Polygon2D.color = Color(0.9, 0.2, 0.2, 1.0)
	else:
		path_offset = 0.0
		direction_multiplier = 1.0
		$Polygon2D.color = Color(0.2, 0.5, 1.0, 1.0)

func get_team():
	return team

func _physics_process(delta):
	if is_dead:
		return
	# Only run AI on the server (or singleplayer)
	if multiplayer.has_multiplayer_peer() and not multiplayer.is_server():
		return
	
	match current_state:
		State.MOVING:
			handle_moving_state(delta)
		State.ATTACKING:
			handle_attacking_state(delta)

func handle_moving_state(delta):
	if not target_lane:
		return

	path_offset += speed * delta * direction_multiplier
	
	var curve = target_lane.curve
	var next_pos = curve.sample_baked(path_offset)
	var move_dir = (next_pos - global_position).normalized()
	
	if move_dir.length() > 0:
		rotation = move_dir.angle()
	
	global_position = next_pos
	
	# Check for nearby enemies if we don't have a target
	if not is_instance_valid(current_target):
		_find_new_target()

	# Check if reached end of path
	if (direction_multiplier > 0 and path_offset >= curve.get_baked_length()) or \
	   (direction_multiplier < 0 and path_offset <= 0):
		pass

func handle_attacking_state(delta):
	if not is_instance_valid(current_target) or not _is_valid_target(current_target):
		current_target = null
		_find_new_target()
		if not is_instance_valid(current_target):
			current_state = State.MOVING
			return

	var dist = global_position.distance_to(current_target.global_position)
	if dist > attack_range + 50:
		current_target = null
		current_state = State.MOVING
		return

	# Rotate towards target
	var dir_to_target = (current_target.global_position - global_position).normalized()
	rotation = dir_to_target.angle()

	# Shoot
	attack_timer -= delta
	if attack_timer <= 0:
		print("[%s] Shooting at %s" % [team, current_target.name])
		shoot()
		attack_timer = fire_rate

func shoot():
	var dir = (current_target.global_position - global_position).normalized()
	var spawn_pos = global_position + dir * 25
	_do_spawn_bullet(team, dir, spawn_pos)
	if multiplayer.has_multiplayer_peer():
		_rpc_spawn_bullet.rpc(team, dir, spawn_pos)
	print("[%s] Bullet fired at %s" % [team, current_target.name])

@rpc("authority", "reliable")
func _rpc_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	_do_spawn_bullet(bullet_team, dir, spawn_pos)

func _do_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var b = scene.instantiate()
	b.team = bullet_team
	b.direction = dir
	b.rotation = dir.angle()
	b.global_position = spawn_pos
	get_parent().add_child(b)

func _is_valid_target(body) -> bool:
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

func _find_new_target():
	var best_target: Node2D = null
	var best_dist: float = INF
	for body in $DetectionArea.get_overlapping_bodies():
		if _is_valid_target(body):
			var dist = global_position.distance_to(body.global_position)
			if dist < best_dist:
				best_dist = dist
				best_target = body
	if best_target:
		current_target = best_target
		current_state = State.ATTACKING
		print("[%s] Found target: %s" % [team, best_target.name])

func _on_detection_area_body_entered(body):
	if _is_valid_target(body):
		if not is_instance_valid(current_target) or not _is_valid_target(current_target):
			current_target = body
			current_state = State.ATTACKING
			print("[%s] Enemy entered range: %s" % [team, body.name])

func _on_detection_area_body_exited(body):
	if body == current_target:
		current_target = null
		current_state = State.MOVING
		print("[%s] Target left range" % team)
		_find_new_target()

@onready var health_bar = $HealthBar

func _ready():
	add_to_group("minions")
	
	# Connect signals in code for stability
	if has_node("DetectionArea"):
		$DetectionArea.body_entered.connect(_on_detection_area_body_entered)
		$DetectionArea.body_exited.connect(_on_detection_area_body_exited)
	
	if is_instance_valid(health_bar):
		health_bar.max_value = health
		health_bar.value = health
		health_bar.top_level = true
	
	# Server is authority for all minions
	if multiplayer.has_multiplayer_peer():
		set_multiplayer_authority(1)
		var sync = MultiplayerSynchronizer.new()
		sync.name = "MultiplayerSync"
		var config = SceneReplicationConfig.new()
		config.add_property(NodePath(".:position"))
		config.add_property(NodePath(".:rotation"))
		config.add_property(NodePath(".:visible"))
		sync.replication_config = config
		add_child(sync)

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-20, -30)

func take_damage(amount: float):
	if is_dead:
		return
	health -= amount
	if is_instance_valid(health_bar):
		health_bar.value = health
	if health <= 0:
		_die()
		if multiplayer.has_multiplayer_peer():
			_rpc_sync_minion_death.rpc()

func _die():
	is_dead = true
	current_target = null
	current_state = State.MOVING
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	if is_instance_valid(health_bar):
		health_bar.visible = false
	# Delay queue_free so RPC has time to reach clients
	get_tree().create_timer(0.5).timeout.connect(queue_free)

@rpc("authority", "reliable")
func _rpc_sync_minion_death():
	is_dead = true
	current_target = null
	current_state = State.MOVING
	visible = false
	set_collision_layer_value(1, false)
	set_collision_layer_value(2, false)
	if is_instance_valid(health_bar):
		health_bar.visible = false
	# Clean up on client too
	get_tree().create_timer(0.5).timeout.connect(queue_free)
