extends Node

# Use lazy loading to avoid parser errors and circular dependencies
var minion_scene: PackedScene
var bullet_scene: PackedScene

func _ready():
	_load_resources()

func _load_resources():
	if not minion_scene:
		minion_scene = ResourceLoader.load("res://scenes/Minion.tscn")
	if not bullet_scene:
		bullet_scene = ResourceLoader.load("res://scenes/Bullet.tscn")
	
	if minion_scene:
		print("[ResourceManager] Minion scene loaded.")
	else:
		print("[ResourceManager] ERROR: Failed to load Minion scene.")
		
	if bullet_scene:
		print("[ResourceManager] Bullet scene loaded.")
	else:
		print("[ResourceManager] ERROR: Failed to load Bullet scene.")
