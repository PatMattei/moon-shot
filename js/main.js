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
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;

	this.animations.add('stop', [4]);
	this.animations.add('run', [5,6,7,8], 8, true);
	this.animations.add('jump', [8]);
	this.animations.add('fall', [4]);
}

// inherit from Phaser.Sprite
Hero.prototype = Object.create(Phaser.Sprite.prototype);
Hero.prototype.constructor = Hero;

Hero.prototype.move = function(direction) {
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

Hero.prototype.jump = function() {
	const JUMP_SPEED = 600;
	let canJump = this.body.touching.down;

    if (canJump) {
        this.body.velocity.y = -JUMP_SPEED;
    }

    return canJump;
}

Hero.prototype.bounce = function() {
	const BOUNCE_SPEED = 200;
	this.body.velocity.y = -BOUNCE_SPEED;
}

Hero.prototype._getAnimationName = function() {
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

Hero.prototype.update = function() {
	let animationName = this._getAnimationName();
	if (this.animations.name !== animationName) {
		this.animations.play(animationName);
	}
}

//
// enemy sprite
//
function Spider(game, x, y) {
	Phaser.Sprite.call(this, game, x, y, 'spider');

	//anchor
	this.anchor.set(0.5);
	//animation
	this.animations.add('crawl', [0, 1, 2], 8, true);
	this.animations.add('die', [0, 4, 0, 4, 0, 4, 3, 3, 3, 3, 3, 3], 12);
	this.animations.play('crawl');

	//physics
	this.game.physics.enable(this);
	this.body.collideWorldBounds = true;
	this.body.velocity.x = Spider.SPEED;
}

Spider.SPEED = 100;

Spider.prototype = Object.create(Phaser.Sprite.prototype);
Spider.prototype.constructor = Spider;
Spider.prototype.update = function() {
	//check against walls
	if (this.body.touching.right || this.body.blocked.right) {
		this.body.velocity.x = -Spider.SPEED; //turn left
	} else if (this.body.touching.left || this.body.blocked.left) {
		this.body.velocity.x = Spider.SPEED //turn right
	}
};

Spider.prototype.die = function() {
	this.body.enable = false;

	this.animations.play('die').onComplete.addOnce(function() {
		this.kill();
	}, this);
}

// =============================================================================
// game states
// =============================================================================

PlayState = {};

PlayState.init = function() {
	this.game.renderer.renderSession.roundPixels = true;
    this.keys = this.game.input.keyboard.addKeys({
        left: Phaser.KeyCode.LEFT,
		right: Phaser.KeyCode.RIGHT,
		up: Phaser.KeyCode.UP
	});
	
	this.keys.up.onDown.add(function(){
		let didJump = this.hero.jump();
		if (didJump) {
			this.sfx.jump.play();
		}
	}, this);
};

// load game assets here
PlayState.preload = function() {
	this.game.load.image('background', 'images/background.png');
	this.game.load.json('level:1', 'data/level01.json');
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
	this.game.load.spritesheet('spider', 'images/spider.png', 42, 32);
};

// create game entities and set up world here
PlayState.create = function() {
	this.sfx = {
		jump: this.game.add.audio('sfx:jump'),
		stomp: this.game.add.audio('sfx:stomp')
	};

	this.game.add.image(0, 0, 'background');
	this._loadLevel(this.game.cache.getJSON('level:1'));
};


PlayState.update = function() {
	this._handleCollisions();
	this._handleInput();
}


PlayState._loadLevel = function (data) {
	// create all the groups/layers that we need
	this.bgDecoration = this.game.add.group();
	this.platforms = this.game.add.group();
    this.spiders = this.game.add.group();
    this.enemyWalls = this.game.add.group();
    this.enemyWalls.visible = false;

    // spawn all platforms
    data.platforms.forEach(this._spawnPlatform, this);
    // spawn hero and enemies
    this._spawnCharacters({hero: data.hero, spiders: data.spiders});

    // enable gravity
    const GRAVITY = 1200;
    this.game.physics.arcade.gravity.y = GRAVITY;
};


PlayState._spawnPlatform = function(platform) {
    let sprite = this.platforms.create(
		platform.x, platform.y, platform.image);

	this.game.physics.enable(sprite);
	sprite.body.allowGravity = false;
	sprite.body.immovable = true;

	this._spawnEnemyWall(platform.x, platform.y, 'left');
	this._spawnEnemyWall(platform.x + sprite.width, platform.y, 'right');
};

PlayState._spawnEnemyWall = function(x, y, side) {
    let sprite = this.enemyWalls.create(x, y, 'invisible-wall');
	sprite.anchor.set(side === 'left' ? 1 : 0, 1);

	this.game.physics.enable(sprite);
	sprite.body.immovable = true;
	sprite.body.allowGravity = false;
}

PlayState._spawnCharacters = function(data) {
    // spawn hero
    this.hero = new Hero(this.game, data.hero.x, data.hero.y);
	this.game.add.existing(this.hero);
	
	//spawn enemies
	data.spiders.forEach(function(spider) {
		let sprite = new Spider(this.game, spider.x, spider.y);
		this.spiders.add(sprite);
	}, this);
};

PlayState._handleCollisions = function() {
	this.game.physics.arcade.collide(this.spiders, this.platforms);
	this.game.physics.arcade.collide(this.spiders, this.enemyWalls);
	this.game.physics.arcade.collide(this.hero, this.platforms);
	this.game.physics.arcade.overlap(this.hero, this.spiders, this._onHeroVsEnemy, null, this);
}

PlayState._handleInput = function() {
	if (this.keys.left.isDown) {
		this.hero.move(-1);
	} else if (this.keys.right.isDown) {
		this.hero.move(1);
	} else {
		this.hero.move(0);
	}
}

PlayState._onHeroVsEnemy = function(hero, enemy) {
	if (hero.body.velocity.y > 0) { // kill enemies when hero is falling
		hero.bounce()
		
		enemy.die();
		this.sfx.stomp.play();
	} else {
		this.sfx.stomp.play();
		this.game.state.restart();
	}
}

// =============================================================================
// entry point
// =============================================================================

window.onload = function() {
    let game = new Phaser.Game(800, 600, Phaser.AUTO, 'game');
    game.state.add('play', PlayState);
    game.state.start('play');
};