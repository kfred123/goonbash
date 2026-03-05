extends Area2D

@export var speed: float = 600.0
@export var damage: float = 10.0

var direction: Vector2 = Vector2.ZERO
var team: String = ""

func _ready():
	body_entered.connect(_on_body_entered)
	if has_node("VisibleOnScreenNotifier2D"):
		$VisibleOnScreenNotifier2D.screen_exited.connect(_on_visible_on_screen_notifier_2d_screen_exited)

func _physics_process(delta):
	position += direction * speed * delta

func _on_body_entered(body):
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
	queue_free()
