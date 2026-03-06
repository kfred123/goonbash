extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0
@export var attack_range: float = 250.0
@export var fire_rate: float = 0.5

var team: String = "blue"
var target_position: Vector2 = Vector2.ZERO
var moving: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0

func get_team():
	return team

func set_team(t: String):
	team = t
	if has_node("Polygon2D"):
		if team == "blue":
			$Polygon2D.color = Color(0.2, 0.6, 1.0, 1.0)
		else:
			$Polygon2D.color = Color(0.9, 0.3, 0.3, 1.0)

func _ready():
	target_position = global_position
	
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

func _on_enemy_entered(body):
	if body.has_method("get_team") and body.get_team() != team:
		if not is_instance_valid(current_target):
			current_target = body

func _on_enemy_exited(body):
	if body == current_target:
		current_target = null
		_find_new_target()

func _find_new_target():
	if not has_node("DetectionArea"):
		return
	for body in $DetectionArea.get_overlapping_bodies():
		if body.has_method("get_team") and body.get_team() != team:
			current_target = body
			return

func _input(event):
	if not is_multiplayer_authority():
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
func _rpc_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	_do_spawn_bullet(bullet_team, dir, spawn_pos)

func _do_spawn_bullet(bullet_team: String, dir: Vector2, spawn_pos: Vector2):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var bullet = scene.instantiate()
	bullet.team = bullet_team
	bullet.direction = dir
	bullet.rotation = dir.angle()
	bullet.global_position = spawn_pos
	get_parent().add_child(bullet)

func _physics_process(delta):
	# Auto-shoot at current target (authority only)
	if is_multiplayer_authority():
		if is_instance_valid(current_target):
			attack_timer -= delta
			if attack_timer <= 0:
				shoot_at(current_target)
				attack_timer = fire_rate
		else:
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
