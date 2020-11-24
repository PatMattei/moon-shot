// =============================================================================
// sprites
// =============================================================================

//
// hero sprite
//
function Hero(game, x, y) {
	// call Phaser.Sprite constructor
	Phaser.Sprite.call(this, game, x, y, 'hero');
	this.anchor.set(0.5, 0.5);

	//physics
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;

	this.animations.add('stop', [4]);
	this.animations.add('run', [5, 6, 7, 8], 8, true);
	this.animations.add('jump', [8]);
	this.animations.add('fall', [4]);
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function (direction) {
	const SPEED = 200;
	this.body.velocity.x = direction * SPEED;

	if (this.body.velocity.x < 0) { //left animation
		this.scale.x = -1;
	} else if (this.body.velocity.x > 0) { //right animation
		this.scale.x = 1;
	}
}

//infinite jump:
// Hero.prototype.jump = function() {
// 	const JUMP_SPEED = 600;
// 	this.body.velocity.y = -JUMP_SPEED;
// }

Hero.prototype.jump = function () {
	const JUMP_SPEED = 600;
	let canJump = this.body.touching.down;

	if (canJump) {
		this.body.velocity.y = -JUMP_SPEED;
	}

	return canJump;
}

Hero.prototype._getAnimationName = function () {
	let name = 'stop'; //default

	if (this.body.velocity.y < 0) {
		name = 'jump';
	} else if (this.body.velocity.y >= 0 && !this.body.touching.down) {
		name = 'fall';
	} else if (this.body.velocity.x !== 0 && this.body.touching.down) {
		name = 'run';
	}

	return name;
}

Hero.prototype.update = function () {
	let animationName = this._getAnimationName();
	if (this.animations.name !== animationName) {
		this.animations.play(animationName);
	}
}

//
// enemy sprite
//
function Slime(game, x, y) {
	Phaser.Sprite.call(this, game, x, y, 'slime');

	//anchor
	this.anchor.set(0.5);
	//animation
	this.animations.add('crawl', [0, 1, 2, 3, 3, 3], 8, true);
	this.animations.add('die', [0], 12);

	this.animations.play('crawl');

	//physics
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;
	this.body.velocity.x = Slime.SPEED;
}

Slime.SPEED = 100;

Slime.prototype = Object.create(Phaser.Sprite.prototype);
Slime.prototype.constructor = Slime;
Slime.prototype.update = function () {
	//check against walls
	if (this.body.touching.right || this.body.blocked.right) {
		this.body.velocity.x = -Slime.SPEED; //turn left
	} else if (this.body.touching.left || this.body.blocked.left) {
		this.body.velocity.x = Slime.SPEED //turn right
	}

	if (this.body.velocity.x < 0) { //left animation
		this.scale.x = -1;
	} else if (this.body.velocity.x > 0) { //right animation
		this.scale.x = 1;
	}
};

Slime.prototype.die = function () {
	this.body.enable = false;

	this.animations.play('die').onComplete.addOnce(function () {
		this.kill();
	}, this);
}

//
// Crescent Sprite
//

function Crescent(game, x, y) {
	Phaser.Sprite.call(this, game, x, y, 'crescent');

	//anchor
	this.anchor.set(0.5);

	//physics
	this.game.physics.enable(this);
	this.body.collideWorldBounds = false;
	this.body.velocity.x = Crescent.SPEED;
}

Crescent.prototype = Object.create(Phaser.Sprite.prototype);
Crescent.prototype.constructor = Crescent;

Crescent.prototype.shoot = function (direction) {
	Crescent.shootDir = direction;
	if (Crescent.shootDir === 1) {
		Crescent.SPEED = 400
	} else {
		Crescent.SPEED = -400
	}
	this.body.velocity.x = Crescent.SPEED;
	if (this.body.touching.Hero) {
		this.kill();
	}
}

Crescent.prototype.update = function () {
	if (this.shootDir === 1) {
		this.body.velocity.y -= 20;
		this.body.velocity.x -= 4;
	} else {
		this.body.velocity.y -= 20;
		this.body.velocity.x += 4;
	}
	if (this.inCamera === false) {
		this.kill();
	}
}

// =============================================================================
// game states
// =============================================================================

PlayState = {};

const LEVEL_COUNT = 2;

PlayState.init = function (data) {
	this.game.renderer.renderSession.roundPixels = true;
	this.keys = this.game.input.keyboard.addKeys({
		left: Phaser.KeyCode.A,
		right: Phaser.KeyCode.D,
		up: Phaser.KeyCode.W,
		fireLeft: Phaser.KeyCode.LEFT,
		fireRight: Phaser.KeyCode.RIGHT
	});

	this.keys.up.onDown.add(function () {
		let didJump = this.hero.jump();
		if (didJump) {
			this.sfx.jump.play();
		}
	}, this);

	this.clearedLevel = false;

	this.level = (data.level || 0) % LEVEL_COUNT;
};

// load game assets here
PlayState.preload = function () {
	this.game.load.json('level:0', 'data/level00.json');
	this.game.load.json('level:1', 'data/level01.json');

	this.game.load.image('background', 'images/background.png');
	this.game.load.image('ground', 'images/ground.png');
	this.game.load.image('grass:8x1', 'images/grass_8x1.png');
	this.game.load.image('grass:6x1', 'images/grass_6x1.png');
	this.game.load.image('grass:4x1', 'images/grass_4x1.png');
	this.game.load.image('grass:2x1', 'images/grass_2x1.png');
	this.game.load.image('grass:1x1', 'images/grass_1x1.png');
	this.game.load.image('invisible-wall', 'images/invisible_wall.png');

	this.game.load.audio('sfx:jump', 'audio/jump.wav');
	this.game.load.audio('sfx:stomp', 'audio/stomp.wav');

	this.game.load.spritesheet('hero', 'images/dude.png', 32, 48);
	this.game.load.spritesheet('slime', 'images/red_slime.png', 32, 38);
	this.game.load.spritesheet('crescent', 'images/crescent.png', 14, 15)
};

// create game entities and set up world here
PlayState.create = function () {
	this.sfx = {
		jump: this.game.add.audio('sfx:jump'),
		stomp: this.game.add.audio('sfx:stomp')
	};

	// create level
	this.game.add.image(0, 0, 'background');
	this._loadLevel(this.game.cache.getJSON(`level:${this.level}`));
};

PlayState.update = function () {
	this._handleCollisions();
	this._handleInput();
}

PlayState._loadLevel = function (data) {
	// create all the groups/layers that we need
	this.bgDecoration = this.game.add.group();
	this.platforms = this.game.add.group();
	this.slimes = this.game.add.group();
	this.enemyWalls = this.game.add.group();
	this.enemyWalls.visible = false;

	// spawn all platforms
	data.platforms.forEach(this._spawnPlatform, this);
	// spawn hero and enemies
	this._spawnCharacters({
		hero: data.hero,
		slimes: data.slimes
	});

	// enable gravity
	const GRAVITY = 1200;
	this.game.physics.arcade.gravity.y = GRAVITY;

	this.enemyCount = data.slimes.length;
	this.killCount = 0;
};

PlayState._spawnPlatform = function (platform) {
	let sprite = this.platforms.create(
		platform.x, platform.y, platform.image);

	this.game.physics.enable(sprite);
	sprite.body.allowGravity = false;
	sprite.body.immovable = true;

	this._spawnEnemyWall(platform.x, platform.y, 'left');
	this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function (x, y, side) {
	let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
	sprite.anchor.set(side === 'left' ? 1 : 0, 1);

	this.game.physics.enable(sprite);
	sprite.body.immovable = true;
	sprite.body.allowGravity = false;
}

PlayState._spawnCharacters = function (data) {
	// spawn hero
	this.hero = new Hero(this.game, data.hero.x, data.hero.y);
	this.game.add.existing(this.hero);

	//spawn enemies
	data.slimes.forEach(function (slime) {
		let sprite = new Slime(this.game, slime.x, slime.y);
		this.slimes.add(sprite);
	}, this);
};

PlayState._spawnProjectiles = function(direction) {
	this.crescent = new Crescent(this.game, this.hero.x, this.hero.y);
	this.game.add.existing(this.crescent);
	this.crescent.shootDir = direction
	this.crescent.shoot(direction);
}

PlayState._handleCollisions = function () {
	this.game.physics.arcade.collide(this.slimes, this.platforms);
	this.game.physics.arcade.collide(this.slimes, this.enemyWalls);
	this.game.physics.arcade.collide(this.hero, this.platforms);
	this.game.physics.arcade.overlap(this.hero, this.slimes, this._onHeroVsEnemy, null, this);
	this.game.physics.arcade.overlap(this.crescent, this.slimes, this._onProjectileVsEnemy, null, this);
}

PlayState._handleInput = function () {
	if (this.keys.left.isDown) {
		this.hero.move(-1);
	} else if (this.keys.right.isDown) {
		this.hero.move(1);
	} else if (this.keys.fireLeft.isDown) {
		this._spawnProjectiles(-1);
	} else if (this.keys.fireRight.isDown) {
		this._spawnProjectiles(1);
	} else {	
		this.hero.move(0);
	}
}

PlayState._onHeroVsEnemy = function (hero, enemy) {
	if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
		hero.bounce()
		enemy.die();

		this.sfx.stomp.play();

		this.killCount++;
		if (this.killCount === this.enemyCount) { //level cleared
			this.game.state.restart(true, false, {
				level: this.level + 1
			});
		}
	} else {
		this.sfx.stomp.play();
		this.game.state.restart(true, false, {
			level: this.level
		});
	}
}

PlayState._onProjectileVsEnemy = function(projectile, enemy) {
	console.log('dead');
	enemy.die();

	this.sfx.stomp.play();

	this.killCount++;
	if (this.killCount === this.enemyCount) { //level cleared
		this.game.state.restart(true, false, {
			level: this.level + 1
		});
	}
}

// =============================================================================
// entry point
// =============================================================================

window.onload = function () {
	let game = new Phaser.Game(800, 600, Phaser.AUTO, 'game');
	game.state.add('play', PlayState);
	game.state.start('play', true, false, {
		level: 0
	});
};