extends CharacterBody2D

@export var speed: float = 300.0
@export var rotation_speed: float = 5.0

func get_team():
	return "blue"

var bullet_scene: PackedScene = load("res://scenes/Bullet.tscn")

var target_position: Vector2 = Vector2.ZERO
var moving: bool = false

func _ready():
	target_position = global_position

func _input(event):
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			target_position = get_global_mouse_position()
			moving = true
		elif event.button_index == MOUSE_BUTTON_RIGHT and event.pressed:
			shoot()
	elif event is InputEventScreenTouch:
		if event.pressed:
			# If touch is far from tank, move. If close, maybe shoot? 
			# For simplicity, let's say tap to move.
			target_position = event.position
			moving = true

func shoot():
	if not bullet_scene:
		return
	var bullet = bullet_scene.instantiate()
	bullet.global_position = global_position
	bullet.team = "blue"
	bullet.direction = (get_global_mouse_position() - global_position).normalized()
	bullet.rotation = bullet.direction.angle()
	get_parent().add_child(bullet)

func _physics_process(delta):
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
