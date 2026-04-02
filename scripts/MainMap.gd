extends Node2D

const BLUE_SPAWN = Vector2(400, 720)
const RED_SPAWN = Vector2(2160, 720)
const SPAWN_SPREAD = 80.0

var game_over: bool = false
var local_player: Node2D = null

# HUD references
var hud_canvas: CanvasLayer = null
var xp_bar: ProgressBar = null
var level_label: Label = null
var hp_label: Label = null

func _ready():
	# Small delay to ensure all peers have loaded the scene
	await get_tree().create_timer(0.3).timeout
	_draw_lane_paths()
	_spawn_players()
	_create_hud()

func _draw_lane_paths():
	var cobble_tex = load("res://assets/textures/cobblestone_texture.jpg")
	if not cobble_tex:
		print("[MainMap] WARNING: Could not load cobblestone texture")
		return
	
	var lanes = get_tree().get_nodes_in_group("lanes")
	for lane in lanes:
		if not lane is Path2D:
			continue
		var curve: Curve2D = lane.curve
		if not curve or curve.point_count < 2:
			continue
		
		var line = Line2D.new()
		line.name = lane.name + "_Road"
		line.z_index = -1
		line.width = 80.0
		line.texture = cobble_tex
		line.texture_mode = Line2D.LINE_TEXTURE_TILE
		line.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
		line.joint_mode = Line2D.LINE_JOINT_ROUND
		line.begin_cap_mode = Line2D.LINE_CAP_ROUND
		line.end_cap_mode = Line2D.LINE_CAP_ROUND
		line.default_color = Color(1, 1, 1, 1)
		
		# Sample points along the curve for smooth rendering
		var length = curve.get_baked_length()
		var step = 10.0  # sample every 10 pixels for smoothness
		var num_steps = int(length / step)
		for i in range(num_steps + 1):
			var offset = min(i * step, length)
			var point = curve.sample_baked(offset)
			line.add_point(point + lane.position)
		
		add_child(line)

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
			tank.rotation = PI  # Face left toward blue team
			red_index += 1
		
		tank.set_role(info["role"])
		tank.set_team(info["team"])
		add_child(tank)
		
		# Each player controls their own tank
		tank.set_multiplayer_authority(peer_id)
		
		# Track local player and attach camera
		if peer_id == multiplayer.get_unique_id():
			local_player = tank
			_attach_camera(tank)
		
		print("[MainMap] Spawned %s (ID:%d) as %s on %s team" % [info["name"], peer_id, info["role"], info["team"]])
	
	print("[MainMap] Total players spawned: %d" % NetworkManager.players.size())

func _attach_camera(tank: Node2D):
	# Remove the static scene camera
	if has_node("Camera2D"):
		$Camera2D.queue_free()
	# Add a camera as child of the player tank but top_level so it doesn't rotate
	var cam = Camera2D.new()
	cam.name = "PlayerCamera"
	cam.zoom = Vector2(1, 1)
	cam.position_smoothing_enabled = true
	cam.position_smoothing_speed = 8.0
	cam.top_level = true
	cam.make_current()
	tank.add_child(cam)

func _create_hud():
	hud_canvas = CanvasLayer.new()
	hud_canvas.name = "HUD"
	hud_canvas.layer = 10
	add_child(hud_canvas)
	
	# Bottom bar background
	var bg = ColorRect.new()
	bg.name = "HUDBg"
	bg.offset_left = 0.0
	bg.offset_top = 680.0
	bg.offset_right = 1280.0
	bg.offset_bottom = 720.0
	bg.color = Color(0.08, 0.08, 0.12, 0.85)
	hud_canvas.add_child(bg)
	
	# Level label
	level_label = Label.new()
	level_label.name = "LevelLabel"
	level_label.text = "Lv 1"
	level_label.offset_left = 20.0
	level_label.offset_top = 685.0
	level_label.offset_right = 80.0
	level_label.offset_bottom = 715.0
	level_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	level_label.add_theme_font_size_override("font_size", 18)
	level_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	hud_canvas.add_child(level_label)
	
	# XP bar background
	var xp_bg = ColorRect.new()
	xp_bg.name = "XPBg"
	xp_bg.offset_left = 90.0
	xp_bg.offset_top = 693.0
	xp_bg.offset_right = 410.0
	xp_bg.offset_bottom = 707.0
	xp_bg.color = Color(0.15, 0.15, 0.2, 1.0)
	hud_canvas.add_child(xp_bg)
	
	# XP bar fill
	xp_bar = ProgressBar.new()
	xp_bar.name = "XPBar"
	xp_bar.offset_left = 90.0
	xp_bar.offset_top = 693.0
	xp_bar.offset_right = 410.0
	xp_bar.offset_bottom = 707.0
	xp_bar.min_value = 0.0
	xp_bar.max_value = 1.0
	xp_bar.value = 0.0
	xp_bar.show_percentage = false
	hud_canvas.add_child(xp_bar)
	
	# XP label
	var xp_label = Label.new()
	xp_label.name = "XPLabel"
	xp_label.text = "XP"
	xp_label.offset_left = 415.0
	xp_label.offset_top = 688.0
	xp_label.offset_right = 445.0
	xp_label.offset_bottom = 712.0
	xp_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	xp_label.add_theme_font_size_override("font_size", 12)
	xp_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	hud_canvas.add_child(xp_label)
	
	# HP display
	hp_label = Label.new()
	hp_label.name = "HPLabel"
	hp_label.text = "HP: 200/200"
	hp_label.offset_left = 480.0
	hp_label.offset_top = 685.0
	hp_label.offset_right = 640.0
	hp_label.offset_bottom = 715.0
	hp_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hp_label.add_theme_font_size_override("font_size", 14)
	hp_label.add_theme_color_override("font_color", Color(0.4, 1.0, 0.4))
	hud_canvas.add_child(hp_label)

func _process(_delta):
	# Camera follow
	if is_instance_valid(local_player) and local_player.has_node("PlayerCamera"):
		local_player.get_node("PlayerCamera").global_position = local_player.global_position
	
	# Update HUD from local player stats
	if is_instance_valid(local_player) and is_instance_valid(level_label):
		level_label.text = "Lv %d" % local_player.level
		if is_instance_valid(xp_bar) and local_player.has_method("get_xp_progress"):
			xp_bar.value = local_player.get_xp_progress()
		if is_instance_valid(hp_label):
			hp_label.text = "HP: %d/%d" % [max(0, local_player.health), local_player.max_health]

func on_game_over(winning_team: String):
	if game_over:
		return
	game_over = true
	print("[MainMap] GAME OVER! %s team wins!" % winning_team.to_upper())
	
	# Pause the game tree so everything stops
	get_tree().paused = true
	
	# Hide HUD
	if is_instance_valid(hud_canvas):
		hud_canvas.visible = false
	
	# Create game over overlay
	var overlay = ColorRect.new()
	overlay.name = "GameOverOverlay"
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.color = Color(0, 0, 0, 0.7)
	overlay.process_mode = Node.PROCESS_MODE_ALWAYS
	
	var vbox = VBoxContainer.new()
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 20)
	
	# Winner text
	var label = Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	if winning_team == "blue":
		label.text = "BLUE TEAM WINS!"
		label.add_theme_color_override("font_color", Color(0.3, 0.5, 1.0))
	else:
		label.text = "RED TEAM WINS!"
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
	
	vbox.position = Vector2(-200, -80)
	vbox.set_anchors_preset(Control.PRESET_CENTER)
	
	var canvas = CanvasLayer.new()
	canvas.name = "GameOverUI"
	canvas.layer = 100
	canvas.process_mode = Node.PROCESS_MODE_ALWAYS
	canvas.add_child(overlay)
	add_child(canvas)

func _on_back_to_lobby():
	get_tree().paused = false
	get_tree().change_scene_to_file("res://scenes/Lobby.tscn")
