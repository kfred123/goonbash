extends Area2D

@export var speed: float = 600.0
@export var damage: float = 10.0
@export var homing: bool = false
@export var turn_speed: float = 5.0

var direction: Vector2 = Vector2.ZERO
var team: String = ""
var target: Node2D = null

func _ready():
	body_entered.connect(_on_body_entered)
	if has_node("VisibleOnScreenNotifier2D"):
		$VisibleOnScreenNotifier2D.screen_exited.connect(_on_visible_on_screen_notifier_2d_screen_exited)
		
	if homing:
		# Homing rockets have a long lifespan and might go offscreen
		var timer = get_tree().create_timer(10.0)
		timer.timeout.connect(queue_free)

func _physics_process(delta):
	if homing:
		turn_speed += delta * 15.0 # Gradually increase turn speed to prevent endless orbiting
		if is_instance_valid(target) and not target.get("is_dead"):
			var desired_dir = (target.global_position - global_position).normalized()
			var new_angle = lerp_angle(direction.angle(), desired_dir.angle(), turn_speed * delta)
			direction = Vector2(cos(new_angle), sin(new_angle))
			rotation = new_angle
	position += direction * speed * delta

func _on_body_entered(body):
	# Only process damage on the server (or singleplayer) to prevent double hits
	if multiplayer.has_multiplayer_peer() and not multiplayer.is_server():
		queue_free()
		return
	
	# Ignore teammates
	if body.has_method("get_team"):
		var body_team = body.get_team()
		if body_team == team:
			return
		
		if body.has_method("take_damage"):
			body.take_damage(damage)
			print("Bullet (%s) HIT %s on team %s" % [team, body.name, body_team])
	else:
		print("Bullet (%s) HIT unknown body: %s" % [team, body.name])
	
	queue_free()

func _on_visible_on_screen_notifier_2d_screen_exited():
	if not homing:
		queue_free()
