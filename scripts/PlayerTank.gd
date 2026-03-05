extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0
@export var attack_range: float = 250.0
@export var fire_rate: float = 0.5

func get_team():
	return "blue"

var target_position: Vector2 = Vector2.ZERO
var moving: bool = false
var current_target: Node2D = null
var attack_timer: float = 0.0

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

func _on_enemy_entered(body):
	if body.has_method("get_team") and body.get_team() != "blue":
		if not is_instance_valid(current_target):
			current_target = body

func _on_enemy_exited(body):
	if body == current_target:
		current_target = null
		_find_new_target()

func _find_new_target():
	var detection = $DetectionArea
	if not detection:
		return
	for body in detection.get_overlapping_bodies():
		if body.has_method("get_team") and body.get_team() != "blue":
			current_target = body
			return

func _input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			target_position = get_global_mouse_position()
			moving = true
	elif event is InputEventScreenTouch:
		if event.pressed:
			target_position = event.position
			moving = true

func shoot_at(target: Node2D):
	var scene = ResourceManager.bullet_scene
	if not scene:
		return
	var bullet = scene.instantiate()
	bullet.team = "blue"
	bullet.direction = (target.global_position - global_position).normalized()
	bullet.rotation = bullet.direction.angle()
	bullet.global_position = global_position + bullet.direction * 25
	get_parent().add_child(bullet)

func _physics_process(delta):
	# Auto-shoot at current target
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
			
			# Smooth rotation towards target
			var target_angle = direction.angle()
			rotation = lerp_angle(rotation, target_angle, rotation_speed * delta)
			
			move_and_slide()
		else:
			moving = false
			velocity = Vector2.ZERO
	elif is_instance_valid(current_target):
		# Face the target when not moving
		var dir = (current_target.global_position - global_position).normalized()
		rotation = lerp_angle(rotation, dir.angle(), rotation_speed * delta)
