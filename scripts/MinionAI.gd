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
	if not is_instance_valid(current_target):
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
	var scene = ResourceManager.bullet_scene
	if not scene: 
		print("[%s] ERROR: ResourceManager bullet_scene is NULL" % team)
		return
	var b = scene.instantiate()
	b.team = team
	b.direction = (current_target.global_position - global_position).normalized()
	b.rotation = b.direction.angle()
	# Spawn slightly in front of the minion
	b.global_position = global_position + b.direction * 25
	get_parent().add_child(b)
	print("[%s] Bullet fired at %s" % [team, current_target.name])

func _find_new_target():
	var bodies = $DetectionArea.get_overlapping_bodies()
	for body in bodies:
		if body != self and body.has_method("get_team") and body.get_team() != team:
			current_target = body
			current_state = State.ATTACKING
			print("[%s] Found target: %s" % [team, body.name])
			break

func _on_detection_area_body_entered(body):
	if body != self and body.has_method("get_team") and body.get_team() != team:
		if not is_instance_valid(current_target):
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
		
	# Initialize bullet scene here to ensure it's loaded
	# Removed local loading of bullet_scene and associated print statements.

func _process(_delta):
	if is_instance_valid(health_bar):
		health_bar.global_position = global_position + Vector2(-20, -30)

func take_damage(amount: float):
	health -= amount
	if is_instance_valid(health_bar):
		health_bar.value = health
	if health <= 0:
		if is_instance_valid(health_bar):
			health_bar.queue_free()
		queue_free()
