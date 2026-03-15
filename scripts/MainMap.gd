extends Node2D

const BLUE_SPAWN = Vector2(200, 360)
const RED_SPAWN = Vector2(1080, 360)
const SPAWN_SPREAD = 60.0

func _ready():
	# Small delay to ensure all peers have loaded the scene
	await get_tree().create_timer(0.3).timeout
	_spawn_players()

func _spawn_players():
	var tank_scene = ResourceLoader.load("res://scenes/PlayerTank.tscn")
	if not tank_scene:
		print("[MainMap] ERROR: Could not load PlayerTank.tscn")
		return
	
	var blue_index = 0
	var red_index = 0
	
	for peer_id in NetworkManager.players:
		var info = NetworkManager.players[peer_id]
		var tank = tank_scene.instantiate()
		tank.name = "Player_%d" % peer_id
		
		# Position based on team with spread
		if info["team"] == "blue":
			tank.position = BLUE_SPAWN + Vector2(0, (blue_index - 1) * SPAWN_SPREAD)
			blue_index += 1
		else:
			tank.position = RED_SPAWN + Vector2(0, (red_index - 1) * SPAWN_SPREAD)
			red_index += 1
		
		tank.set_role(info["role"])
		tank.set_team(info["team"])
		add_child(tank)
		
		# Each player controls their own tank
		tank.set_multiplayer_authority(peer_id)
		
		print("[MainMap] Spawned %s (ID:%d) as %s on %s team" % [info["name"], peer_id, info["role"], info["team"]])
	
	print("[MainMap] Total players spawned: %d" % NetworkManager.players.size())
