extends StaticBody2D

@export var health: float = 500.0
@export var team: String = "red"

func get_team():
	return team
@export var spawn_rate: float = 5.0
var lane_index: int = 0

func _ready():
	if team == "red":
		add_to_group("enemy_base")
		$Polygon2D.color = Color(0.8, 0, 0)
	else:
		add_to_group("player_base")
		$Polygon2D.color = Color(0, 0, 0.8)
		
	# Spawn first minion once the tree is fully ready
	call_deferred("_on_spawn_timer_timeout")
	
	var timer = Timer.new()
	timer.wait_time = spawn_rate
	timer.autostart = true
	timer.timeout.connect(_on_spawn_timer_timeout)
	add_child(timer)

func _on_spawn_timer_timeout():
	var scene = ResourceManager.minion_scene
	if not scene:
		print("[%s] ERROR: ResourceManager minion_scene is NULL" % team)
		return

	var lanes = get_tree().get_nodes_in_group("lanes")
	if lanes.size() == 0:
		print("[%s] ERROR: No lanes found in group 'lanes'" % team)
		return
		
	var chosen_lane = lanes[lane_index % lanes.size()]
	lane_index += 1
	
	var minion = scene.instantiate()
	minion.global_position = global_position
	
	# Reverse the lane points if it's the enemy team (red)
	# For simplicity, we'll just pass the lane and the minion will handle it
	# Based on team, they either follow path forwards or backwards
	minion.setup_lane(chosen_lane, team)
	
	get_parent().add_child(minion)

func take_damage(amount: float):
	health -= amount
	if health <= 0:
		print("Base Destroyed!")
		# Handle game over logic
