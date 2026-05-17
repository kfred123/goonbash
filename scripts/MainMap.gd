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

# Ability HUD references
var ability_btn: Button = null
var ability_upgrade_btn: Button = null
var ability_level_label: Label = null
var ability_cooldown_overlay: ColorRect = null
var ability_cooldown_label: Label = null

var ability2_btn: Button = null
var ability2_upgrade_btn: Button = null
var ability2_level_label: Label = null
var ability2_cooldown_overlay: ColorRect = null
var ability2_cooldown_label: Label = null

var ability_points_label: Label = null

# Debug console
var debug_console_visible: bool = false
var debug_canvas: CanvasLayer = null
var debug_bg: ColorRect = null
var debug_output: RichTextLabel = null
var debug_input: LineEdit = null
var debug_history: Array[String] = []

func _ready():
	# Small delay to ensure all peers have loaded the scene
	await get_tree().create_timer(0.3).timeout
	_draw_lane_paths()
	_spawn_players()
	_create_hud()
	_create_debug_console()

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
	
	# --- Ability Bar ---
	_create_ability_bar()

func _create_ability_bar():
	if not is_instance_valid(hud_canvas):
		return
	
	# Ability section separator
	var sep = ColorRect.new()
	sep.name = "AbilitySep"
	sep.offset_left = 660.0
	sep.offset_top = 685.0
	sep.offset_right = 662.0
	sep.offset_bottom = 715.0
	sep.color = Color(0.3, 0.3, 0.4, 0.6)
	hud_canvas.add_child(sep)
	
	# "Abilities" label
	var ab_title = Label.new()
	ab_title.name = "AbilityTitle"
	ab_title.text = "ABILITIES"
	ab_title.offset_left = 675.0
	ab_title.offset_top = 684.0
	ab_title.offset_right = 770.0
	ab_title.offset_bottom = 698.0
	ab_title.add_theme_font_size_override("font_size", 9)
	ab_title.add_theme_color_override("font_color", Color(0.5, 0.5, 0.6))
	hud_canvas.add_child(ab_title)
	
	# Ability button (repair / slot 1)
	ability_btn = Button.new()
	ability_btn.name = "AbilityBtn1"
	ability_btn.text = "🔧"
	ability_btn.offset_left = 780.0
	ability_btn.offset_top = 684.0
	ability_btn.offset_right = 820.0
	ability_btn.offset_bottom = 716.0
	ability_btn.add_theme_font_size_override("font_size", 16)
	ability_btn.disabled = true
	ability_btn.pressed.connect(_on_ability_btn_pressed)
	
	# Style the button
	var btn_style = StyleBoxFlat.new()
	btn_style.bg_color = Color(0.2, 0.2, 0.25, 0.9)
	btn_style.corner_radius_top_left = 4
	btn_style.corner_radius_top_right = 4
	btn_style.corner_radius_bottom_left = 4
	btn_style.corner_radius_bottom_right = 4
	btn_style.border_width_left = 2
	btn_style.border_width_right = 2
	btn_style.border_width_top = 2
	btn_style.border_width_bottom = 2
	btn_style.border_color = Color(0.35, 0.35, 0.4)
	ability_btn.add_theme_stylebox_override("normal", btn_style)
	
	var btn_style_disabled = btn_style.duplicate()
	btn_style_disabled.bg_color = Color(0.12, 0.12, 0.15, 0.9)
	btn_style_disabled.border_color = Color(0.2, 0.2, 0.25)
	ability_btn.add_theme_stylebox_override("disabled", btn_style_disabled)
	
	var btn_style_hover = btn_style.duplicate()
	btn_style_hover.bg_color = Color(0.25, 0.35, 0.3, 0.9)
	btn_style_hover.border_color = Color(0.3, 0.8, 0.5)
	ability_btn.add_theme_stylebox_override("hover", btn_style_hover)
	
	var btn_style_pressed = btn_style.duplicate()
	btn_style_pressed.bg_color = Color(0.15, 0.5, 0.3, 0.9)
	btn_style_pressed.border_color = Color(0.2, 0.9, 0.5)
	ability_btn.add_theme_stylebox_override("pressed", btn_style_pressed)
	hud_canvas.add_child(ability_btn)
	
	# Keybind hint
	var key_hint = Label.new()
	key_hint.name = "KeyHint1"
	key_hint.text = "1"
	key_hint.offset_left = 782.0
	key_hint.offset_top = 685.0
	key_hint.offset_right = 792.0
	key_hint.offset_bottom = 695.0
	key_hint.add_theme_font_size_override("font_size", 8)
	key_hint.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8, 0.6))
	hud_canvas.add_child(key_hint)
	
	# Cooldown overlay (stretches over ability button)
	ability_cooldown_overlay = ColorRect.new()
	ability_cooldown_overlay.name = "CooldownOverlay"
	ability_cooldown_overlay.offset_left = 780.0
	ability_cooldown_overlay.offset_top = 684.0
	ability_cooldown_overlay.offset_right = 820.0
	ability_cooldown_overlay.offset_bottom = 716.0
	ability_cooldown_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
	ability_cooldown_overlay.visible = false
	ability_cooldown_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_canvas.add_child(ability_cooldown_overlay)
	
	# Cooldown time label (centered on button)
	ability_cooldown_label = Label.new()
	ability_cooldown_label.name = "CooldownLabel"
	ability_cooldown_label.text = ""
	ability_cooldown_label.offset_left = 780.0
	ability_cooldown_label.offset_top = 694.0
	ability_cooldown_label.offset_right = 820.0
	ability_cooldown_label.offset_bottom = 716.0
	ability_cooldown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ability_cooldown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ability_cooldown_label.add_theme_font_size_override("font_size", 12)
	ability_cooldown_label.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.9))
	ability_cooldown_label.visible = false
	ability_cooldown_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_canvas.add_child(ability_cooldown_label)
	
	# Ability level label (below button)
	ability_level_label = Label.new()
	ability_level_label.name = "AbilityLevelLabel"
	ability_level_label.text = "Lv0"
	ability_level_label.offset_left = 780.0
	ability_level_label.offset_top = 716.0
	ability_level_label.offset_right = 820.0
	ability_level_label.offset_bottom = 726.0
	ability_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ability_level_label.add_theme_font_size_override("font_size", 8)
	ability_level_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	ability_level_label.visible = false
	hud_canvas.add_child(ability_level_label)
	
	# Upgrade arrow button (right of ability button)
	ability_upgrade_btn = Button.new()
	ability_upgrade_btn.name = "UpgradeBtn1"
	ability_upgrade_btn.text = "▲"
	ability_upgrade_btn.offset_left = 824.0
	ability_upgrade_btn.offset_top = 688.0
	ability_upgrade_btn.offset_right = 844.0
	ability_upgrade_btn.offset_bottom = 712.0
	ability_upgrade_btn.add_theme_font_size_override("font_size", 12)
	ability_upgrade_btn.visible = false
	ability_upgrade_btn.pressed.connect(_on_ability_upgrade_pressed)
	
	var up_style = StyleBoxFlat.new()
	up_style.bg_color = Color(0.2, 0.5, 0.3, 0.9)
	up_style.corner_radius_top_left = 3
	up_style.corner_radius_top_right = 3
	up_style.corner_radius_bottom_left = 3
	up_style.corner_radius_bottom_right = 3
	up_style.border_width_left = 1
	up_style.border_width_right = 1
	up_style.border_width_top = 1
	up_style.border_width_bottom = 1
	up_style.border_color = Color(0.3, 0.9, 0.5)
	ability_upgrade_btn.add_theme_stylebox_override("normal", up_style)
	
	var up_hover = up_style.duplicate()
	up_hover.bg_color = Color(0.25, 0.6, 0.35, 0.9)
	ability_upgrade_btn.add_theme_stylebox_override("hover", up_hover)
	
	var up_pressed = up_style.duplicate()
	up_pressed.bg_color = Color(0.15, 0.7, 0.4, 0.9)
	ability_upgrade_btn.add_theme_stylebox_override("pressed", up_pressed)
	hud_canvas.add_child(ability_upgrade_btn)
	
	# --- Slot 2 (Speed for Healer) ---
	ability2_btn = Button.new()
	ability2_btn.name = "AbilityBtn2"
	ability2_btn.text = "⚡"
	ability2_btn.offset_left = 850.0
	ability2_btn.offset_top = 684.0
	ability2_btn.offset_right = 890.0
	ability2_btn.offset_bottom = 716.0
	ability2_btn.add_theme_font_size_override("font_size", 16)
	ability2_btn.disabled = true
	ability2_btn.pressed.connect(_on_ability2_btn_pressed)
	ability2_btn.add_theme_stylebox_override("normal", btn_style)
	ability2_btn.add_theme_stylebox_override("disabled", btn_style_disabled)
	ability2_btn.add_theme_stylebox_override("hover", btn_style_hover)
	ability2_btn.add_theme_stylebox_override("pressed", btn_style_pressed)
	hud_canvas.add_child(ability2_btn)
	
	var key_hint2 = Label.new()
	key_hint2.name = "KeyHint2"
	key_hint2.text = "2"
	key_hint2.offset_left = 852.0
	key_hint2.offset_top = 685.0
	key_hint2.offset_right = 862.0
	key_hint2.offset_bottom = 695.0
	key_hint2.add_theme_font_size_override("font_size", 8)
	key_hint2.add_theme_color_override("font_color", Color(0.7, 0.7, 0.8, 0.6))
	hud_canvas.add_child(key_hint2)
	
	ability2_cooldown_overlay = ColorRect.new()
	ability2_cooldown_overlay.name = "CooldownOverlay2"
	ability2_cooldown_overlay.offset_left = 850.0
	ability2_cooldown_overlay.offset_top = 684.0
	ability2_cooldown_overlay.offset_right = 890.0
	ability2_cooldown_overlay.offset_bottom = 716.0
	ability2_cooldown_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
	ability2_cooldown_overlay.visible = false
	ability2_cooldown_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_canvas.add_child(ability2_cooldown_overlay)
	
	ability2_cooldown_label = Label.new()
	ability2_cooldown_label.name = "CooldownLabel2"
	ability2_cooldown_label.text = ""
	ability2_cooldown_label.offset_left = 850.0
	ability2_cooldown_label.offset_top = 694.0
	ability2_cooldown_label.offset_right = 890.0
	ability2_cooldown_label.offset_bottom = 716.0
	ability2_cooldown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ability2_cooldown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ability2_cooldown_label.add_theme_font_size_override("font_size", 12)
	ability2_cooldown_label.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0, 0.9))
	ability2_cooldown_label.visible = false
	ability2_cooldown_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	hud_canvas.add_child(ability2_cooldown_label)
	
	ability2_level_label = Label.new()
	ability2_level_label.name = "AbilityLevelLabel2"
	ability2_level_label.text = "Lv0"
	ability2_level_label.offset_left = 850.0
	ability2_level_label.offset_top = 716.0
	ability2_level_label.offset_right = 890.0
	ability2_level_label.offset_bottom = 726.0
	ability2_level_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ability2_level_label.add_theme_font_size_override("font_size", 8)
	ability2_level_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.7))
	ability2_level_label.visible = false
	hud_canvas.add_child(ability2_level_label)
	
	ability2_upgrade_btn = Button.new()
	ability2_upgrade_btn.name = "UpgradeBtn2"
	ability2_upgrade_btn.text = "▲"
	ability2_upgrade_btn.offset_left = 894.0
	ability2_upgrade_btn.offset_top = 688.0
	ability2_upgrade_btn.offset_right = 914.0
	ability2_upgrade_btn.offset_bottom = 712.0
	ability2_upgrade_btn.add_theme_font_size_override("font_size", 12)
	ability2_upgrade_btn.visible = false
	ability2_upgrade_btn.pressed.connect(_on_ability2_upgrade_pressed)
	ability2_upgrade_btn.add_theme_stylebox_override("normal", up_style)
	ability2_upgrade_btn.add_theme_stylebox_override("hover", up_hover)
	ability2_upgrade_btn.add_theme_stylebox_override("pressed", up_pressed)
	hud_canvas.add_child(ability2_upgrade_btn)
	
	# Ability points display
	ability_points_label = Label.new()
	ability_points_label.name = "AbilityPointsLabel"
	ability_points_label.text = ""
	ability_points_label.offset_left = 925.0
	ability_points_label.offset_top = 688.0
	ability_points_label.offset_right = 1030.0
	ability_points_label.offset_bottom = 712.0
	ability_points_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ability_points_label.add_theme_font_size_override("font_size", 10)
	ability_points_label.add_theme_color_override("font_color", Color(1.0, 0.85, 0.3))
	ability_points_label.visible = false
	hud_canvas.add_child(ability_points_label)

func _on_ability_btn_pressed():
	if not is_instance_valid(local_player):
		return
	if local_player.role == "healer" and local_player.has_method("_try_activate_repair"):
		local_player._try_activate_repair()
	elif local_player.role == "tank" and local_player.has_method("_try_activate_shield"):
		local_player._try_activate_shield()

func _on_ability2_btn_pressed():
	if not is_instance_valid(local_player):
		return
	if local_player.role == "healer" and local_player.has_method("_try_activate_speed"):
		local_player._try_activate_speed()

func _on_ability_upgrade_pressed():
	if not is_instance_valid(local_player):
		return
	if local_player.role == "healer" and local_player.has_method("upgrade_repair"):
		local_player.upgrade_repair()
	elif local_player.role == "tank" and local_player.has_method("upgrade_shield"):
		local_player.upgrade_shield()

func _on_ability2_upgrade_pressed():
	if not is_instance_valid(local_player):
		return
	if local_player.role == "healer" and local_player.has_method("upgrade_speed"):
		local_player.upgrade_speed()

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
	
	# Update ability HUD
	_update_ability_hud()

func _unhandled_input(event):
	if event is InputEventKey and event.pressed and not event.echo:
		# ^ key (circumflex / dead circumflex) to toggle debug console
		if event.keycode == KEY_ASCIICIRCUM or event.keycode == KEY_QUOTELEFT or event.physical_keycode == KEY_ASCIICIRCUM:
			_toggle_debug_console()
			get_viewport().set_input_as_handled()

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

# --- Debug Console ---

func _create_debug_console():
	debug_canvas = CanvasLayer.new()
	debug_canvas.name = "DebugConsole"
	debug_canvas.layer = 50
	debug_canvas.visible = false
	add_child(debug_canvas)
	
	# Semi-transparent background covering top half
	debug_bg = ColorRect.new()
	debug_bg.name = "DebugBg"
	debug_bg.offset_left = 0.0
	debug_bg.offset_top = 0.0
	debug_bg.offset_right = 1280.0
	debug_bg.offset_bottom = 300.0
	debug_bg.color = Color(0.05, 0.05, 0.1, 0.9)
	debug_canvas.add_child(debug_bg)
	
	# Output area
	debug_output = RichTextLabel.new()
	debug_output.name = "DebugOutput"
	debug_output.offset_left = 10.0
	debug_output.offset_top = 10.0
	debug_output.offset_right = 1270.0
	debug_output.offset_bottom = 260.0
	debug_output.bbcode_enabled = true
	debug_output.scroll_following = true
	debug_output.add_theme_font_size_override("normal_font_size", 13)
	debug_output.add_theme_color_override("default_color", Color(0.7, 0.9, 0.7))
	debug_canvas.add_child(debug_output)
	
	# Separator line
	var sep = ColorRect.new()
	sep.offset_left = 0.0
	sep.offset_top = 265.0
	sep.offset_right = 1280.0
	sep.offset_bottom = 267.0
	sep.color = Color(0.3, 0.8, 0.4, 0.6)
	debug_canvas.add_child(sep)
	
	# Input field
	debug_input = LineEdit.new()
	debug_input.name = "DebugInput"
	debug_input.offset_left = 10.0
	debug_input.offset_top = 270.0
	debug_input.offset_right = 1270.0
	debug_input.offset_bottom = 295.0
	debug_input.placeholder_text = "Enter command..."
	debug_input.add_theme_font_size_override("font_size", 14)
	debug_input.add_theme_color_override("font_color", Color(1.0, 1.0, 1.0))
	debug_input.add_theme_color_override("font_placeholder_color", Color(0.5, 0.5, 0.6))
	
	var input_style = StyleBoxFlat.new()
	input_style.bg_color = Color(0.08, 0.08, 0.12, 0.95)
	input_style.border_width_bottom = 0
	input_style.border_width_top = 0
	input_style.border_width_left = 0
	input_style.border_width_right = 0
	debug_input.add_theme_stylebox_override("normal", input_style)
	
	debug_input.text_submitted.connect(_on_debug_command_submitted)
	debug_canvas.add_child(debug_input)
	
	# Print welcome message
	_debug_print("[color=yellow]Debug Console[/color] — Type [color=cyan]help[/color] for available commands.")

func _toggle_debug_console():
	debug_console_visible = not debug_console_visible
	if is_instance_valid(debug_canvas):
		debug_canvas.visible = debug_console_visible
	if debug_console_visible and is_instance_valid(debug_input):
		debug_input.grab_focus()
		debug_input.clear()

func _debug_print(text: String):
	if is_instance_valid(debug_output):
		debug_output.append_text(text + "\n")

func _on_debug_command_submitted(command: String):
	if command.strip_edges().is_empty():
		return
	
	debug_history.append(command)
	_debug_print("[color=gray]> %s[/color]" % command)
	
	# Parse command
	var parts = command.strip_edges().split(" ", false)
	var cmd = parts[0].to_lower()
	
	match cmd:
		"xp":
			_cmd_xp(parts)
		"help":
			_cmd_help()
		_:
			_debug_print("[color=red]Unknown command: %s[/color]" % cmd)
	
	# Clear input
	if is_instance_valid(debug_input):
		debug_input.clear()
		debug_input.grab_focus()

func _cmd_help():
	_debug_print("[color=yellow]Available commands:[/color]")
	_debug_print("  [color=cyan]xp <amount>[/color] — Add experience points to local player")
	_debug_print("  [color=cyan]help[/color] — Show this help message")

func _cmd_xp(parts: Array):
	if parts.size() < 2:
		_debug_print("[color=red]Usage: xp <amount>[/color]")
		return
	if not parts[1].is_valid_float():
		_debug_print("[color=red]Invalid number: %s[/color]" % parts[1])
		return
	if not is_instance_valid(local_player):
		_debug_print("[color=red]No local player found.[/color]")
		return
	var amount = parts[1].to_float()
	local_player.gain_experience(amount)
	_debug_print("[color=green]Granted %.0f XP. Level: %d, Total XP: %.0f[/color]" % [amount, local_player.level, local_player.experience])

func _update_ability_hud():
	if not is_instance_valid(local_player) or not is_instance_valid(ability_btn):
		return
	
	var player_role = local_player.role
	var is_healer = player_role == "healer"
	var is_tank = player_role == "tank"
	
	# Determine ability state based on role
	var unlocked: bool = false
	var on_cooldown: bool = false
	var is_active: bool = false
	var ability_level: int = 0
	var max_level: int = 0
	var cooldown_timer: float = 0.0
	var cooldown_max: float = 0.0
	var active_timer: float = 0.0
	var icon: String = ""
	
	if is_healer:
		unlocked = local_player.repair_unlocked
		on_cooldown = local_player.repair_cooldown_timer > 0 and not local_player.repair_active
		is_active = local_player.repair_active
		ability_level = local_player.repair_level
		max_level = local_player.REPAIR_MAX_LEVEL
		cooldown_timer = local_player.repair_cooldown_timer
		cooldown_max = local_player.REPAIR_COOLDOWN
		active_timer = local_player.repair_timer
		icon = "🔧"
	elif is_tank:
		unlocked = local_player.shield_unlocked
		on_cooldown = local_player.shield_cooldown_timer > 0 and not local_player.shield_active
		is_active = local_player.shield_active
		ability_level = local_player.shield_level
		max_level = local_player.SHIELD_MAX_LEVEL
		cooldown_timer = local_player.shield_cooldown_timer
		cooldown_max = local_player.SHIELD_COOLDOWN
		active_timer = local_player.shield_timer
		icon = "🛡️"
	else:
		# Unknown role — hide everything
		ability_btn.visible = false
		if is_instance_valid(ability_upgrade_btn):
			ability_upgrade_btn.visible = false
		if is_instance_valid(ability_level_label):
			ability_level_label.visible = false
		if is_instance_valid(ability_cooldown_overlay):
			ability_cooldown_overlay.visible = false
		if is_instance_valid(ability_cooldown_label):
			ability_cooldown_label.visible = false
		if is_instance_valid(ability_points_label):
			ability_points_label.visible = false
		if is_instance_valid(ability2_btn):
			ability2_btn.visible = false
			ability2_upgrade_btn.visible = false
			ability2_level_label.visible = false
			ability2_cooldown_overlay.visible = false
			ability2_cooldown_label.visible = false
		return
	
	ability_btn.visible = true
	ability_btn.text = icon
	
	# Active color per role
	var active_color: Color
	if is_tank:
		active_color = Color(0.3, 0.6, 1.0, 1.0)  # Blue glow for shield
	else:
		active_color = Color(0.3, 1.0, 0.5, 1.0)  # Green glow for repair
	
	# Button 1 enabled state
	if not unlocked:
		ability_btn.disabled = true
		ability_btn.modulate = Color(0.4, 0.4, 0.4, 0.7)
	elif is_active:
		ability_btn.disabled = true
		ability_btn.modulate = active_color
	elif on_cooldown:
		ability_btn.disabled = true
		ability_btn.modulate = Color(0.6, 0.6, 0.6, 0.8)
	else:
		ability_btn.disabled = false
		ability_btn.modulate = Color(1.0, 1.0, 1.0, 1.0)
	
	# Cooldown overlay for slot 1
	if is_instance_valid(ability_cooldown_overlay) and is_instance_valid(ability_cooldown_label):
		if on_cooldown:
			ability_cooldown_overlay.visible = true
			ability_cooldown_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
			ability_cooldown_label.visible = true
			var cd = ceil(cooldown_timer)
			ability_cooldown_label.text = "%ds" % cd
			# Shrink overlay from top as cooldown progresses
			var cd_ratio = cooldown_timer / cooldown_max
			ability_cooldown_overlay.offset_top = 684.0 + (1.0 - cd_ratio) * 32.0
		elif is_active:
			ability_cooldown_overlay.visible = true
			if is_tank:
				ability_cooldown_overlay.color = Color(0.1, 0.3, 0.6, 0.3)
			else:
				ability_cooldown_overlay.color = Color(0.1, 0.6, 0.3, 0.3)
			ability_cooldown_label.visible = true
			var remaining = ceil(active_timer)
			ability_cooldown_label.text = "%ds" % remaining
			ability_cooldown_overlay.offset_top = 684.0
		else:
			ability_cooldown_overlay.visible = false
			ability_cooldown_label.visible = false
	
	# Ability 1 level label
	if is_instance_valid(ability_level_label):
		ability_level_label.visible = true
		if unlocked:
			ability_level_label.text = "Lv%d" % ability_level
		else:
			ability_level_label.text = "Locked"
	
	# Upgrade arrow 1
	if is_instance_valid(ability_upgrade_btn):
		var can_upgrade = local_player.ability_points > 0 and ability_level < max_level
		ability_upgrade_btn.visible = can_upgrade
	
	# --- Slot 2 (Speed skill for Healer only) ---
	if is_instance_valid(ability2_btn):
		if is_healer:
			ability2_btn.visible = true
			ability2_btn.text = "⚡"
			var s_unlocked = local_player.speed_unlocked
			var s_on_cooldown = local_player.speed_cooldown_timer > 0 and not local_player.speed_active
			var s_active = local_player.speed_active
			var s_level = local_player.speed_level
			var s_max_level = local_player.SPEED_MAX_LEVEL
			
			if not s_unlocked:
				ability2_btn.disabled = true
				ability2_btn.modulate = Color(0.4, 0.4, 0.4, 0.7)
			elif s_active:
				ability2_btn.disabled = true
				ability2_btn.modulate = Color(1.0, 1.0, 0.3, 1.0) # Yellow glow for speed
			elif s_on_cooldown:
				ability2_btn.disabled = true
				ability2_btn.modulate = Color(0.6, 0.6, 0.6, 0.8)
			else:
				ability2_btn.disabled = false
				ability2_btn.modulate = Color(1.0, 1.0, 1.0, 1.0)
				
			# Slot 2 Cooldown
			if s_on_cooldown:
				ability2_cooldown_overlay.visible = true
				ability2_cooldown_overlay.color = Color(0.0, 0.0, 0.0, 0.5)
				ability2_cooldown_label.visible = true
				var s_cd = ceil(local_player.speed_cooldown_timer)
				ability2_cooldown_label.text = "%ds" % s_cd
				var s_cd_ratio = local_player.speed_cooldown_timer / local_player.SPEED_COOLDOWN
				ability2_cooldown_overlay.offset_top = 684.0 + (1.0 - s_cd_ratio) * 32.0
			elif s_active:
				ability2_cooldown_overlay.visible = true
				ability2_cooldown_overlay.color = Color(0.6, 0.6, 0.1, 0.3)
				ability2_cooldown_label.visible = true
				var s_rem = ceil(local_player.speed_timer)
				ability2_cooldown_label.text = "%ds" % s_rem
				ability2_cooldown_overlay.offset_top = 684.0
			else:
				ability2_cooldown_overlay.visible = false
				ability2_cooldown_label.visible = false
			
			ability2_level_label.visible = true
			if s_unlocked:
				ability2_level_label.text = "Lv%d" % s_level
			else:
				ability2_level_label.text = "Locked"
			
			var can_upg2 = local_player.ability_points > 0 and s_level < s_max_level
			ability2_upgrade_btn.visible = can_upg2
		else:
			# Hide slot 2 for Tank
			ability2_btn.visible = false
			ability2_upgrade_btn.visible = false
			ability2_level_label.visible = false
			ability2_cooldown_overlay.visible = false
			ability2_cooldown_label.visible = false

	# Ability points label
	if is_instance_valid(ability_points_label):
		if local_player.ability_points > 0:
			ability_points_label.visible = true
			ability_points_label.text = "%d pts" % local_player.ability_points
		else:
			ability_points_label.visible = false
