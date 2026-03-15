extends Node2D

const BLUE_SPAWN = Vector2(200, 360)
const RED_SPAWN = Vector2(1080, 360)
const SPAWN_SPREAD = 60.0

var game_over: bool = false

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

func on_game_over(winning_team: String):
	if game_over:
		return
	game_over = true
	print("[MainMap] GAME OVER! %s team wins!" % winning_team.to_upper())
	
	# Pause the game tree so everything stops
	get_tree().paused = true
	
	# Create game over overlay
	var overlay = ColorRect.new()
	overlay.name = "GameOverOverlay"
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.7)
	overlay.process_mode = Node.PROCESS_MODE_ALWAYS  # Ignore pause
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 20)
	
	# Winner text
	var label = Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if winning_team == "blue":
		label.text = "🔵 BLUE TEAM WINS! 🔵"
		label.add_theme_color_override("font_color", Color(0.3, 0.5, 1.0))
	else:
		label.text = "🔴 RED TEAM WINS! 🔴"
		label.add_theme_color_override("font_color", Color(1.0, 0.3, 0.3))
	label.add_theme_font_size_override("font_size", 48)
	
	# Sub text
	var sub_label = Label.new()
	sub_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	sub_label.text = "The enemy base has been destroyed!"
	sub_label.add_theme_font_size_override("font_size", 20)
	sub_label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.8))
	
	# Back to lobby button
	var button = Button.new()
	button.text = "Back to Lobby"
	button.custom_minimum_size = Vector2(200, 50)
	button.add_theme_font_size_override("font_size", 18)
	button.pressed.connect(_on_back_to_lobby)
	button.process_mode = Node.PROCESS_MODE_ALWAYS
	
	vbox.add_child(label)
	vbox.add_child(sub_label)
	vbox.add_child(button)
	overlay.add_child(vbox)
	
	# Position the VBox in center
	vbox.position = Vector2(-200, -80)
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	
	# Add as CanvasLayer so it's always on top
	var canvas = CanvasLayer.new()
	canvas.name = "GameOverUI"
	canvas.layer = 100
	canvas.process_mode = Node.PROCESS_MODE_ALWAYS
	canvas.add_child(overlay)
	add_child(canvas)

func _on_back_to_lobby():
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/Lobby.tscn")
